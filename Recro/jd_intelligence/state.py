# state.py
from typing import TypedDict, Dict, List


class JDState(TypedDict):
    raw_jd: str

    normalized_jd: str

    role_context: Dict[str, str]

    skill_intelligence: Dict[str, List[str]]

    competency_profile: Dict[str, List[str]]

    interview_requirements: Dict[str, List[str]]



