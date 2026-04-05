"""
Pipeline Orchestrator — end-to-end coordinator for the data extraction pipeline.

Sequence:
1. Load files (file_loader)
2. Detect content types (file_type_detector)
3. Parallel extraction (text, tables, charts, images)
4. SHOW extracted content (summaries, text previews, chart data)
5. Validate tables (Gemini → SQL vs Non-SQL)
6. Transform (charts → tables, schema inference)
7. Generate embeddings (HuggingFace / OpenAI)
8. Store: SQL tables → PostgreSQL, Unstructured → MongoDB, Vectors → ChromaDB
"""
import asyncio
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

from config.settings import settings
from utils.logger import get_logger
from utils.parallel import run_parallel

# Ingestion
from ingestion.file_loader import load, LoadedFile
from ingestion.file_type_detector import detect_content, ContentProfile

# Extraction
from extraction.text_extractor import extract_text
from extraction.table_extractor import extract_tables
from extraction.image_extractor import extract_images
from extraction.chart_extractor import extract_charts

# Validation
from validation.gemini_table_validator import classify_table
from validation.non_sql_validator import validate_non_sql_table

# Transformation
from transformation.chart2table import chart_to_table
from transformation.schema_extractor import infer_schema

# Embeddings
from embeddings.embedding_generator import generate_embeddings

# Storage
from storage.postgres_handler import postgres_handler
from storage.chroma_handler import chroma_handler
from storage.mongo_handler import mongo_handler

# Metadata
from metadata.structure_extractor import extract_page_structures
from metadata.relationship_mapper import map_relationships

log = get_logger(__name__)

# ──────────────────────────────────────────────────────────
# Console display helpers
# ──────────────────────────────────────────────────────────

def _show_text_preview(text_result: Dict[str, Any]) -> None:
    """Display extracted text preview."""
    full_text = text_result.get("full_text", "")
    if not full_text:
        return
    pages = text_result.get("pages", [])
    print("\n" + "─" * 60)
    print("📝 EXTRACTED TEXT")
    print("─" * 60)
    print(f"  Total characters: {len(full_text):,}")
    print(f"  Pages: {len(pages)}")
    preview = full_text[:500].replace("\n", "\n  ")
    print(f"  Preview:\n  {preview}")
    if len(full_text) > 500:
        print(f"  ... ({len(full_text) - 500:,} more chars)")
    print("─" * 60)


def _show_tables(tables: list) -> None:
    """Display extracted tables."""
    if not tables:
        return
    print("\n" + "─" * 60)
    print(f"📊 EXTRACTED TABLES ({len(tables)})")
    print("─" * 60)
    for table in tables:
        print(f"\n  Table: {table.table_id}")
        print(f"  Size: {table.row_count} rows × {table.col_count} cols")
        print(f"  Headers: {', '.join(table.headers[:8])}")
        # Show first 3 rows
        preview = table.dataframe.head(3).to_string(index=False)
        for line in preview.split("\n"):
            print(f"    {line}")
        if table.row_count > 3:
            print(f"    ... ({table.row_count - 3} more rows)")
    print("─" * 60)


def _show_image_summaries(images: list) -> None:
    """Display Gemini-generated image summaries."""
    if not images:
        return
    print("\n" + "─" * 60)
    print(f"🖼️  IMAGE SUMMARIES ({len(images)})")
    print("─" * 60)
    for img in images:
        print(f"\n  Image: {img.image_id}")
        print(f"  Size: {img.width}×{img.height} | Type: {img.mime_type}")
        if img.summary and not img.summary.startswith("["):
            # Show first 300 chars of summary
            summary_preview = img.summary[:300].replace("\n", "\n    ")
            print(f"  Summary:\n    {summary_preview}")
            if len(img.summary) > 300:
                print(f"    ... ({len(img.summary) - 300} more chars)")
        else:
            print(f"  Summary: {img.summary}")
    print("─" * 60)


def _show_chart_results(chart_id: str, chart_type: str, chart_df) -> None:
    """Display chart-to-table conversion results."""
    print(f"\n  📈 Chart → Table Conversion: {chart_id}")
    print(f"     Type: {chart_type}")
    if chart_df is not None:
        print(f"     Extracted {len(chart_df)} data points:")
        preview = chart_df.head(5).to_string(index=False)
        for line in preview.split("\n"):
            print(f"       {line}")
        if len(chart_df) > 5:
            print(f"       ... ({len(chart_df) - 5} more rows)")
    else:
        print("     ⚠ Could not convert chart to table")


