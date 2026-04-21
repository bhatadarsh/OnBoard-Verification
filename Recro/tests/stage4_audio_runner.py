
import os
import sys
import time

# Ensure project root is in path
sys.path.insert(0, os.getcwd())

from interview_orchestration.graph import stage4_graph
from interview_orchestration.stt.factory import get_stt_engine

# Simulate Stage 4 Initial State (Manual Initialization since initialize_interview node is missing)
stage4_state = {
    "candidate_id": "REAL_AUDIO_TEST_USER",
    "final_focus_areas": [
        {"topic": "Communication"},
        {"topic": "Python Skills"}
    ],
    "current_topic": "Communication",  # Manually set
    "current_followup_count": 0,
    "interview_status": "NOT_STARTED", # Trigger ask_initial_question
    "stt_engine": get_stt_engine(),    # Inject STT Engine
    
    # Pre-inject audio path 
    "test_audio_input": "test_audio.wav"
}

print("🔹 Initializing Interview Graph...")
state = stage4_graph.invoke(stage4_state, config={"recursion_limit": 50})

print(f"   Status: {state.get('interview_status')}")

# Run until completion or max turns
turns = 0
max_turns = 5

while state.get("interview_status") != "COMPLETED" and turns < max_turns:
    current_status = state.get("interview_status")
    print(f"\n🔄 Turn {turns+1}: Status = {current_status}")

    # Case 1: Graph generated a question and yielded (ASKING_QUESTION)
    # We must simulate the UI transition to WAITING_FOR_ANSWER
    if current_status == "ASKING_QUESTION":
        print(f"   Question: {state.get('current_question')}")
        print("   ⏳ Simulating user reading & answering...")
        state["interview_status"] = "WAITING_FOR_ANSWER"
        continue

    # Case 2: Waiting for answer (after our simulation)
    if current_status == "WAITING_FOR_ANSWER":
        # Inject Audio Input
        audio_path = "test_audio.wav" # Fixed: use local var
        if not os.path.exists(audio_path):
            print("❌ Audio file missing!")
            break

        # Transcribe manually in runner to match UI behavior
        print(f"   🎤 Providing Audio and Transcribing: {audio_path}")
        stt = state.get("stt_engine")
        if not stt:
             stt = get_stt_engine()
        transcript = stt.transcribe(audio_path)
        print(f"   🗣️ Transcript: {transcript}")
        
        state["simulated_answer"] = transcript or "(no response)" # User says ensure not overwritten by None, UI handles this.
        
        # Invoke Graph to Process Answer
        state = stage4_graph.invoke(state, config={"recursion_limit": 50})
        
        # Check if we moved past processing
        # Note: collect_text_answer -> PROCESSING_ANSWER -> cheating_detection -> decide -> ...
        # The invoke might run multiple steps depending on graph edges.
        # Check trace.
        
        traces = state.get("interview_trace", [])
        if traces:
            last_turn = traces[-1]
            print(f"   ✅ Answer Processed!")
            print(f"      Text: {last_turn.get('answer_text')}")
            print(f"      Audio Blob: {last_turn.get('raw_audio_blob')}")
            print("   🛑 Stopping test after one successful turn.")
            break
        else:
            print("   ⚠️ No trace found, something wrong.")
            break
        
    else:
        # Continue graph execution (e.g. generating questions)
        state = stage4_graph.invoke(state, config={"recursion_limit": 50})

    turns += 1

print("\n🏁 Test Completed.")
