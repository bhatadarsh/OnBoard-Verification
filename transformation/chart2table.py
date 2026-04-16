"""
Chart-to-Table Converter — converts chart images to tabular data using Gemini Vision.

Takes a chart image, sends it to Gemini for analysis, and returns
structured tabular data (pandas DataFrame).
"""
import json
import base64
from typing import Optional

import pandas as pd

from config.settings import settings
from utils.logger import get_logger

log = get_logger(__name__)


def chart_to_table(chart) -> Optional[pd.DataFrame]:
    """Convert a chart image to tabular data using Gemini Vision.

    Args:
        chart: ExtractedChart object from chart_extractor.

    Returns:
        pandas DataFrame with extracted data, or None if conversion failed.
    """
    if not chart.image_bytes:
        log.warning(f"Chart {chart.chart_id} has no image data. Skipping conversion.")
        return None

    if not settings.gemini_api_key:
        log.warning("GEMINI_API_KEY not set. Cannot convert chart to table.")
        return None

    try:
        from google import genai
        from utils.gemini_helper import call_gemini

        client = genai.Client(api_key=settings.gemini_api_key)

        b64_data = base64.b64encode(chart.image_bytes).decode("utf-8")

        prompt = """Analyze this chart/graph image and extract the data into a table.

**Instructions:**
1. Identify the chart type (bar, line, pie, scatter, etc.)
2. Extract ALL data points with their labels
3. Return the data as a JSON array of objects

**Response format (JSON only, no other text):**
{
    "chart_type": "bar/line/pie/scatter/other",
    "title": "Chart title if visible",
    "x_axis": "X-axis label",
    "y_axis": "Y-axis label",
    "data": [
        {"label": "Category1", "value": 123},
        {"label": "Category2", "value": 456}
    ]
}

If the chart has multiple series:
{
    "chart_type": "...",
    "data": [
        {"label": "Cat1", "series_1": 10, "series_2": 20},
        {"label": "Cat2", "series_1": 30, "series_2": 40}
    ]
}

Return ONLY the JSON."""

        response = call_gemini(
            client=client,
            model=settings.gemini_model,
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": chart.mime_type,
                                "data": b64_data,
                            }
                        },
                    ],
                }
            ],
        )

        response_text = response.text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json.loads(response_text)
        data = result.get("data", [])

        if not data:
            log.warning(f"No data extracted from chart {chart.chart_id}")
            return None

        df = pd.DataFrame(data)

        # Update chart metadata
        chart.chart_type = result.get("chart_type", chart.chart_type)
        chart.description = result.get("title", chart.description)

        log.info(
            f"Chart [bold]{chart.chart_id}[/] → table with "
            f"{len(df)} rows, {len(df.columns)} columns "
            f"(type: {chart.chart_type})"
        )
        return df

    except Exception as e:
        log.error(f"Chart-to-table conversion error for {chart.chart_id}: {e}")
        return None
