import whisper
from audio.speech_engine import SpeechToTextEngine
import logging
from typing import Optional

class WhisperSTTEngine(SpeechToTextEngine):
    def __init__(self, model_size="base"):
        self.model = whisper.load_model(model_size)

    def transcribe(self, audio_path: str) -> str:
        try:
            result = self.model.transcribe(audio_path)
            return result.get("text", "").strip()
        except FileNotFoundError as e:
            # Likely missing `ffmpeg` binary required by whisper.audio.load_audio
            logging.exception("Transcription failed: ffmpeg not found")
            return None
        except OSError as e:
            # Catch other subprocess-related errors (e.g., ffmpeg issues)
            logging.exception("Transcription failed: OS error during audio processing")
            return None