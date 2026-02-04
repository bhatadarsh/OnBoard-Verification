# import time


# def collect_text_answer(state: dict) -> dict:
#     """
#     Collects the candidate's answer in TEXT MODE.
#     Appends the answer to the interview trace.
#     """

#     # -------------------------
#     # Phase validation
#     # -------------------------
#     if state.get("interview_status") != "WAITING_FOR_ANSWER":
#         return state  # Safety: do nothing if not waiting for answer

#     current_question = state.get("current_question")
#     current_topic = state.get("current_topic")

#     if not current_question or not current_topic:
#         raise ValueError("Cannot collect answer: missing question or topic.")

#     # -------------------------
#     # TEXT MODE: simulated answer
#     # (later replaced by speech-to-text output)
#     # -------------------------
#     answer_text = state.get(
#         "simulated_answer",
#         "This is a placeholder answer provided in text mode."
#     )

#     followup_index = state.get("current_followup_count", 0)

#     # Determine question type
#     question_type = "initial" if followup_index == 0 else "followup"

#     # -------------------------
#     # Create interview turn
#     # -------------------------
#     interview_turn = {
#         "topic": current_topic,
#         "question": current_question,
#         "answer_text": answer_text,
#         "followup_index": followup_index,
#         "question_type": question_type,
#         "timestamp": time.time()
#     }

#     # -------------------------
#     # Append to interview trace
#     # -------------------------
#     interview_trace = state.get("interview_trace", [])
#     interview_trace.append(interview_turn)

#     return {
#         **state,
#         "interview_trace": interview_trace,

#         # Increment follow-up count
#         "current_followup_count": followup_index + 1,

#         # Move to processing phase
#         "interview_status": "PROCESSING_ANSWER"
#     }



# def collect_text_answer(state: dict) -> dict:
#     """
#     Collects candidate answer from either:
#     - simulated text
#     - real audio (via STT adapter)
#     """

#     # Case 1: Simulated / typed answer (current behavior)
#     if "simulated_answer" in state:
#         answer_text = state.pop("simulated_answer")

#     # Case 2: Audio answer (NEW)
#     elif "audio_path" in state and "stt_engine" in state:
#         answer_text = state["stt_engine"].transcribe(state["audio_path"])

#     else:
#         raise RuntimeError("No answer source provided")

#     state["interview_trace"][-1]["answer_text"] = answer_text
#     state["interview_status"] = "PROCESSING_ANSWER"

#     return state




# import time

# def collect_text_answer(state: dict) -> dict:
#     now = time.time()

#     # -------------------------
#     # Reading window enforcement
#     # -------------------------
#     if state.get("answering_started_at") is None:
#         if now - state["reading_started_at"] < state["read_time_limit"]:
#             # Still reading — do nothing
#             return state

#         # Reading done → start answer window
#         state["answering_started_at"] = now
#         return state

#     # -------------------------
#     # Answer collection and timeout handling
#     # -------------------------
#     # Case A: Candidate submitted an answer (simulated or recorded)
#     if "simulated_answer" in state:
#         answer = state.pop("simulated_answer").strip()

#         followup_index = state.get("current_followup_count", 0)

#         interview_turn = {
#             "topic": state.get("current_topic"),
#             "question": state.get("current_question"),
#             "answer_text": answer,
#             "followup_index": followup_index,
#             "question_type": "initial" if followup_index == 0 else "followup",
#             "timestamp": now
#         }

#         interview_trace = state.get("interview_trace", [])
#         interview_trace.append(interview_turn)

#         return {
#             **state,
#             "interview_trace": interview_trace,
#             "current_followup_count": followup_index + 1,
#             "interview_status": "PROCESSING_ANSWER",
#         }

#     # Case B: Answer window expired
#     if state.get("answering_started_at") is not None:
#         elapsed = now - state["answering_started_at"]
#         if elapsed > state.get("answer_time_limit", 45):
#             followup_index = state.get("current_followup_count", 0)

#             answer = state.get("simulated_answer", "(no response)").strip()

#             interview_turn = {
#                 "topic": state.get("current_topic"),
#                 "question": state.get("current_question"),
#                 "answer_text": answer,
#                 "followup_index": followup_index,
#                 "question_type": "initial" if followup_index == 0 else "followup",
#                 "timestamp": now
#             }

#             interview_trace = state.get("interview_trace", [])
#             interview_trace.append(interview_turn)

#             return {
#                 **state,
#                 "interview_trace": interview_trace,
#                 "current_followup_count": followup_index + 1,
#                 "interview_status": "PROCESSING_ANSWER",
#             }

#     # Still waiting for answer or in reading window
#     return state


import time


def collect_text_answer(state: dict) -> dict:
    """
    Collects candidate answer (text or speech-to-text),
    appends interview trace, and moves to PROCESSING_ANSWER.
    """

    # -------------------------
    # Guard: only act when waiting for answer
    # -------------------------
    if state.get("interview_status") != "WAITING_FOR_ANSWER":
        return state

    current_question = state.get("current_question")
    current_topic = state.get("current_topic")

    if not current_question or not current_topic:
        # Safety: do not crash the graph
        return {
            **state,
            "interview_status": "PROCESSING_ANSWER"
        }

    # -------------------------
    # Resolve answer source
    # -------------------------
    if "simulated_answer" in state:
        answer_text = state.pop("simulated_answer").strip()

    elif "audio_path" in state and "stt_engine" in state:
        answer_text = state["stt_engine"].transcribe(state["audio_path"]).strip()

    else:
        # No answer provided (timeout or silence)
        answer_text = "(no response)"

    now = time.time()
    followup_index = state.get("current_followup_count", 0)

    interview_turn = {
        "topic": current_topic,
        "question": current_question,
        "answer_text": answer_text,
        "followup_index": followup_index,
        "question_type": "initial" if followup_index == 0 else "followup",
        "timestamp": now
    }

    interview_trace = state.get("interview_trace", [])
    interview_trace.append(interview_turn)

    # -------------------------
    # Move forward
    # -------------------------
    return {
        **state,
        "interview_trace": interview_trace,
        "current_followup_count": followup_index + 1,
        "interview_status": "PROCESSING_ANSWER",
        # timers are UI-controlled, reset them
        "reading_started_at": None,
        "answering_started_at": None,
    }
