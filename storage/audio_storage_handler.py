from sqlalchemy import Table, Column, Integer, Text, MetaData, TIMESTAMP, func, String
from sqlalchemy.exc import SQLAlchemyError

from storage.postgres_handler import postgres_handler
from extraction.audio_extractor import AudioResult
from utils.logger import get_logger

log = get_logger(__name__)

class AudioStorageHandler:
    """Manages storage of audio transcriptions in PostgreSQL."""

    def __init__(self):
        self.metadata = MetaData()
        self._init_table()

    def _init_table(self):
        """Define the audio_transcriptions table."""
        self.table = Table(
            "audio_transcriptions", self.metadata,
            Column("id", Integer, primary_key=True),
            Column("candidate_id", String(50), index=True),
            Column("filename", Text),
            Column("transcript", Text),
            Column("summary", Text),
            Column("created_at", TIMESTAMP, server_default=func.now()),
            extend_existing=True
        )

        try:
            self.metadata.create_all(postgres_handler.engine)
            log.info("Initialized Audio Transcription PostgreSQL table")
        except Exception as e:
            log.error(f"Failed to initialize audio table: {e}")

        # Soft migration: add candidate_id if missing
        self._run_migrations()

    def _run_migrations(self):
        """Add candidate_id column to existing audio table if it doesn't exist."""
        try:
            with postgres_handler.engine.begin() as conn:
                conn.execute(__import__('sqlalchemy').text(
                    "ALTER TABLE audio_transcriptions ADD COLUMN IF NOT EXISTS candidate_id VARCHAR(50)"
                ))
            log.info("Audio table migration applied (candidate_id column ensured)")
        except Exception as e:
            log.error(f"Audio migration error: {e}")

    def store_transcript(self, result: AudioResult, candidate_id: str) -> bool:
        """Insert transcription results into the database."""
        try:
            with postgres_handler.engine.begin() as conn:
                conn.execute(self.table.insert().values(
                    candidate_id=candidate_id,
                    filename=result.filename,
                    transcript=result.transcript,
                    summary=result.summary
                ))
            log.info(f"Stored audio transcript for {result.filename} in PostgreSQL")
            return True
        except SQLAlchemyError as e:
            log.error(f"Failed to store audio transcript: {e}")
            return False

# Singleton
audio_storage_handler = AudioStorageHandler()
