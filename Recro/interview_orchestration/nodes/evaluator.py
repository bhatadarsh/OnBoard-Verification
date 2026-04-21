import os
import json
from datetime import datetime
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from backend.config import settings
from backend.database import db
from utils.json_parser import extract_json

def evaluate_interview(state: dict) -> dict:
    """
    Evaluates each answer in the interview trace with high reasoning depth.
    Uses Groq (Llama 3.3 70B) for semantic understanding and standardization.
    """
    trace = state.get("interview_trace", [])
    if not trace:
        return state

    print(f"DEBUG: Starting Answer Evaluation Agent for {len(trace)} turns.")

    # 1. Setup LLM (Groq)
    llm = ChatGroq(
        model="llama-3.1-8b-instant", 
        temperature=0
    )

    # 2. Load Context (Resume & JD)
    candidate_id = state.get("candidate_id")
    # Fetch resume from DB
    resume_obj = next((r for r in db.resumes if r["candidate_id"] == candidate_id), {})
    resume_context = resume_obj.get("extracted_text", "No resume text available")
    
    # Fetch JD from DB
    jd_id = resume_obj.get("job_id")
    jd_obj = db.jds.get(jd_id, {})
    jd_context = jd_obj.get("normalized_jd", "No Job Description available")

    # 3. Load Prompt Template
    prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "answer_evaluation.txt")
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            template = f.read()
    except Exception as e:
        print(f"Error loading evaluation prompt: {e}")
        return state
    
    prompt = PromptTemplate(
        input_variables=["resume_context", "jd_context", "topic", "difficulty", "question_text", "answer_text", "cheating_signals", "answer_id"],
        template=template
    )

    evaluation_reports = []
    total_eval_score = 0.0
    cheating_events = state.get("cheating_events", [])

    # 4. Process each answer
    for i, turn in enumerate(trace):
        turn_id = f"turn_{i+1}"
        
        # Gather cheating signals for this turn as a soft modifier
        signals = next((e for e in cheating_events if e["answer_id"] == turn_id), {})
        cheating_str = "None"
        if signals:
            flags = signals.get("cheating_flags", [])
            impact = signals.get("cheating_score", 0.0)
            if flags:
                cheating_str = f"Flags: {', '.join(flags)} (Score Impact: +{impact})"

        try:
            print(f"DEBUG: Evaluating {turn_id}...")
            response = llm.invoke(
                prompt.format(
                    resume_context=resume_context[:3000],  # Limit context window
                    jd_context=jd_context[:2000],
                    topic=turn.get("topic", "General"),
                    difficulty="Technical/Intermediate", 
                    question_text=turn.get("question", ""),
                    answer_text=turn.get("answer_text", ""),
                    cheating_signals=cheating_str,
                    answer_id=turn_id
                )
            )
            
            eval_data = extract_json(response.content)
            if eval_data:
                # MANDATORY SCORING FLOOR (Safe Guard)
                raw_score = float(eval_data.get("score", 0.0))
                answer_text = turn.get("answer_text", "").strip()
                question_text = turn.get("question", "").strip().lower()

                # Define what constitutes "no attempt"
                no_attempt_phrases = [
                    "(no response)",
                    "n/a",
                    "",
                    "no audio detected",
                    "transcription failed",
                    "silence detected",
                    "no audible response",
                    "empty_audio_content",
                    "audio_persistence_failed",
                    "no_audio_provided"
                ]
                
                # Check if answer is essentially empty or just whitespace
                answer_lower = answer_text.lower()
                
                # Check for system-generated error messages
                is_system_error = (
                    "[timeout]" in answer_lower or
                    "[manual]" in answer_lower or
                    "no audible response captured" in answer_lower or
                    "stt completed" in answer_lower or
                    answer_lower.startswith("[") and "]" in answer_lower  # Any [ERROR] format
                )
                
                is_empty = (
                    not answer_text or 
                    answer_lower in no_attempt_phrases or
                    len(answer_text) < 10 or  # Less than 10 characters is likely not a real attempt
                    answer_lower == question_text.lower() or  # Verbatim question repetition
                    is_system_error  # System-generated error message
                )
                
                # Rule: ONLY apply floor if there was a GENUINE attempt
                if not is_empty and raw_score < 1.0:
                    print(f"DEBUG: Applying scoring floor. Answer '{answer_text[:30]}...' was {raw_score}, bumped to 1.0")
                    eval_data["score"] = 1.0
                    eval_data["reasoning_notes"] = f"(Floor Applied) {eval_data.get('reasoning_notes', '')}"
                elif is_empty and raw_score > 0.0:
                    # Ensure no attempt gets 0.0, not 1.0
                    print(f"DEBUG: No genuine attempt detected. Answer: '{answer_text[:50]}'. Ensuring score is 0.0 (was {raw_score})")
                    eval_data["score"] = 0.0
                    eval_data["reasoning_notes"] = f"No meaningful response provided. {eval_data.get('reasoning_notes', '')}"

                # Attach evaluation directly to the turn for persistence
                turn["evaluation"] = eval_data
                evaluation_reports.append(eval_data)
                total_eval_score += float(eval_data.get("score", 0.0))
        except Exception as e:
            print(f"Error evaluating {turn_id}: {e}")
            error_eval = {
                "answer_id": turn_id,
                "score": 0.0,
                "error": str(e),
                "reasoning_notes": "Evaluation failed due to system error."
            }
            turn["evaluation"] = error_eval
            evaluation_reports.append(error_eval)

    # 5. Aggregate Results
    if trace:
        # Use the AVERAGE score across all turns.
        total = sum(float(report.get("score", 0.0)) for report in evaluation_reports)
        overall_score = total / len(evaluation_reports)
        overall_avg_score = round(overall_score, 2)
    else:
        overall_avg_score = 0.0

    evaluation_section = {
        "overall_score": overall_avg_score,
        "evaluator_ver": "llama-3.1-8b-instant",
        "evaluated_at": datetime.now().isoformat(),
        "per_answer_results": evaluation_reports
    }

    # Store in state (will be persisted to interview_traces by main.py)
    state["evaluation"] = evaluation_section
    
    print(f"DEBUG: Evaluation completed successfully. Overall Score: {overall_avg_score}")

    return state
