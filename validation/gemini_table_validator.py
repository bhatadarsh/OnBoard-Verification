"""
Gemini Table Validator — uses Gemini LLM to classify extracted tables
as SQL-compatible or Non-SQL.

SQL-compatible tables have:
  - Consistent column types
  - Proper header row
  - Regular row structure (no merged cells, no nested headers)

Non-SQL tables have:
  - Irregular structures
  - Merged cells, multi-level headers
  - Key-value pair layouts
"""
import json
from typing import Dict, Any, Literal

from config.settings import settings
from utils.logger import get_logger

log = get_logger(__name__)


class TableClassification:
    """Result of table classification."""

    def __init__(
        self,
        table_id: str,
        classification: Literal["SQL", "NON_SQL"],
        confidence: float,
        reasoning: str,
        suggested_table_name: str = "",
        column_types: Dict[str, str] = None,
    ):
        self.table_id = table_id
        self.classification = classification
        self.confidence = confidence
        self.reasoning = reasoning
        self.suggested_table_name = suggested_table_name
        self.column_types = column_types or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "table_id": self.table_id,
            "classification": self.classification,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "suggested_table_name": self.suggested_table_name,
            "column_types": self.column_types,
        }

    @property
    def is_sql(self) -> bool:
        return self.classification == "SQL"


def classify_table(table) -> TableClassification:
    """Classify whether a table is SQL-compatible or Non-SQL using Gemini.

    Args:
        table: ExtractedTable object from table_extractor.

    Returns:
        TableClassification with SQL/NON_SQL verdict.
    """
    if not settings.gemini_api_key:
        log.warning("GEMINI_API_KEY not set. Defaulting to NON_SQL classification.")
        return TableClassification(
            table_id=table.table_id,
            classification="NON_SQL",
            confidence=0.0,
            reasoning="No API key available for classification",
        )

    try:
        from google import genai
        from utils.gemini_helper import call_gemini

        client = genai.Client(api_key=settings.gemini_api_key)

        # Build a concise representation of the table
        sample_rows = table.dataframe.head(5).to_string(index=False)
        headers = ", ".join(table.headers)

        prompt = f"""Analyze this table and determine if it is SQL-compatible or Non-SQL.

**Table Headers:** {headers}
**Row Count:** {table.row_count}
**Column Count:** {table.col_count}

**Sample Data (first 5 rows):**
{sample_rows}

**Classification Rules:**
- **SQL**: Table has consistent columns, a proper header row, regular data types (string/int/float/date), and no merged cells or nested headers. Could be stored directly in a relational database table.
- **NON_SQL**: Table has irregular structure, merged cells, multi-level headers, key-value pairs, or cannot be naturally represented in a flat relational schema.

**Respond in this exact JSON format:**
{{
    "classification": "SQL" or "NON_SQL",
    "confidence": 0.0 to 1.0,
    "reasoning": "Brief explanation",
    "suggested_table_name": "snake_case_name",
    "column_types": {{"column_name": "VARCHAR/INTEGER/FLOAT/DATE/BOOLEAN", ...}}
}}

Return ONLY the JSON, no other text."""

        response = call_gemini(
            client=client,
            model=settings.gemini_model,
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
        )

        # Parse JSON response
        response_text = response.text.strip()
        # Handle markdown code block wrapping
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json.loads(response_text)

        classification = TableClassification(
            table_id=table.table_id,
            classification=result.get("classification", "NON_SQL"),
            confidence=float(result.get("confidence", 0.5)),
            reasoning=result.get("reasoning", ""),
            suggested_table_name=result.get("suggested_table_name", ""),
            column_types=result.get("column_types", {}),
        )

        log.info(
            f"Table [bold]{table.table_id}[/] → "
            f"[{'green' if classification.is_sql else 'yellow'}]{classification.classification}[/] "
            f"(confidence: {classification.confidence:.0%})"
        )
        return classification

    except Exception as e:
        log.error(f"Gemini table classification error for {table.table_id}: {e}")
        return TableClassification(
            table_id=table.table_id,
            classification="NON_SQL",
            confidence=0.0,
            reasoning=f"Classification failed: {str(e)}",
        )
