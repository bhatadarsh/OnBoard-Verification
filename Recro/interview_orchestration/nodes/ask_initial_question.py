from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
import time


def ask_initial_question(state: dict) -> dict:
    """
    Generates the opening interview question for the current topic.
    The question must be:
    - Single-part
    - Experience-focused
    - Readable within 12–15 seconds
    """

    # Allow this node to run when the UI invokes the graph from NOT_STARTED
    # so the graph can produce the first question. If the status is neither
    # NOT_STARTED nor ASKING_QUESTION, do nothing.
    if state.get("interview_status") not in ("NOT_STARTED", "ASKING_QUESTION"):
        return state  # Safety: do nothing if not in correct phase

    topic = state.get("current_topic")

    if not topic:
        raise ValueError("Cannot ask question: current_topic missing.")

    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.2
    )

    prompt = PromptTemplate(
        input_variables=["topic"],
        template="""
You are a senior technical interviewer.

Generate ONE opening interview question for the topic below.

Rules:
- Ask only ONE question
- Do NOT ask multi-part questions
- Do NOT ask definitions
- Focus on real-world experience
- The question must be readable in under 15 seconds
- Use simple, professional language

Topic:
{topic}

Return ONLY the question text.
"""
    )

    response = llm.invoke(
        prompt.format(topic=topic)
    )

    question = response.content.strip()

    # Keep the interview in ASKING_QUESTION so the UI can render the
    # question and let the user click to start answering.
    return {
        **state,
        "current_question": question,
        "interview_status": "ASKING_QUESTION",
        "reading_started_at": time.time(),
        "answering_started_at": None,
        "early_finish": False,
        "read_time_limit": 20,
        "answer_time_limit": 45,
    }