def _show_validation_result(table_id: str, classification) -> None:
    """Display table validation result."""
    status = "✅ SQL" if classification.is_sql else "⚠️  Non-SQL"
    print(f"\n  🔍 Validation: {table_id} → {status}")
    print(f"     Confidence: {classification.confidence:.0%}")
    print(f"     Reasoning: {classification.reasoning[:150]}")
    if classification.is_sql and classification.suggested_table_name:
        print(f"     SQL Table Name: {classification.suggested_table_name}")
        if classification.column_types:
            types = ", ".join(f"{k}={v}" for k, v in list(classification.column_types.items())[:5])
            print(f"     Column Types: {types}")


def _show_embedding_summary(embed_ids: List[str]) -> None:
    """Show what's about to be embedded."""
    if not embed_ids:
        return
    print("\n" + "─" * 60)
    print(f"🧮 EMBEDDING {len(embed_ids)} ITEMS")
    print("─" * 60)
    for eid in embed_ids:
        print(f"  → {eid}")
    print("─" * 60)


def _show_storage_summary(result) -> None:
    """Display final storage summary."""
    print("\n" + "═" * 60)
    print("💾 STORAGE SUMMARY")
    print("═" * 60)
    print(f"  PostgreSQL (Structured):   {result.postgres_rows} rows inserted")
    print(f"  ChromaDB   (Vectors):      {result.embeddings_stored} embeddings")
    print(f"  MongoDB    (Metadata):     doc_id={result.mongo_doc_id[:12] if result.mongo_doc_id else 'N/A'}...")
    print(f"  Relationships:             {result.relationships_stored}")
    print("═" * 60)


# ──────────────────────────────────────────────────────────
# Pipeline
# ──────────────────────────────────────────────────────────

@dataclass
class PipelineResult:
    """Final result of the extraction pipeline for a single file."""
    file_path: str
    file_type: str
    status: str = "success"
    duration_seconds: float = 0.0

    tables_extracted: int = 0
    tables_sql: int = 0
    tables_non_sql: int = 0
    charts_extracted: int = 0
    images_extracted: int = 0
    text_chars: int = 0

    embeddings_stored: int = 0
    postgres_rows: int = 0
    mongo_doc_id: str = ""
    relationships_stored: int = 0

    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "file_type": self.file_type,
            "status": self.status,
            "duration_seconds": round(self.duration_seconds, 2),
            "tables_extracted": self.tables_extracted,
            "tables_sql": self.tables_sql,
            "tables_non_sql": self.tables_non_sql,
            "charts_extracted": self.charts_extracted,
            "images_extracted": self.images_extracted,
            "text_chars": self.text_chars,
            "embeddings_stored": self.embeddings_stored,
            "postgres_rows": self.postgres_rows,
            "mongo_doc_id": self.mongo_doc_id,
            "relationships_stored": self.relationships_stored,
            "errors": self.errors,
        }


async def run_pipeline(input_path: str) -> List[PipelineResult]:
    """Run the full extraction pipeline on an input file or directory."""
    log.info(f"[bold cyan]═══ Starting Data Extraction Pipeline ═══[/]")
    log.info(f"Input: {input_path}")

    files = load(input_path)
    log.info(f"Loaded [bold]{len(files)}[/] file(s)")

    results = []
    for loaded_file in files:
        result = await _process_file(loaded_file)
        results.append(result)

    # Final summary
    print("\n" + "═" * 60)
    print("📊 PIPELINE COMPLETE — ALL FILES")
    print("═" * 60)
    for r in results:
        status_icon = "✅" if r.status == "success" else "❌"
        print(f"  {status_icon} {r.file_path}")
        print(f"     tables={r.tables_extracted} charts={r.charts_extracted} "
              f"images={r.images_extracted} text={r.text_chars} chars")
        print(f"     embeddings={r.embeddings_stored} | PG rows={r.postgres_rows} | {r.duration_seconds:.1f}s")
        if r.errors:
            for err in r.errors:
                print(f"     ⚠ {err}")
    print("═" * 60)

    return results


