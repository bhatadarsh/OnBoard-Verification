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
        
        # Increase initial silence timeout (default is 5s) to 15s
        self.config.set_property(
            speechsdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, 
            "15000"
        )
        # Increase end silence timeout to 3s
        self.config.set_property(
            speechsdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
            "3000"
        )

    def transcribe(self, audio_path: str) -> str:
        # Sanity checks: ensure the file exists and is readable
        if not audio_path or not os.path.exists(audio_path):
            raise RuntimeError(f"Audio file does not exist: {audio_path}")

        try:
            size = os.path.getsize(audio_path)
            print(f"DEBUG: Azure STT starting. File: {audio_path}, Size: {size} bytes")
        except Exception as e:
            print(f"DEBUG: Could not get file size: {e}")
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
        
        print(f"DEBUG: Azure STT Result Reason: {result.reason}")

        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            print(f"DEBUG: Azure STT Success: '{result.text}'")
            return result.text
        elif result.reason == speechsdk.ResultReason.NoMatch:
            print(f"DEBUG: Azure STT NoMatch. Details: {result.no_match_details}")
            return ""
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            print(f"DEBUG: Azure STT Canceled. Reason: {cancellation.reason}, Error: {cancellation.error_details}")
            return ""
        else:
            print(f"DEBUG: Azure STT Unknown Reason: {result.reason}")
            return ""

