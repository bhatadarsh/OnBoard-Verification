import re


def normalize_resume(state: dict) -> dict:
    text = state["raw_resume"]

    text = re.sub(r"\n+", "\n", text)
    text = text.replace("•", "-").replace("●", "-")

    return {
        **state,
        "normalized_resume": text.strip()
    }
