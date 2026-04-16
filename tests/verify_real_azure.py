import os
import sys

# Force add CWD to path to ensure we can import from root
sys.path.insert(0, os.getcwd())

print(f"DEBUG: sys.path[0] is {sys.path[0]}")

try:
    from interview_orchestration.stt.factory import get_stt_engine
    from streamlit_app.storage.azure_store import save_raw_audio
except ImportError as e:
    print(f"❌ Import failed: {e}")
    # Try appending '..' just in case
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from interview_orchestration.stt.factory import get_stt_engine
    from streamlit_app.storage.azure_store import save_raw_audio

def run_verification():
    # Ensure we are catching any errors
    try:
        print("🔹 Testing Azure Blob Storage Upload...")
        candidate_id = "test_user_verification"
        audio_path = "test_audio.wav"
        
        if not os.path.exists(audio_path):
            print(f"❌ Error: {audio_path} not found. Please generate it first.")
            sys.exit(1)

        # 1. Test Upload
        blob_url = save_raw_audio(candidate_id, audio_path)
        print(f"✅ Upload Successful! Blob URL: {blob_url}")

        print("\n🔹 Testing Azure Speech-to-Text...")
        # 2. Test STT
        stt_engine = get_stt_engine()
        print(f"   Engine created: {type(stt_engine).__name__}")
        
        # Since it's silence, we expect empty string or maybe nothing, but no crash.
        # To be sure, we just want to ensure it connects without Auth error.
        transcript = stt_engine.transcribe(audio_path)
        print(f"✅ Transcription completed (result might be empty for silence): '{transcript}'")
        
        print("\n🎉 REAL Azure Integration Verified Successfully!")

    except Exception as e:
        print(f"\n❌ FAILED with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_verification()
