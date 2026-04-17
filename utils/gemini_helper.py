"""
Gemini API helper — handles rate limiting with automatic retry/backoff.

Free-tier Gemini API has a 5 requests/minute limit.
This module provides a centralized rate-limiter so all Gemini calls
across the pipeline respect the quota.
"""
import time
import threading
from utils.logger import get_logger

log = get_logger(__name__)

# ── Global rate limiter ──
_lock = threading.Lock()
_call_timestamps: list = []
_MAX_CALLS_PER_MINUTE = 5
_WINDOW_SECONDS = 60


def _wait_for_rate_limit():
    """Block until we have capacity for another Gemini call."""
    with _lock:
        now = time.time()
        # Remove timestamps older than the window
        while _call_timestamps and _call_timestamps[0] < now - _WINDOW_SECONDS:
            _call_timestamps.pop(0)

        if len(_call_timestamps) >= _MAX_CALLS_PER_MINUTE:
            wait_time = _call_timestamps[0] + _WINDOW_SECONDS - now + 0.5
            if wait_time > 0:
                log.info(f"  ⏳ Gemini rate limit reached — waiting {wait_time:.1f}s")
                _lock.release()
                time.sleep(wait_time)
                _lock.acquire()
                # Clean up again after sleep
                now = time.time()
                while _call_timestamps and _call_timestamps[0] < now - _WINDOW_SECONDS:
                    _call_timestamps.pop(0)

        _call_timestamps.append(time.time())


def call_gemini(client, model: str, contents: list, max_retries: int = 3, **kwargs):
    """Make a Gemini API call with rate limiting and retry on 429.

    Args:
        client: google.genai.Client instance
        model: Model name (e.g. 'gemini-2.5-flash')
        contents: List of content dicts for generate_content
        max_retries: Maximum retry attempts

    Returns:
        The response object from generate_content
    """
    for attempt in range(max_retries):
        _wait_for_rate_limit()
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                **kwargs
            )
            return response
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                wait = 15 * (attempt + 1)
                log.warning(f"  ⏳ Gemini 429 (attempt {attempt+1}/{max_retries}) — retrying in {wait}s")
                time.sleep(wait)
            else:
                raise  # Non-rate-limit error, propagate immediately

    raise Exception(f"Gemini API call failed after {max_retries} retries (rate limit)")
