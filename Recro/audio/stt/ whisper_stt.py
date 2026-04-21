import whisper
from audio.stt.base import SpeechToText

class WhisperSTT(SpeechToText):
    def __init__(self, model_size: str = "base"):
        self.model = whisper.load_model(model_size)

    def transcribe(self, audio_path: str) -> str:
        result = self.model.transcribe(audio_path)
        return result.get("text", "").strip()
