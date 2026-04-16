import json
import re


def extract_json(text: str) -> dict:
    """
    Safely extract JSON object from LLM output.
    Handles markdown fences and stray text.
    """

    # Remove markdown code fences if present
    text = re.sub(r"```json", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```", "", text)

    # Trim whitespace
    text = text.strip()

    # Find first JSON object
    match = re.search(r"\{.*\}", text, re.DOTALL)

    if not match:
        raise ValueError("No JSON object found in LLM output")

    json_str = match.group(0)

    # --- Heuristic cleanup: remove JavaScript-style comments and trailing commas ---
    # Remove // single-line comments
    json_str = re.sub(r"//.*?$", "", json_str, flags=re.MULTILINE)
    # Remove /* ... */ block comments
    json_str = re.sub(r"/\*.*?\*/", "", json_str, flags=re.DOTALL)
    # Remove trailing commas before closing } or ]
    json_str = re.sub(r",\s*([}\]])", r"\1", json_str)

    try:
        return json.loads(json_str)
    except Exception:
        # Fallback tolerant parser: extract quoted values for top-level keys.
        result = {}
        # Find arrays: "key": [ ... ]
        for m in re.finditer(r'"(?P<key>[^\"]+)"\s*:\s*\[(?P<content>.*?)\]', json_str, flags=re.DOTALL):
            key = m.group('key')
            content = m.group('content')
            items = re.findall(r'"([^\"]+)"', content)
            result[key] = [it.strip() for it in items if it.strip()]

        # Find simple string fields: "key": "value"
        for m in re.finditer(r'"(?P<key>[^\"]+)"\s*:\s*"(?P<val>[^\"]*)"', json_str):
            key = m.group('key')
            val = m.group('val').strip()
            if key not in result:
                result[key] = val

        if not result:
            raise ValueError("No JSON object found or could not parse LLM output")

        return result
