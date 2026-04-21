def convert_jd_to_html(raw_text: str) -> str:
    """
    Converts raw JD text to clean HTML.
    Works for ANY JD format — no assumptions about section names.
    """
    import re
    lines = raw_text.strip().split("\n")
    html = ""
    in_ul = False

    for line in lines:
        line = line.strip()
        if not line:
            if in_ul:
                html += "</ul>"
                in_ul = False
            continue

        # Numbered section headers like "1. Resource Management:"
        if re.match(r"^\d+\.\s+.+:$", line):
            if in_ul: html += "</ul>"; in_ul = False
            html += f"<h4>{line}</h4>"

        # ALL CAPS or ends with colon — section header
        elif (line.isupper() and len(line) > 3) or (line.endswith(":") and len(line) < 80 and not line.startswith("*")):
            if in_ul: html += "</ul>"; in_ul = False
            html += f"<h3>{line}</h3>"

        # Bullet points
        elif line.startswith(("*", "●", "○", "-", "•")):
            if not in_ul:
                html += "<ul>"
                in_ul = True
            content = re.sub(r"^[*●○\-•]\s*", "", line)
            # Bold years/numbers like "3-7 years"
            content = re.sub(r"(\d[\d–\-]+\s*years?)", r"<strong>\1</strong>", content, flags=re.IGNORECASE)
            html += f"<li>{content}</li>"

        # Regular paragraph
        else:
            if in_ul: html += "</ul>"; in_ul = False
            line = re.sub(r"(\d[\d–\-]+\s*years?)", r"<strong>\1</strong>", line, flags=re.IGNORECASE)
            html += f"<p>{line}</p>"

    if in_ul:
        html += "</ul>"

    return html