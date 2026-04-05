import tempfile
import streamlit as st
from interview_orchestration.stt.factory import get_stt_engine
from streamlit_app.utils.audio_utils import convert_to_wav


def record_and_transcribe(max_seconds: int = 45) -> str:
    """Try multiple ways to obtain audio and transcribe.

    Preference order:
    1. `st.audio_input` (if available in Streamlit build)
    2. `st.file_uploader` (user uploads recorded audio)
    3. Text fallback (user types answer)

    The function returns an empty string if no input is available.
    """

    # 1) Try native audio_input (some Streamlit builds expose this)
    audio_input_fn = getattr(st, "audio_input", None)

    if callable(audio_input_fn):
        try:
            audio = audio_input_fn(
                f"🎤 You have {max_seconds} seconds to answer",
                key=f"audio_{max_seconds}"
            )
            if audio is not None:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                    # audio may expose getbuffer() or read()
                    if hasattr(audio, "getbuffer"):
                        f.write(audio.getbuffer())
                    else:
                        f.write(audio.read())
                    audio_path = f.name

                # Ensure audio is a WAV acceptable to Azure STT
                wav_path = convert_to_wav(audio_path)
                stt_engine = get_stt_engine()
                return stt_engine.transcribe(wav_path)
        except Exception:
            # Fall through to uploader/text fallback
            pass

    # 2) File uploader fallback
    st.info("If your browser doesn't support direct recording, upload a short WAV/MP3 file.")
    uploaded = st.file_uploader(
        "Upload recorded audio (WAV/MP3) or type your answer below",
        type=["wav", "mp3", "m4a", "ogg"],
        key=f"u_audio_{max_seconds}"
    )

    if uploaded is not None:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                f.write(uploaded.getbuffer())
                audio_path = f.name

            # convert uploaded audio to WAV if needed
            wav_path = convert_to_wav(audio_path)
            stt_engine = get_stt_engine()
            return stt_engine.transcribe(wav_path)
        except Exception:
            return ""

    # 3) Text fallback
    text = st.text_area("Or type your answer here (fallback)")
    if text and text.strip():
        return text.strip()

    return ""
