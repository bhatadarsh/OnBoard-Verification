"""
Parallel execution helpers for running extraction tasks concurrently.
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Dict, Optional

from config.settings import settings
from utils.logger import get_logger

log = get_logger(__name__)


async def run_parallel(
    tasks: Dict[str, Callable],
    *,
    max_workers: Optional[int] = None,
) -> Dict[str, Any]:
    """Run multiple extraction tasks in parallel using a thread pool.

    Args:
        tasks: Dict mapping task_name -> callable (sync function).
        max_workers: Override max concurrent workers (default from settings).

    Returns:
        Dict mapping task_name -> result (or Exception if task failed).
    """
    workers = max_workers or settings.max_workers
    results: Dict[str, Any] = {}
    loop = asyncio.get_event_loop()

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {}
        for name, func in tasks.items():
            if func is not None:
                log.info(f"[bold blue]Launching[/] parallel task: {name}")
                futures[name] = loop.run_in_executor(executor, func)
            else:
                log.debug(f"Skipping task: {name} (no content detected)")

        for name, future in futures.items():
            try:
                results[name] = await future
                log.info(f"[bold green]Completed[/] task: {name}")
            except Exception as e:
                log.error(f"[bold red]Failed[/] task {name}: {e}")
                results[name] = e

    return results
