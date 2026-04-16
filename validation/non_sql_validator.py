"""
Non-SQL Table Validator — validates and normalizes tables classified as Non-SQL.

Non-SQL tables (key-value, irregular, multi-level) are converted to
a flat text representation suitable for embedding.
"""
from typing import Dict, Any, List

from utils.logger import get_logger

log = get_logger(__name__)


class NonSQLValidationResult:
    """Result of Non-SQL table validation."""

    def __init__(
        self,
        table_id: str,
        is_valid: bool,
        content_type: str,
        text_representation: str,
        key_value_pairs: Dict[str, str] = None,
        issues: List[str] = None,
    ):
        self.table_id = table_id
        self.is_valid = is_valid
        self.content_type = content_type  # "key_value", "irregular", "multi_header"
        self.text_representation = text_representation
        self.key_value_pairs = key_value_pairs or {}
        self.issues = issues or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "table_id": self.table_id,
            "is_valid": self.is_valid,
            "content_type": self.content_type,
            "text_representation": self.text_representation,
            "key_value_pairs": self.key_value_pairs,
            "issues": self.issues,
        }


def validate_non_sql_table(table) -> NonSQLValidationResult:
    """Validate and normalize a Non-SQL table for embedding.

    Identifies the structure type and creates a clean text
    representation suitable for vector embedding.

    Args:
        table: ExtractedTable object from table_extractor.

    Returns:
        NonSQLValidationResult with text representation.
    """
    issues = []
    df = table.dataframe

    # Check for empty table
    if df.empty:
        return NonSQLValidationResult(
            table_id=table.table_id,
            is_valid=False,
            content_type="empty",
            text_representation="",
            issues=["Table is empty"],
        )

    # Detect content type
    content_type = _detect_content_type(table)

    # Generate text representation based on type
    if content_type == "key_value":
        text_repr, kv_pairs = _process_key_value_table(table)
    else:
        text_repr, kv_pairs = _process_irregular_table(table)
        kv_pairs = {}

    # Validation checks
    if len(text_repr.strip()) < 10:
        issues.append("Very short content — may not be useful")

    if df.isnull().sum().sum() > (df.size * 0.5):
        issues.append("More than 50% null values detected")

    is_valid = len(text_repr.strip()) >= 10

    log.info(
        f"Non-SQL validation for [bold]{table.table_id}[/]: "
        f"type={content_type}, valid={is_valid}, "
        f"text_len={len(text_repr)}"
    )

    return NonSQLValidationResult(
        table_id=table.table_id,
        is_valid=is_valid,
        content_type=content_type,
        text_representation=text_repr,
        key_value_pairs=kv_pairs,
        issues=issues,
    )


def _detect_content_type(table) -> str:
    """Detect the structure type of a Non-SQL table."""
    df = table.dataframe

    # Key-value pattern: 2 columns, first column has unique string labels
    if df.shape[1] == 2:
        first_col = df.iloc[:, 0]
        if first_col.dtype == object and first_col.nunique() == len(first_col):
            return "key_value"

    # Multi-header: check if first few rows look like headers
    if df.shape[0] > 2:
        first_row_types = df.iloc[0].apply(type).unique()
        if len(first_row_types) == 1 and first_row_types[0] == str:
            # Check if second row also looks like a header
            second_row_numeric = df.iloc[1].apply(
                lambda x: str(x).replace(".", "").replace("-", "").isdigit()
            ).sum()
            if second_row_numeric < df.shape[1] * 0.5:
                return "multi_header"

    return "irregular"


def _process_key_value_table(table) -> tuple:
    """Process a key-value style table."""
    df = table.dataframe
    kv_pairs = {}
    text_parts = []

    for _, row in df.iterrows():
        key = str(row.iloc[0]).strip()
        value = str(row.iloc[1]).strip()
        if key and value and value.lower() not in ("nan", "none", ""):
            kv_pairs[key] = value
            text_parts.append(f"{key}: {value}")

    text_repr = "\n".join(text_parts)
    return text_repr, kv_pairs


def _process_irregular_table(table) -> tuple:
    """Process an irregular/multi-header table into text."""
    df = table.dataframe
    text_parts = []

    # Include headers
    headers = " | ".join(str(h) for h in table.headers)
    text_parts.append(f"Headers: {headers}")

    # Convert each row to text
    for idx, row in df.iterrows():
        row_text = " | ".join(str(v).strip() for v in row.values if str(v).strip().lower() != "nan")
        if row_text.strip():
            text_parts.append(row_text)

    text_repr = "\n".join(text_parts)
    return text_repr, {}
