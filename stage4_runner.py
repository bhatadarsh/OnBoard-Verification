from interview_orchestration.graph import stage4_graph

# Minimal Stage 4 state copied from run_stage2.py test block
stage4_state = {
    "candidate_id": "CAND_001",
    "final_focus_areas": [
        {"topic": "design and build restful backend apis"},
        {"topic": "design and optimize relational database schemas"},
        {"topic": "implement authentication and authorization"}
    ]
}

SIMULATED_ANSWERS = [
    "I designed REST APIs using FastAPI with proper versioning and error handling.",
    "I optimized the schema by normalizing core tables and adding indexes where needed.",
    "We used JWT-based authentication with role-based access control."
]

answer_index = 0

state = stage4_graph.invoke(stage4_state, config={"recursion_limit": 200})

while state.get("interview_status") != "COMPLETED":
    if state.get("interview_status") == "WAITING_FOR_ANSWER":
        print("Q:", state.get("current_question"))
        state["simulated_answer"] = SIMULATED_ANSWERS[
            min(answer_index, len(SIMULATED_ANSWERS) - 1)
        ]
        answer_index += 1
        state = stage4_graph.invoke(state, config={"recursion_limit": 200})
    else:
        state = stage4_graph.invoke(state, config={"recursion_limit": 200})

print('\nINTERVIEW TRACE:')
for turn in state.get("interview_trace", []):
    print(turn)
