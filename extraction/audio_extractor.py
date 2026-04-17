import base64
from typing import Optional
from dataclasses import dataclass

from config.settings import settings
from utils.logger import get_logger
from utils.gemini_helper import call_gemini

log = get_logger(__name__)

@dataclass
class AudioResult:
    """Represents the result of an audio transcription."""
    transcript: str
    summary: str
    filename: str

def extract_audio_transcription(profile) -> Optional[AudioResult]:
    """Transcribe and summarize audio using Gemini.

    Args:
        profile: ContentProfile with has_audio=True.

    Returns:
        AudioResult or None if extraction fails.
    """
    if not settings.gemini_api_key:
        log.warning("GEMINI_API_KEY not set. Skipping audio transcription.")
        return None

    try:
        from google import genai
        client = genai.Client(api_key=settings.gemini_api_key)

        mime_map = {
            "mp3": "audio/mpeg",
            "wav": "audio/wav",
            "m4a": "audio/mp4",
            "flac": "audio/flac",
            "aac": "audio/aac",
        }
        mime_type = mime_map.get(profile.file_type, "audio/mpeg")
        b64_data = base64.b64encode(profile.raw_bytes).decode("utf-8")

        log.info(f"Transcribing audio: {profile.file_path} ({mime_type})")

        response = call_gemini(
            client=client,
            model=settings.gemini_model,
            contents=[{
                "role": "user",
                "parts": [
                    {"text": (
                        "Transcribe this audio file accurately in English. "
                        "If there are multiple speakers, label them as 'Speaker 1', 'Speaker 2', etc. "
                        "After the transcription, provide a concise summary of the main points discussed."
                        "\n\nFormat your response as follows:\n"
                        "TRANSCRIPT:\n[Full text]\n\nSUMMARY:\n[Brief summary]"
                    )},
                    {"inline_data": {"mime_type": mime_type, "data": b64_data}}
                ]
            }]
        )

        text = response.text.strip()

        transcript = ""
        summary = ""

        if "SUMMARY:" in text:
            parts = text.split("SUMMARY:")
            summary = parts[1].strip()
            transcript = parts[0].replace("TRANSCRIPT:", "").strip()
        else:
            transcript = text.replace("TRANSCRIPT:", "").strip()
            summary = "Summary not provided by model."

        return AudioResult(
            transcript=transcript,
            summary=summary,
            filename=profile.file_path.split("/")[-1]
        )

    except Exception as e:
        log.error(f"Audio transcription error for {profile.file_path}: {e}")
        return None
