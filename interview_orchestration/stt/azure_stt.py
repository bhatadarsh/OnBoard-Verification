import os
import azure.cognitiveservices.speech as speechsdk
from interview_orchestration.stt.base import SpeechToTextEngine


class AzureSpeechToText(SpeechToTextEngine):
    def __init__(self):
        self.speech_key = os.getenv("AZURE_SPEECH_KEY")
        self.region = os.getenv("AZURE_SPEECH_REGION")

        if not self.speech_key or not self.region:
            raise RuntimeError("Azure Speech credentials missing")

        self.config = speechsdk.SpeechConfig(
            subscription=self.speech_key,
            region=self.region
        )
        self.config.speech_recognition_language = "en-US"

    def transcribe(self, audio_path: str) -> str:
        # Sanity checks: ensure the file exists and is readable
        if not audio_path or not os.path.exists(audio_path):
            raise RuntimeError(f"Audio file does not exist: {audio_path}")

        try:
            size = os.path.getsize(audio_path)
        except Exception:
            size = None

        # Azure SDK expects a WAV file with compatible PCM encoding
        if not audio_path.lower().endswith('.wav'):
            # allow caller to handle conversion, but surface clearer error
            raise RuntimeError(f"Azure STT requires a WAV file; got: {audio_path}")

        audio_input = speechsdk.AudioConfig(filename=audio_path)
        recognizer = speechsdk.SpeechRecognizer(
            speech_config=self.config,
            audio_config=audio_input
        )

        result = recognizer.recognize_once()

        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            return result.text

        return ""
