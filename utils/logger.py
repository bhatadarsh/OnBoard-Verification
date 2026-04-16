"""
Structured logging with rich formatting.
All modules use this logger for consistent output.
"""
import logging
import sys
from rich.logging import RichHandler
from config.settings import settings


def get_logger(name: str) -> logging.Logger:
    """Create a configured logger instance.
    
    Args:
        name: Module name (use __name__).
    
    Returns:
        Configured logging.Logger with rich formatting.
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = RichHandler(
            show_time=True,
            show_path=False,
            markup=True,
            rich_tracebacks=True,
        )
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))

    return logger
