import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from interview_orchestration.nodes.collect_text_answer import collect_text_answer
from interview_orchestration.stt.azure_stt import AzureSpeechToText

class TestStage4AudioFlow(unittest.TestCase):
    def setUp(self):
        self.mock_stt = MagicMock(spec=AzureSpeechToText)
        self.mock_stt.transcribe.return_value = "This is a transcribed answer."
        
        self.state = {
            "interview_status": "WAITING_FOR_ANSWER",
            "current_question": "Tell me about yourself.",
            "current_topic": "Intro",
            "candidate_id": "TEST_CANDIDATE",
            "audio_path": "fake_audio.wav",
            "stt_engine": self.mock_stt,
            "interview_trace": []
        }

    @patch("streamlit_app.storage.azure_store.save_raw_audio")
    def test_collect_text_answer_audio_flow(self, mock_save_audio):
        # Setup mock return for save_audio
        mock_save_audio.return_value = "https://azure.blob/container/fake_audio.wav"
        
        # Execute
        new_state = collect_text_answer(self.state)
        
        # Verify STT was called
        self.mock_stt.transcribe.assert_called_once_with("fake_audio.wav")
        
        # Verify Azure Upload was called
        mock_save_audio.assert_called_once_with("TEST_CANDIDATE", "fake_audio.wav")
        
        # Verify Trace
        trace = new_state["interview_trace"]
        self.assertEqual(len(trace), 1)
        self.assertEqual(trace[0]["answer_text"], "This is a transcribed answer.")
        self.assertEqual(trace[0]["raw_audio_blob"], "https://azure.blob/container/fake_audio.wav")
        
        print("✅ Stage 4 Audio Flow Verified: Audio uploaded & Transcribed.")

if __name__ == "__main__":
    unittest.main()
