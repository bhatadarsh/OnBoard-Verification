# from typing import TypedDict, List, Dict, Literal, Optional
# from datetime import datetime


# # -------------------------
# # Interview Turn
# # -------------------------
# class InterviewTurn(TypedDict):
#     topic: str
#     question: str
#     answer_text: str
#     followup_index: int
#     question_type: Literal["initial", "followup"]
#     timestamp: Optional[float]


# # -------------------------
# # Cheating Event
# # -------------------------
# class CheatingEvent(TypedDict):
#     topic: str
#     question: str
#     answer: str
#     flags: List[str]
#     severity: float


# # -------------------------
# # Stage 4 State
# # -------------------------
# class Stage4State(TypedDict, total=False):
#     """
#     State for Interview Orchestration (Stage 4)
#     """

#     # -------------------------
#     # Inputs (from Stage 3)
#     # -------------------------
#     candidate_id: str
#     final_focus_areas: List[Dict]

#     # -------------------------
#     # Interview Control State
#     # -------------------------
#     current_topic_index: int
#     current_followup_count: int
#     current_question: Optional[str]
#     current_topic: Optional[str]

#     # -------------------------
#     # Interview Trace
#     # -------------------------
#     interview_trace: List[InterviewTurn]

#     # -------------------------
#     # Interview Status
#     # -------------------------
#     interview_status: Literal[
#         "NOT_STARTED",
#         "ASKING_QUESTION",
#         "WAITING_FOR_ANSWER",
#         "PROCESSING_ANSWER",
#         "COMPLETED"
#     ]

#     # -------------------------
#     # Timing (Stage 4 – Timers)
#     # -------------------------
#     reading_started_at: Optional[datetime]
#     answering_started_at: Optional[datetime]

#     read_time_limit: int        # seconds (default set in init node)
#     answer_time_limit: int      # seconds (default set in init node)
#     early_finish: bool

#     # -------------------------
#     # Stage 5 – Cheating Detection
#     # -------------------------
#     cheating_events: List[CheatingEvent]
#     cheating_score: float
#     warnings: List[str]



from typing import TypedDict, List, Dict, Literal, Optional, Any
from datetime import datetime


class InterviewTurn(TypedDict):
    topic: str
    question: str
    answer_text: str
    followup_index: int
    question_type: Literal["initial", "followup"]
    timestamp: float


class Stage4State(TypedDict, total=False):
    # -------------------------
    # Inputs
    # -------------------------
    candidate_id: str
    final_focus_areas: List[Dict]

    # -------------------------
    # Control
    # -------------------------
    current_topic_index: int
    current_followup_count: int
    current_topic: Optional[str]
    current_question: Optional[str]

    # -------------------------
    # Timing
    # -------------------------
    read_time_limit: int          # 20
    answer_time_limit: int        # 45
    reading_started_at: Optional[float]
    answering_started_at: Optional[float]
    early_finish: bool

    # -------------------------
    # Interview trace
    # -------------------------
    interview_trace: List[InterviewTurn]

    # -------------------------
    # Status
    # -------------------------
    interview_status: Literal[
        "NOT_STARTED",
        "ASKING_QUESTION",
        "WAITING_FOR_ANSWER",
        "PROCESSING_ANSWER",
        "COMPLETED"
    ]

    # -------------------------
    # Cheating (used later)
    # -------------------------
    cheating_events: List[Dict]
    cheating_score: float

    # -------------------------
    # Audio / System State
    # -------------------------
    # -------------------------
    # Audio / System State
    # -------------------------
    # These internal fields allow passing audio and engines between nodes
    audio_path: Optional[str]
    simulated_audio_blob: Optional[str]
    stt_engine: Any
    simulated_answer: Optional[str]  # Holds the transcribed text from UI or testing
