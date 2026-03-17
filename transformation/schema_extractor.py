"""
Schema Extractor — infers SQL schema from SQL-compatible tables.

Takes a TableClassification (from Gemini validator) and generates
a CREATE TABLE statement + column type mapping for PostgreSQL storage.
"""
from typing import Dict, Any, List, Tuple
import re

from utils.logger import get_logger

log = get_logger(__name__)

# Mapping from Gemini-suggested types to PostgreSQL types
TYPE_MAP = {
    "VARCHAR": "TEXT",
    "STRING": "TEXT",
    "TEXT": "TEXT",
    "INTEGER": "INTEGER",
    "INT": "INTEGER",
    "FLOAT": "REAL",
    "DOUBLE": "DOUBLE PRECISION",
    "NUMERIC": "NUMERIC",
    "DATE": "DATE",
    "DATETIME": "TIMESTAMP",
    "BOOLEAN": "BOOLEAN",
    "BOOL": "BOOLEAN",
}


def infer_schema(
    table,
    classification,
) -> Dict[str, Any]:
    """Infer SQL schema from a classified table.

    Args:
        table: ExtractedTable from table_extractor.
        classification: TableClassification from gemini_table_validator.

    Returns:
        Dict with:
            - table_name: str
            - columns: List of (name, type) tuples
            - create_sql: str (CREATE TABLE statement)
            - column_types: Dict[str, str]
    """
    # Generate table name
    table_name = classification.suggested_table_name or _generate_table_name(table.table_id)
    table_name = _sanitize_name(table_name)

    # Infer column types
    columns = _infer_column_types(table, classification)

    # Generate CREATE TABLE SQL
    create_sql = _generate_create_table(table_name, columns)

    log.info(f"Inferred schema for [bold]{table_name}[/]: {len(columns)} columns")

    return {
        "table_name": table_name,
        "columns": columns,
        "create_sql": create_sql,
        "column_types": {name: dtype for name, dtype in columns},
    }


def _infer_column_types(
    table,
    classification,
) -> List[Tuple[str, str]]:
    """Infer PostgreSQL column types from extracted table data."""
    columns = []
    df = table.dataframe

    for header in table.headers:
        col_name = _sanitize_name(header)

        # Check if Gemini provided a type
        gemini_type = classification.column_types.get(header, "")
        if gemini_type:
            pg_type = TYPE_MAP.get(gemini_type.upper(), "TEXT")
        else:
            # Infer from data
            pg_type = _infer_type_from_data(df, header)

        columns.append((col_name, pg_type))

    return columns


def _infer_type_from_data(df, column_name: str) -> str:
    """Infer PostgreSQL type from actual column data."""
    if column_name not in df.columns:
        return "TEXT"

    col = df[column_name].dropna()
    if col.empty:
        return "TEXT"

    # Try numeric
    try:
        numeric = col.astype(float)
        if (numeric % 1 == 0).all():
            return "INTEGER"
        return "REAL"
    except (ValueError, TypeError):
        pass

    # Try date
    sample = str(col.iloc[0])
    date_patterns = [
        r"\d{4}-\d{2}-\d{2}",
        r"\d{2}/\d{2}/\d{4}",
        r"\d{2}-\d{2}-\d{4}",
    ]
    if any(re.match(p, sample) for p in date_patterns):
        return "DATE"

    # Try boolean
    bool_values = {"true", "false", "yes", "no", "1", "0"}
    if col.astype(str).str.lower().isin(bool_values).all():
        return "BOOLEAN"

    return "TEXT"


def _generate_create_table(table_name: str, columns: List[Tuple[str, str]]) -> str:
    """Generate a PostgreSQL CREATE TABLE statement."""
    col_defs = []
    for col_name, col_type in columns:
        col_defs.append(f"    {col_name} {col_type}")

    cols_str = ",\n".join(col_defs)
    return f"CREATE TABLE IF NOT EXISTS {table_name} (\n    id SERIAL PRIMARY KEY,\n{cols_str}\n);"


def _sanitize_name(name: str) -> str:
    """Convert a name to a valid SQL identifier."""
    clean = re.sub(r"[^a-zA-Z0-9_]", "_", name.strip().lower())
    clean = re.sub(r"_+", "_", clean).strip("_")
    if clean and clean[0].isdigit():
        clean = f"col_{clean}"
    return clean or "unnamed"


def _generate_table_name(table_id: str) -> str:
    """Generate a table name from table_id."""
    return _sanitize_name(table_id)
