import streamlit as st
import tempfile
import os

st.title("Simple Audio Input Test")
st.write("Streamlit version:", st.__version__)

if hasattr(st, "audio_input"):
    audio = st.audio_input("Record a short clip (5s)")
    st.write("audio object:", type(audio))
    if audio is not None:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as f:
            try:
                if hasattr(audio, "getbuffer"):
                    f.write(audio.getbuffer())
                else:
                    f.write(audio.read())
            except Exception:
                try:
                    audio.seek(0)
                    f.write(audio.read())
                except Exception:
                    pass
            path = f.name
        st.success(f"Saved audio to: {path}")
        try:
            st.audio(path)
        except Exception:
            pass
else:
    st.info("`st.audio_input` not available in this Streamlit build.")
    uploaded = st.file_uploader("Upload audio (wav/mp3)", type=["wav", "mp3", "m4a", "ogg", "webm"])
    if uploaded:
        st.write("Uploaded:", type(uploaded))
        try:
            st.audio(uploaded)
        except Exception:
            pass
