import os
import tempfile
import shutil
import subprocess


def convert_to_wav(input_path: str) -> str:
    """Convert input audio to 16kHz mono WAV using ffmpeg if available.

    If ffmpeg is not found or conversion fails, returns the original path.
    """
    if not input_path or not os.path.exists(input_path):
        return input_path

    # already a wav
    if input_path.lower().endswith('.wav'):
        return input_path

    ffmpeg_bin = shutil.which('ffmpeg')
    if not ffmpeg_bin:
        return input_path

    out_fd, out_path = tempfile.mkstemp(suffix='.wav')
    os.close(out_fd)

    cmd = [
        ffmpeg_bin,
        '-y',
        '-i', input_path,
        '-ar', '16000',
        '-ac', '1',
        out_path,
    ]

    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return out_path
    except Exception:
        try:
            os.remove(out_path)
        except Exception:
            pass
        return input_path
