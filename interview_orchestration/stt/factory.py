import os
from interview_orchestration.stt.whisper_stt import WhisperSpeechToText
_engine = None 

def get_stt_engine():
    # default to azure as per requirements
    # provider = os.getenv("STT_PROVIDER", "whisper")
    global _engine 
    if _engine is None: 
        _engine = WhisperSpeechToText()

    return _engine 
