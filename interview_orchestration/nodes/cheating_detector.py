from sentence_transformers import SentenceTransformer, util
from langchain_groq import ChatGroq

model = SentenceTransformer("all-MiniLM-L6-v2")

GENERIC_PHRASES = [
    "it depends",
    "based on the use case",
    "there are multiple approaches",
    "scalability and performance",
]

def detect_text_cheating(state: dict) -> dict:
    trace = state.get("interview_trace", [])
    if not trace:
        return state

    last_turn = trace[-1]
    question = last_turn["question"]
    answer = last_turn["answer_text"]

    flags = []
    severity = 0.0

    # -------------------------
    # 1. Question repetition
    # -------------------------
    q_emb = model.encode(question, normalize_embeddings=True)
    a_emb = model.encode(answer, normalize_embeddings=True)
    sim = util.cos_sim(q_emb, a_emb).item()

    if sim > 0.85:
        flags.append("REPEATED_QUESTION")
        severity += 0.4

    # -------------------------
    # 2. Very short / stalling
    # -------------------------
    if len(answer.split()) < 12:
        flags.append("TOO_SHORT")
        severity += 0.2

    # -------------------------
    # 3. Generic answer
    # -------------------------
    for phrase in GENERIC_PHRASES:
        if phrase in answer.lower():
            flags.append("GENERIC_ANSWER")
            severity += 0.2
            break

    # -------------------------
    # 4. LLM relevance check
    # -------------------------
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

    relevance_prompt = f"""
You are judging interview answers.

Question:
{question}

Answer:
{answer}

Is the answer actually addressing the question?
Reply with YES or NO only.
"""

    relevance = llm.invoke(relevance_prompt).content.strip()

    if relevance == "NO":
        flags.append("OFF_TOPIC")
        severity += 0.3

    # -------------------------
    # Update state
    # -------------------------
    event = {
        "topic": state.get("current_topic"),
        "question": question,
        "answer": answer,
        "flags": flags,
        "severity": round(severity, 2)
    }

    state.setdefault("cheating_events", []).append(event)
    state["cheating_score"] = round(
        state.get("cheating_score", 0) + severity, 2
    )

    if severity >= 0.5:
        state.setdefault("warnings", []).append(
            "Please focus on answering the question directly."
        )

    return state
