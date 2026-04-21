"""
Data Extraction Pipeline — CLI Entry Point.

Usage:
    python main.py --input ./sample_data/test.pdf
    python main.py --input ./sample_data/              # Process entire directory
    python main.py                                     # Uses DEFAULT_INPUT_PATH from .env
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config.settings import settings
from utils.logger import get_logger
from pipeline.orchestrator import run_pipeline

log = get_logger(__name__)


def main():
    parser = argparse.ArgumentParser(
        description="Data Extraction Pipeline — Extract, Validate, Embed, and Store",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --input ./sample_data/report.pdf
  python main.py --input ./sample_data/
  python main.py --input ./sample_data/ --json
        """,
    )
    parser.add_argument(
        "--input", "-i",
        type=str,
        default=settings.default_input_path,
        help=f"Path to file or directory (default: {settings.default_input_path})",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON",
    )

    args = parser.parse_args()
    input_path = Path(args.input).resolve()

    if not input_path.exists():
        log.error(f"Input path does not exist: {input_path}")
        sys.exit(1)

    # Run pipeline
    results = asyncio.run(run_pipeline(str(input_path)))

    # Output
    if args.json:
        output = [r.to_dict() for r in results]
        print(json.dumps(output, indent=2, default=str))
    else:
        print("\n" + "=" * 60)
        print("📊 PIPELINE RESULTS")
        print("=" * 60)
        for r in results:
            print(f"\n📄 {r.file_path}")
            print(f"   Status: {r.status}")
            print(f"   Duration: {r.duration_seconds:.1f}s")
            print(f"   Tables: {r.tables_extracted} (SQL: {r.tables_sql}, Non-SQL: {r.tables_non_sql})")
            print(f"   Charts: {r.charts_extracted}")
            print(f"   Images: {r.images_extracted}")
            print(f"   Audio: {r.audio_extracted}")
            print(f"   Text: {r.text_chars:,} chars")
            print(f"   Embeddings stored: {r.embeddings_stored}")
            print(f"   PostgreSQL rows: {r.postgres_rows}")
            print(f"   MongoDB doc: {r.mongo_doc_id}")
            print(f"   Relationships: {r.relationships_stored}")
            if r.errors:
                print(f"   ⚠ Errors: {', '.join(r.errors)}")
        print("=" * 60)


if __name__ == "__main__":
    main()
