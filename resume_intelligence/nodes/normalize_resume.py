"""
Node 1 — normalize_resume
Cleans raw resume text before any LLM processing.
"""
import re


def normalize_resume(state: dict) -> dict:
    text = state.get("raw_resume", "")
    if not text:
        raise ValueError("State missing 'raw_resume'")

    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Normalize common bullet variants to dash
    text = re.sub(r"[•●▪▸‣–]", "-", text)
    # Strip trailing whitespace per line
    text = "\n".join(line.rstrip() for line in text.splitlines())

    return {**state, "normalized_resume": text.strip()}