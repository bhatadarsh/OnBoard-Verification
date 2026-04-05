# transcribe_test.py
from interview_orchestration.stt.factory import get_stt_engine
p = "path/to/your/recorded_file.webm"   # or .ogg/.mp3/.wav
print("Transcribing:", p)
print(get_stt_engine().transcribe(p))