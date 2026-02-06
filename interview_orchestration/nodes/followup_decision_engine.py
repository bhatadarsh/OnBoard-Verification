# def decide_followup_or_next(state: dict) -> dict:
#     """
#     Decides whether to:
#     - ask a follow-up question
#     - move to the next topic
#     - or end the interview
#     """

#     if state.get("interview_status") != "PROCESSING_ANSWER":
#         return state  # Safety guard

#     current_followups = state.get("current_followup_count", 0)
#     current_topic_index = state.get("current_topic_index", 0)
#     focus_areas = state.get("final_focus_areas", [])

#     MAX_FOLLOWUPS_PER_TOPIC = 5

#     # -------------------------
#     # Case 1: Ask follow-up
#     # -------------------------
#     if current_followups < MAX_FOLLOWUPS_PER_TOPIC:
#         return {
#             **state,
#             "interview_status": "ASKING_QUESTION"
#         }

#     # -------------------------
#     # Case 2: Move to next topic
#     # -------------------------
#     next_topic_index = current_topic_index + 1

#     if next_topic_index < len(focus_areas):
#         next_topic = focus_areas[next_topic_index]["topic"]

#         return {
#             **state,
#             "current_topic_index": next_topic_index,
#             "current_followup_count": 0,
#             "current_topic": next_topic,
#             "current_question": None,
#             "interview_status": "ASKING_QUESTION"
#         }

#     # -------------------------
#     # Case 3: End interview
#     # -------------------------
#     return {
#         **state,
#         "interview_status": "COMPLETED"
#     }




def decide_followup_or_next(state: dict) -> dict:
    """
    Decides whether to:
    - ask a follow-up question
    - move to the next topic
    - or end the interview
    """

    if state.get("interview_status") != "PROCESSING_ANSWER":
        return state  # Safety guard

    current_followups = state.get("current_followup_count", 0)
    current_topic_index = state.get("current_topic_index", 0)
    # Support both focus_areas (DB) and final_focus_areas (original graph key)
    focus_areas = state.get("focus_areas") or state.get("final_focus_areas") or []
    
    # TELEMETRY
    print(f"DEBUG: decide_router. status={state.get('interview_status')}, count={current_followups}, topic_idx={current_topic_index}, total_topics={len(focus_areas)}")
    
    MAX_FOLLOWUPS_PER_TOPIC = 5

    # -------------------------
    # Case 1: Ask follow-up
    # -------------------------
    if current_followups < MAX_FOLLOWUPS_PER_TOPIC:
        return {
            **state,
            "next_action": "FOLLOWUP",
            "interview_status": "ASKING_QUESTION"
        }

    # -------------------------
    # Case 2: Move to next topic
    # -------------------------
    next_topic_index = current_topic_index + 1

    if next_topic_index < len(focus_areas):
        next_topic = focus_areas[next_topic_index]["topic"]

        return {
            **state,
            "next_action": "NEXT_TOPIC",
            "current_topic_index": next_topic_index,
            "current_followup_count": 0,
            "current_topic": next_topic,
            "current_question": None,
            "interview_status": "ASKING_QUESTION"
        }

    # -------------------------
    # Case 3: End interview
    # -------------------------
    return {
        **state,
        "next_action": "END",
        "interview_status": "COMPLETED"
    }
