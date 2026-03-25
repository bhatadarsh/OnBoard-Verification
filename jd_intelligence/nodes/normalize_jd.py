# nodes/normalize_jd.py
import re


def normalize_jd(state: dict) -> dict:
    raw = state["raw_jd"]

    # Remove excessive whitespace
    text = re.sub(r"\n+", "\n", raw)

    # Remove common non-interview sections
    noise_patterns = [
        r"Equal Opportunity Employer.*",
        r"Diversity.*Inclusion.*",
        r"Benefits.*",
        r"About Us.*"
    ]

    for pattern in noise_patterns:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE | re.DOTALL)

    # Normalize bullet styles
    text = text.replace("•", "-").replace("●", "-")

    return {
        **state,
        "normalized_jd": text.strip()
    }
