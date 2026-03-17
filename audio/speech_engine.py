from abc import ABC, abstractmethod

class SpeechToTextEngine(ABC):
    @abstractmethod
    def transcribe(self, audio_path: str) -> str:
        pass
