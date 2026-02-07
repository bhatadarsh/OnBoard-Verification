import os
import time
import cv2
import numpy as np
import base64
from ultralytics import YOLO
from sentence_transformers import SentenceTransformer, util
from langchain_groq import ChatGroq
from typing import List, Dict, Optional

# Load models (Singleton style)
_text_model = SentenceTransformer("all-MiniLM-L6-v2")
_yolo_model = YOLO("yolov8n.pt") # Small, fast for CPU/background

GENERIC_PHRASES = [
    "it depends",
    "based on the use case",
    "there are multiple approaches",
    "scalability and performance",
    "industry standard",
    "best practices",
]

def detect_misconduct(state: dict, current_answer: str, time_taken: float, video_frames: Optional[List[str]] = None) -> dict:
    """
    Main entry point for cheating detection.
    Called asynchronously after each answer or during interview flow.
    """
    flags = []
    cheating_score = 0.0
    
    trace = state.get("interview_trace", [])
    if not trace:
        return {"flags": [], "score": 0.0, "warnings": []}

    last_turn = trace[-1]
    question = last_turn.get("question", "")
    
    # ------------------------------------------------
    # MODE 1: TEXT / RESPONSE BEHAVIOR ANALYSIS
    # ------------------------------------------------
    
    # 1. TOO_FAST detection
    word_count = len(current_answer.split())
    # Heuristic: Average speech rate is 2.5 words/sec. 
    # If it's faster than 6 words/sec, it's suspicious (likely copy-pasted or scripted)
    if word_count > 10 and time_taken > 0:
        words_per_sec = word_count / time_taken
        if words_per_sec > 6.0:
            flags.append("TOO_FAST")
            cheating_score += 0.3

    # 2. QUESTION_REPEATING
    q_emb = _text_model.encode(question, normalize_embeddings=True)
    a_emb = _text_model.encode(current_answer, normalize_embeddings=True)
    sim = util.cos_sim(q_emb, a_emb).item()
    if sim > 0.85:
        flags.append("QUESTION_REPEATING")
        cheating_score += 0.4

    # 3. SIMILAR_PATTERN (Across previous answers)
    if len(trace) > 1:
        prev_answers = [t["answer_text"] for t in trace[:-1]]
        for prev_a in prev_answers:
            prev_emb = _text_model.encode(prev_a, normalize_embeddings=True)
            p_sim = util.cos_sim(a_emb, prev_emb).item()
            if p_sim > 0.9:
                flags.append("SIMILAR_PATTERN")
                cheating_score += 0.3
                break

    # 4. AI_GENERATED_SUSPICION (Generic phrases + LLM check)
    generic_count = sum(1 for p in GENERIC_PHRASES if p in current_answer.lower())
    if generic_count >= 2:
        flags.append("AI_GENERATED_SUSPECTED")
        cheating_score += 0.2

    # ------------------------------------------------
    # MODE 2: VIDEO / VISUAL MONITORING
    # ------------------------------------------------
    if video_frames:
        visual_flags = _analyze_visuals(video_frames)
        flags.extend(visual_flags)
        if "HUMAN_DETECTED" in visual_flags:
            cheating_score += 0.5
        if "MOBILE_USAGE_DETECTED" in visual_flags:
            cheating_score += 0.6
        if "NOT_IN_FRAME" in visual_flags:
            cheating_score += 0.2
        if "SUSPICIOUS_OBJECT_DETECTED" in visual_flags:
            cheating_score += 0.3

    # ------------------------------------------------
    # MODE 3: AUDIO / SPEECH (Partial implementation)
    # ------------------------------------------------
    if "[TIMEOUT]" in current_answer and len(current_answer) > 20:
        # Long silence followed by fluent response (if we had the segments)
        pass

    # ------------------------------------------------
    # Final Warnings
    # ------------------------------------------------
    warnings = []
    total_score = state.get("cheating_score", 0.0) + cheating_score
    
    if cheating_score > 0.4:
        warnings.append("Please ensure you answer independently without external assistance.")
    elif total_score > 1.5:
        warnings.append("Note: Consistent suspicious behavior may impact your final evaluation.")

    return {
        "flags": list(set(flags)),
        "score": round(cheating_score, 2),
        "warnings": warnings,
        "timestamp": time.time()
    }

def _analyze_visuals(frames_b64: List[str]) -> List[str]:
    flags = []
    person_counts = []
    mobile_detected = False

    for img_b64 in frames_b64:
        try:
            # Decode image
            img_data = base64.b64decode(img_b64.split(",")[-1])
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            # Run YOLO
            results = _yolo_model(frame, verbose=False)[0]
            
            # 1. Count persons
            people = [r for r in results.boxes if results.names[int(r.cls[0])].lower() == "person"]
            person_counts.append(len(people))

            # 2. Detect Cell Phones
            phones = [r for r in results.boxes if results.names[int(r.cls[0])].lower() in ["cell phone", "phone"] and r.conf[0] > 0.5]
            if phones:
                mobile_detected = True

            # 3. Detect Suspicious Objects (laptop, book, remote)
            suspicious_classes = ["laptop", "book", "remote"]
            found_suspicious = [r for r in results.boxes if results.names[int(r.cls[0])].lower() in suspicious_classes and r.conf[0] > 0.4]
            if found_suspicious:
                flags.append("SUSPICIOUS_OBJECT_DETECTED")
            
            if len(people) > 1 or phones:
                print(f"DEBUG: Visual match! People: {len(people)}, Phone: {bool(phones)}")
        except Exception as e:
            print(f"Error analyzing frame: {e}")

    if person_counts:
        if max(person_counts) > 1:
            flags.append("HUMAN_DETECTED")
        if min(person_counts) == 0:
            flags.append("NOT_IN_FRAME")
    
    if mobile_detected:
        flags.append("MOBILE_USAGE_DETECTED")

    return flags

def detect_text_cheating(state: dict) -> dict:
    """
    Graph Node implementation (Backward Compatible wrapper)
    """
    trace = state.get("interview_trace", [])
    if not trace:
        return state

    last_turn = trace[-1]
    answer = last_turn.get("answer_text", "")
    
    # Calculate time taken if available
    # We'll use a conservative default if not provided
    time_taken = state.get("time_taken", 30.0) 
    
    # Get buffered video frames for this question if any
    video_frames = state.get("buffered_video_frames", [])

    result = detect_misconduct(state, answer, time_taken, video_frames)
    
    # Update state only if there's actual misconduct to report
    if result["flags"] or result["score"] > 0:
        event = {
            "answer_id": f"turn_{len(trace)}",
            "cheating_flags": result["flags"],
            "cheating_score": result["score"],
            "timestamp": result["timestamp"]
        }
        state.setdefault("cheating_events", []).append(event)
        print(f"DEBUG: Misconduct recorded for turn {len(trace)}: {result['flags']}")
    
    state["cheating_score"] = round(state.get("cheating_score", 0) + result["score"], 2)
    
    if result["warnings"]:
        state.setdefault("warnings", []).extend(result["warnings"])
        state["latest_warning"] = result["warnings"][-1]

    # Clean up buffered frames for next question
    state["buffered_video_frames"] = []
    
    return state
