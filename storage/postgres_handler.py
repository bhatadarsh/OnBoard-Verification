"""
PostgreSQL Handler — stores SQL-compatible tables in a relational database.

Uses SQLAlchemy for dynamic table creation and data insertion.
"""
from typing import Dict, Any, List

import pandas as pd
from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, Text, Float, Date, Boolean
from sqlalchemy.exc import SQLAlchemyError

from config.settings import settings
from utils.logger import get_logger

log = get_logger(__name__)

# SQLAlchemy type mapping
_TYPE_MAP = {
    "TEXT": Text,
    "INTEGER": Integer,
    "REAL": Float,
    "DOUBLE PRECISION": Float,
    "NUMERIC": Float,
    "DATE": Date,
    "TIMESTAMP": Text,  # Stored as text for simplicity
    "BOOLEAN": Boolean,
}


class PostgresHandler:
    """Manages PostgreSQL connections and table operations."""

    def __init__(self):
        self._engine = None
        self._metadata = MetaData()

    @property
    def engine(self):
        if self._engine is None:
            import os
            db_url = os.getenv("DATABASE_URL") or settings.postgres_uri
            if not db_url or "postgresql" not in db_url:
                db_url = "sqlite:///./onboardguard.db"
            
            self._engine = create_engine(db_url, echo=False)
            log.info(f"Connected to database: {db_url.split('/')[-1]}")
        return self._engine

    def create_table(self, schema: Dict[str, Any]) -> bool:
        """Create a table from inferred schema.

        Args:
            schema: Dict from schema_extractor.infer_schema() with
                    table_name, columns [(name, type)], and create_sql.

        Returns:
            True if table was created successfully.
        """
        try:
            table_name = schema["table_name"]
            columns_spec = schema["columns"]

            # Build SQLAlchemy columns
            sa_columns = [Column("id", Integer, primary_key=True, autoincrement=True)]
            for col_name, col_type in columns_spec:
                sa_type = _TYPE_MAP.get(col_type, Text)
                sa_columns.append(Column(col_name, sa_type))

            # Create table
            table = Table(table_name, self._metadata, *sa_columns, extend_existing=True)
            self._metadata.create_all(self.engine, tables=[table])

            log.info(f"Created PostgreSQL table: [bold]{table_name}[/]")
            return True

        except SQLAlchemyError as e:
            log.error(f"Failed to create table: {e}")
            return False

    def insert_data(self, table_name: str, df: pd.DataFrame) -> int:
        """Insert DataFrame rows into a PostgreSQL table.

        Args:
            table_name: Name of the target table.
            df: pandas DataFrame with data to insert.

        Returns:
            Number of rows inserted.
        """
        try:
            rows = df.to_dict(orient="records")
            with self.engine.connect() as conn:
                for row in rows:
                    # Clean NaN values
                    clean_row = {k: (None if pd.isna(v) else v) for k, v in row.items()}
                    cols = ", ".join(clean_row.keys())
                    placeholders = ", ".join(f":{k}" for k in clean_row.keys())
                    sql = text(f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})")
                    conn.execute(sql, clean_row)
                conn.commit()

            log.info(f"Inserted [bold]{len(rows)}[/] rows into {table_name}")
            return len(rows)

        except SQLAlchemyError as e:
            log.error(f"Failed to insert data into {table_name}: {e}")
            return 0

    def store_table(self, table, schema: Dict[str, Any]) -> Dict[str, Any]:
        """High-level: create table and insert data.

        Args:
            table: ExtractedTable from table_extractor.
            schema: Dict from schema_extractor.

        Returns:
            Result dict with status and row count.
        """
        table_name = schema["table_name"]
        created = self.create_table(schema)
        if not created:
            return {"status": "error", "table_name": table_name, "rows_inserted": 0}

        # Rename DataFrame columns to match schema
        col_mapping = {
            old: new for old, (new, _) in zip(table.headers, schema["columns"])
        }
        df = table.dataframe.rename(columns=col_mapping)

        rows = self.insert_data(table_name, df)
        return {"status": "success", "table_name": table_name, "rows_inserted": rows}

    def close(self):
        """Close the engine connection."""
        if self._engine:
            self._engine.dispose()
            log.info("PostgreSQL connection closed")


# Singleton
postgres_handler = PostgresHandler()
