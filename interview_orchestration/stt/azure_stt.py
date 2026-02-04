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
        audio_input = speechsdk.AudioConfig(filename=audio_path)
        recognizer = speechsdk.SpeechRecognizer(
            speech_config=self.config,
            audio_config=audio_input
        )

        result = recognizer.recognize_once()

        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            return result.text

        return ""
