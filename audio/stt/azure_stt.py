from audio.stt.base import SpeechToText

class AzureSTT(SpeechToText):
    def __init__(self, config: dict):
        self.config = config

    def transcribe(self, audio_path: str) -> str:
        raise NotImplementedError("Azure STT not wired yet")