async def _process_file(loaded_file: LoadedFile) -> PipelineResult:
    """Process a single file through the full pipeline."""
    start = time.time()
    result = PipelineResult(file_path=str(loaded_file.path), file_type=loaded_file.extension)

    print(f"\n{'='*60}")
    print(f"📄 PROCESSING: {loaded_file.filename} ({loaded_file.size_bytes:,} bytes)")
    print(f"{'='*60}")

    try:
        # ── Step 1: Detect content types ──
        profile = detect_content(loaded_file)

        # ── Step 2: Parallel extraction ──
        extraction_tasks = {}
        if profile.has_text:
            extraction_tasks["text"] = lambda: extract_text(profile)
        if profile.has_tables:
            extraction_tasks["tables"] = lambda: extract_tables(profile)
        if profile.has_images:
            extraction_tasks["images"] = lambda: extract_images(profile)
        if profile.has_charts:
            extraction_tasks["charts"] = lambda: extract_charts(profile)

        extraction_results = await run_parallel(extraction_tasks)

        # Safely unpack
        text_result = extraction_results.get("text", {})
        tables = extraction_results.get("tables", [])
        images = extraction_results.get("images", [])
        charts = extraction_results.get("charts", [])

        # Handle errors from parallel execution
        if isinstance(text_result, Exception):
            result.errors.append(f"Text extraction: {text_result}")
            text_result = {}
        if isinstance(tables, Exception):
            result.errors.append(f"Table extraction: {tables}")
            tables = []
        if isinstance(images, Exception):
            result.errors.append(f"Image extraction: {images}")
            images = []
        if isinstance(charts, Exception):
            result.errors.append(f"Chart extraction: {charts}")
            charts = []

        result.text_chars = len(text_result.get("full_text", ""))
        result.tables_extracted = len(tables)
        result.images_extracted = len(images)
        result.charts_extracted = len(charts)

        # ── Step 3: SHOW extracted content ──
        if text_result:
            _show_text_preview(text_result)
        if tables:
            _show_tables(tables)
        if images:
            _show_image_summaries(images)

        # Collect items for embedding
        embed_ids = []
        embed_texts = []
        embed_metadatas = []

        # Data to store in MongoDB (unstructured content)
        unstructured_content = []

        # ── Step 4: Validate tables → SQL or Non-SQL ──
        if tables:
            print("\n" + "─" * 60)
            print("🔍 TABLE VALIDATION (Gemini LLM)")
            print("─" * 60)

        for table in tables:
            classification = classify_table(table)
            _show_validation_result(table.table_id, classification)

            if classification.is_sql:
                result.tables_sql += 1

                # Infer schema → store in PostgreSQL
                schema = infer_schema(table, classification)
                print(f"     📦 Storing in PostgreSQL: {schema['table_name']}")
                pg_result = postgres_handler.store_table(table, schema)
                result.postgres_rows += pg_result.get("rows_inserted", 0)
                print(f"     ✅ Inserted {pg_result.get('rows_inserted', 0)} rows")

                # Also embed schema for vector search
                schema_text = (
                    f"Table: {schema['table_name']}\n"
                    f"Columns: {', '.join(h for h, _ in schema['columns'])}\n"
                    f"{table.raw_text[:2000]}"
                )
                embed_ids.append(f"table_sql_{table.table_id}")
                embed_texts.append(schema_text)
                embed_metadatas.append({
                    "type": "sql_table",
                    "table_id": table.table_id,
                    "table_name": schema["table_name"],
                    "source_file": str(loaded_file.path),
                })
            else:
                result.tables_non_sql += 1

                # Non-SQL validation → text representation
                nsv_result = validate_non_sql_table(table)
                print(f"     📦 Non-SQL → MongoDB + ChromaDB")

                if nsv_result.is_valid:
                    # Store in MongoDB as unstructured data
                    unstructured_content.append({
                        "type": "non_sql_table",
                        "table_id": table.table_id,
                        "content_type": nsv_result.content_type,
                        "data": table.dataframe.to_dict(orient="records"),
                        "headers": table.headers,
                        "text_representation": nsv_result.text_representation,
                        "key_value_pairs": nsv_result.key_value_pairs,
                    })

                    # Also embed for vector search
                    embed_ids.append(f"table_nonsql_{table.table_id}")
                    embed_texts.append(nsv_result.text_representation)
                    embed_metadatas.append({
                        "type": "non_sql_table",
                        "table_id": table.table_id,
                        "content_type": nsv_result.content_type,
                        "source_file": str(loaded_file.path),
                    })

        # ── Step 5: Charts → Table → Embed ──
        if charts:
            print("\n" + "─" * 60)
            print("📈 CHART PROCESSING")
            print("─" * 60)

        for chart in charts:
            chart_df = chart_to_table(chart)
            _show_chart_results(chart.chart_id, chart.chart_type, chart_df)

            if chart_df is not None:
                chart_text = f"Chart ({chart.chart_type}): {chart.description}\n{chart_df.to_string(index=False)}"

                # Charts are unstructured → MongoDB
                unstructured_content.append({
                    "type": "chart",
                    "chart_id": chart.chart_id,
                    "chart_type": chart.chart_type,
                    "description": chart.description,
                    "data": chart_df.to_dict(orient="records"),
                })

                # Also embed
                embed_ids.append(f"chart_{chart.chart_id}")
                embed_texts.append(chart_text)
                embed_metadatas.append({
                    "type": "chart",
                    "chart_id": chart.chart_id,
                    "chart_type": chart.chart_type,
                    "source_file": str(loaded_file.path),
                })
            elif chart.description:
                embed_ids.append(f"chart_{chart.chart_id}")
                embed_texts.append(chart.description)
                embed_metadatas.append({
                    "type": "chart_description",
                    "chart_id": chart.chart_id,
                    "source_file": str(loaded_file.path),
                })

        # ── Step 6: Text → Embed + MongoDB ──
        full_text = text_result.get("full_text", "")
        if full_text and len(full_text.strip()) > 50:
            # Text is unstructured → MongoDB
            unstructured_content.append({
                "type": "text",
                "content": full_text,
                "char_count": len(full_text),
                "pages": [p for p in text_result.get("pages", [])],
            })

            embed_ids.append(f"text_{loaded_file.filename}")
            embed_texts.append(full_text)
            embed_metadatas.append({
                "type": "text",
                "source_file": str(loaded_file.path),
                "char_count": len(full_text),
            })

        # ── Step 7: Image summaries → Embed + MongoDB ──
        for img in images:
            if img.summary and not img.summary.startswith("["):
                # Image summaries are unstructured → MongoDB
                unstructured_content.append({
                    "type": "image_summary",
                    "image_id": img.image_id,
                    "summary": img.summary,
                    "mime_type": img.mime_type,
                    "width": img.width,
                    "height": img.height,
                })

                embed_ids.append(f"image_{img.image_id}")
                embed_texts.append(img.summary)
                embed_metadatas.append({
                    "type": "image_summary",
                    "image_id": img.image_id,
                    "source_file": str(loaded_file.path),
                })

        # ── Step 8: Generate embeddings → ChromaDB ──
        _show_embedding_summary(embed_ids)

        if embed_texts:
            embeddings = generate_embeddings(embed_texts)
            stored = chroma_handler.store_embeddings(
                ids=embed_ids,
                embeddings=embeddings,
                documents=embed_texts,
                metadatas=embed_metadatas,
            )
            result.embeddings_stored = stored
            print(f"  ✅ Stored {stored} embeddings in ChromaDB")

        # ── Step 9: Metadata + Relationships → MongoDB ──
        all_extraction = {
            "text": text_result,
            "tables": tables,
            "images": images,
            "charts": charts,
        }

        page_structures = extract_page_structures(profile, all_extraction)
        relationships = map_relationships(all_extraction, page_structures)

        # Build full MongoDB document
        doc_metadata = {
            "file_path": str(loaded_file.path),
            "file_name": loaded_file.filename,
            "file_type": loaded_file.extension,
            "file_size_bytes": loaded_file.size_bytes,
            "page_count": profile.page_count,
            "content_types": {
                "has_tables": profile.has_tables,
                "has_charts": profile.has_charts,
                "has_text": profile.has_text,
                "has_images": profile.has_images,
            },
            "extraction_summary": {
                "tables": result.tables_extracted,
                "tables_sql": result.tables_sql,
                "tables_non_sql": result.tables_non_sql,
                "charts": result.charts_extracted,
                "images": result.images_extracted,
                "text_chars": result.text_chars,
                "embeddings": result.embeddings_stored,
            },
            # ★ Store all unstructured content directly in MongoDB
            "unstructured_content": unstructured_content,
        }

        result.mongo_doc_id = mongo_handler.store_document_metadata(doc_metadata)
        mongo_handler.store_page_structure(result.mongo_doc_id, page_structures)
        result.relationships_stored = mongo_handler.store_relationships(
            result.mongo_doc_id, relationships
        )

        # Show final storage summary
        _show_storage_summary(result)

    except Exception as e:
        log.error(f"[bold red]Pipeline error[/] for {loaded_file.filename}: {e}")
        result.status = "error"
        result.errors.append(str(e))
        import traceback
        traceback.print_exc()

    result.duration_seconds = time.time() - start
    return result
