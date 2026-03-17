from datetime import datetime, timedelta

def timer_engine(state: dict) -> dict:
    """
    Enforces read and answer time windows (defaults: 20s read, 45s answer).
    This node does NOT block — it evaluates time and updates state.
    """

    now = datetime.utcnow()
    status = state.get("interview_status")

    # -------------------------
    # Reading phase
    # -------------------------
    if status == "ASKING_QUESTION":
        if state.get("reading_started_at") is None:
            state["reading_started_at"] = now
            return state

        elapsed = (now - state["reading_started_at"]).total_seconds()

        if elapsed >= state.get("read_time_limit", 20):
            state["interview_status"] = "WAITING_FOR_ANSWER"
            state["answering_started_at"] = now

        return state

    # -------------------------
    # Answering phase
    # -------------------------
    if status == "WAITING_FOR_ANSWER":
        if state.get("answering_started_at") is None:
            state["answering_started_at"] = now
            return state

        elapsed = (now - state["answering_started_at"]).total_seconds()

        # Early finish by candidate
        if state.get("early_finish"):
            state["interview_status"] = "PROCESSING_ANSWER"
            return state

        # Hard timeout
        if elapsed >= state.get("answer_time_limit", 45):
            state["interview_status"] = "PROCESSING_ANSWER"
            state["answer_timeout"] = True

        return state

    return state
