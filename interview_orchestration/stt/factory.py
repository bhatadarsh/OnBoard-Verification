import os
from interview_orchestration.stt.azure_stt import AzureSpeechToText


def get_stt_engine():
    provider = os.getenv("STT_PROVIDER", "azure")

    if provider == "azure":
        return AzureSpeechToText()

    raise ValueError(f"Unknown STT provider: {provider}")
