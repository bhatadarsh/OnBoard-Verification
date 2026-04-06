# interview_orchestration/stt/whisper_engine.py

import os
import time
import logging
from faster_whisper import WhisperModel, BatchedInferencePipeline
from interview_orchestration.stt.base import SpeechToTextEngine

logger = logging.getLogger(__name__)


class WhisperSpeechToText(SpeechToTextEngine):
    """
    Drop-in replacement for AzureSpeechToText.
    - Implements the same SpeechToTextEngine base class
    - Same transcribe(audio_path: str) -> str signature
    - Model loads ONCE at __init__, reused for every call (same as Azure SDK pattern)
    - Fully local — no API keys, no network calls during transcription
    """

    def __init__(self):
        model_size   = os.getenv("WHISPER_MODEL",   "large-v3-turbo")
        device       = os.getenv("WHISPER_DEVICE",  "cpu")     # "cuda" on EC2
        compute_type = os.getenv("WHISPER_COMPUTE", "int8")    # "float16" on GPU
        cpu_threads  = int(os.getenv("WHISPER_CPU_THREADS", "8"))
        self.language = os.getenv("WHISPER_LANGUAGE", "en")    # match Azure's "en-US"

        logger.info(f"[WhisperSTT] Loading model={model_size} device={device} compute={compute_type}")
        print(f"DEBUG: WhisperSTT loading model={model_size}, device={device}")

        model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
            cpu_threads=cpu_threads,
            num_workers=2,
            # Model cached here permanently — survives restarts, no re-download
            download_root=os.getenv("WHISPER_MODEL_DIR", None)  # None = default HF cache
        )

        use_batched = os.getenv("WHISPER_BATCHED", "false").lower() == "true"
        self.pipeline = BatchedInferencePipeline(model) if use_batched else model

        logger.info("[WhisperSTT] Model ready.")
        print("DEBUG: WhisperSTT model loaded and ready.")

    def transcribe(self, audio_path: str) -> str:
        """
        Exact same signature as AzureSpeechToText.transcribe().
        Returns plain text string, or "" on failure — matching Azure behavior.
        """

        # ── Same sanity checks as Azure version ────────────────────────────
        if not audio_path or not os.path.exists(audio_path):
            raise RuntimeError(f"Audio file does not exist: {audio_path}")

        try:
            size = os.path.getsize(audio_path)
            print(f"DEBUG: WhisperSTT starting. File: {audio_path}, Size: {size} bytes")
        except Exception as e:
            print(f"DEBUG: Could not get file size: {e}")

        # ── Transcribe ──────────────────────────────────────────────────────
        try:
            t0 = time.time()

            segments, info = self.pipeline.transcribe(
                audio_path,
                beam_size=5,
                best_of=5,
                patience=1.0,
                language=self.language,             # "en" — skip auto-detect overhead
                condition_on_previous_text=True,    # coherence across segments
                vad_filter=True,                    # replaces Azure's silence timeouts
                vad_parameters=dict(
                    min_silence_duration_ms=3000,   # matches Azure's 3s end-silence
                    speech_pad_ms=400,
                ),
                word_timestamps=False,              # not needed for plain text output
            )

            full_text = " ".join(
                segment.text.strip() for segment in segments
            ).strip()

            elapsed = time.time() - t0
            rtf = elapsed / info.duration if info.duration > 0 else 0

            print(f"DEBUG: WhisperSTT Success: '{full_text}'")
            print(f"DEBUG: WhisperSTT lang={info.language} ({info.language_probability:.0%}), "
                  f"audio={info.duration:.1f}s, processing={elapsed:.1f}s, RTF={rtf:.2f}x")

            return full_text

        except Exception as e:
            # Mirror Azure behavior: log and return "" instead of crashing the caller
            print(f"DEBUG: WhisperSTT Error: {e}")
            logger.error(f"[WhisperSTT] Transcription failed: {e}", exc_info=True)
            return ""