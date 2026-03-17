from langgraph.graph import END


def step_router(state: dict) -> str:
    """
    Routes execution to the correct node based on interview_status.
    This ensures ONE logical step per graph invocation.
    """

    status = state.get("interview_status")

    if status is None:
        return "initialize_interview"

    if status == "ASKING_QUESTION":
        # Decide whether initial or follow-up question
        if state.get("current_followup_count", 0) == 0:
            return "ask_initial_question"
        return "followup_question_generator"

    if status == "WAITING_FOR_ANSWER":
        return "collect_text_answer"

    if status == "PROCESSING_ANSWER":
        return "decide_followup_or_next"

    if status == "COMPLETED":
        return END

    raise ValueError(f"Unknown interview_status: {status}")
