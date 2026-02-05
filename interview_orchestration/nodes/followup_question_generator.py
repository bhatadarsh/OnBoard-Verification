from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
import time


def followup_question_generator(state: dict) -> dict:
    """
    Generates a context-aware follow-up question
    based on the candidate's previous answer.
    """

    if state.get("interview_status") != "ASKING_QUESTION":
        return state  # Safety guard

    topic = state.get("current_topic")
    followup_index = state.get("current_followup_count", 0)
    interview_trace = state.get("interview_trace", [])
     
    if not topic or not interview_trace:
    # Skip follow-up and go back to decision engine safely
        return {
            **state,
            "interview_status": "PROCESSING_ANSWER"
        }
 

    last_turn = interview_trace[-1]
    last_answer = last_turn["answer_text"]

    # -------------------------
    # Depth guidance by follow-up index
    # -------------------------
    depth_guidance = {
        1: "Ask for clarification or concrete example.",
        2: "Ask about implementation details.",
        3: "Ask about design decisions and reasoning.",
        4: "Ask about tradeoffs, failures, or challenges.",
        5: "Ask how they would improve or scale the system."
    }

    guidance = depth_guidance.get(
        followup_index,
        "Ask a deeper, non-repetitive question based on the answer."
    )

    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.25
    )

    prompt = PromptTemplate(
        input_variables=["topic", "answer", "guidance"],
        template="""
You are a senior technical interviewer.

Your task is to ask ONE follow-up interview question.

Context:
- Interview topic: {topic}
- Candidate's last answer: {answer}

Follow-up guidance:
{guidance}

Rules:
- Ask only ONE question
- Do NOT repeat earlier questions
- Do NOT ask definitions
- Do NOT ask multi-part questions
- Keep the question readable in under 15 seconds
- Be natural and professional

Return ONLY the question text.
"""
    )

    response = llm.invoke(
        prompt.format(
            topic=topic,
            answer=last_answer,
            guidance=guidance
        )
    )

    followup_question = response.content.strip()

    # Return to the ASKING_QUESTION phase so the UI shows the
    # reading window before moving to the answer phase. This
    # keeps behavior consistent with initial questions.
    return {
        **state,
        "current_question": followup_question,
        "interview_status": "ASKING_QUESTION",
        "reading_started_at": time.time(),
        "answering_started_at": None,
        "early_finish": False,
        "read_time_limit": state.get("read_time_limit", 20),
        "answer_time_limit": state.get("answer_time_limit", 45),
    }
