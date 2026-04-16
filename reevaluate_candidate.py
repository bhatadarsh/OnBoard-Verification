import os
import sys
from dotenv import load_dotenv

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from backend.database import db
from interview_orchestration.nodes.evaluator import evaluate_interview

def reevaluate(candidate_id: int):
    # Find the interview for this candidate
    interview = next((i for i in db.interviews if str(i["candidate_id"]) == str(candidate_id)), None)
    if not interview:
        print(f"Interview for candidate {candidate_id} not found.")
        return

    print(f"Re-evaluating candidate {candidate_id}...")
    
    # Prepare state for evaluate_interview
    state = {
        "candidate_id": candidate_id,
        "interview_trace": interview.get("interview_trace", []),
        "cheating_events": interview.get("cheating_events", [])
    }
    
    # Run evaluation
    updated_state = evaluate_interview(state)
    
    # Update interview in DB
    interview["evaluation"] = updated_state["evaluation"]
    
    # Save to disk
    db.save()
    print(f"Successfully re-evaluated candidate {candidate_id}. New score: {interview['evaluation']['overall_score']}")

if __name__ == "__main__":
    load_dotenv()
    if len(sys.argv) < 2:
        print("Usage: python reevaluate_candidate.py <candidate_id>")
        sys.exit(1)
    
    cand_id = int(sys.argv[1])
    reevaluate(cand_id)
