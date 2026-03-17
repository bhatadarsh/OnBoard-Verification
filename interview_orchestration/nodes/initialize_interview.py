def initialize_interview(state: dict) -> dict:
    """
    Initializes the interview session.
    This node prepares the interview control state before
    any questions are asked.
    """

    # -------------------------
    # Validation (Fail Fast)
    # -------------------------
    if "final_focus_areas" not in state or not state["final_focus_areas"]:
        raise ValueError(
            "Cannot initialize interview: final_focus_areas missing or empty."
        )

    if "candidate_id" not in state:
        raise ValueError(
            "Cannot initialize interview: candidate_id missing."
        )

    # -------------------------
    # Initialize Interview State
    # -------------------------
    first_topic = state["final_focus_areas"][0]["topic"]

    initialized_state = {
        **state,

        # Control indices
        "current_topic_index": 0,
        "current_followup_count": 0,

        # Current context
        "current_topic": first_topic,
        "current_question": None,

        # Interview trace
        "interview_trace": [],

        # Status
        # Start as NOT_STARTED so the Streamlit UI invokes the graph
        # to generate the first question (per contract).
        "interview_status": "NOT_STARTED",
    }

    return initialized_state
