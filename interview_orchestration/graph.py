


# # from langgraph.graph import StateGraph, END
# # from interview_orchestration.nodes.followup_decision_engine import decide_followup_or_next
# # from interview_orchestration.state import Stage4State

# # from interview_orchestration.nodes.step_router import step_router
# # from interview_orchestration.nodes.initialize_interview import initialize_interview
# # from interview_orchestration.nodes.ask_initial_question import ask_initial_question
# # from interview_orchestration.nodes.collect_text_answer import collect_text_answer
# # from interview_orchestration.nodes.followup_decision_engine import decide_followup_or_next
# # from interview_orchestration.nodes.followup_question_generator import followup_question_generator

# # graph = StateGraph(Stage4State)

# # def _step_noop(state: dict) -> dict:
# #     # noop node: the conditional selector handles routing
# #     return state

# # graph.add_node("step", _step_noop)
# # graph.add_node("initialize_interview", initialize_interview)
# # graph.add_node("ask_initial_question", ask_initial_question)
# # graph.add_node("collect_text_answer", collect_text_answer)
# # graph.add_node("decide_followup_or_next", decide_followup_or_next)
# # graph.add_node("followup_question_generator", followup_question_generator)


# # graph.set_entry_point("step")

# # def _select_step(state: dict):
# #     status = state.get("interview_status")

# #     if status is None:
# #         return "initialize_interview"
# #     if status == "ASKING_QUESTION":
# #         if state.get("current_followup_count", 0) == 0:
# #             return "ask_initial_question"
# #         return "followup_question_generator"
# #     if status == "WAITING_FOR_ANSWER":
# #         return "collect_text_answer"
# #     if status == "PROCESSING_ANSWER":
# #         return "decide_followup_or_next"
# #     if status == "COMPLETED":
# #         return END
# #     raise ValueError(f"Unknown interview_status: {status}")


# # graph.add_conditional_edges(
# #     "step",
# #     _select_step,
# #     {
# #         "initialize_interview": "initialize_interview",
# #         "ask_initial_question": "ask_initial_question",
# #         "followup_question_generator": "followup_question_generator",
# #         "collect_text_answer": "collect_text_answer",
# #         "decide_followup_or_next": "decide_followup_or_next",
# #         END: END,
# #     }
# # )

# # stage4_graph = graph.compile()



# from langgraph.graph import StateGraph, END
# from interview_orchestration.state import Stage4State

# # -------------------------
# # Import nodes
# # -------------------------
# from interview_orchestration.nodes.step_router import step_router
# from interview_orchestration.nodes.initialize_interview import initialize_interview
# from interview_orchestration.nodes.ask_initial_question import ask_initial_question
# from interview_orchestration.nodes.collect_text_answer import collect_text_answer
# from interview_orchestration.nodes.followup_decision_engine import decide_followup_or_next
# from interview_orchestration.nodes.followup_question_generator import followup_question_generator
# from interview_orchestration.nodes.timer_engine import timer_engine

# # -------------------------
# # Graph
# # -------------------------
# graph = StateGraph(Stage4State)

# # -------------------------
# # Nodes
# # -------------------------
# def _step_noop(state: dict) -> dict:
#     # noop implementation for the step entry node. Routing is handled
#     # by the conditional selector below which returns the next node key.
#     return state

# graph.add_node("step", _step_noop)
# graph.add_node("initialize_interview", initialize_interview)
# graph.add_node("ask_initial_question", ask_initial_question)
# graph.add_node("followup_question_generator", followup_question_generator)
# graph.add_node("timer_engine", timer_engine)
# graph.add_node("collect_text_answer", collect_text_answer)
# graph.add_node("decide_followup_or_next", decide_followup_or_next)

# # -------------------------
# # Entry Point
# # -------------------------
# graph.set_entry_point("step")

# # -------------------------
# # Conditional Routing (SINGLE STEP PER INVOKE)
# # Use a selector function that returns the next node key without
# # invoking node functions (avoids recursion / invalid return types).
# # -------------------------
# def _select_step(state: dict):
#     status = state.get("interview_status")

#     if status is None:
#         return "initialize_interview"
#     if status == "ASKING_QUESTION":
#         if state.get("current_followup_count", 0) == 0:
#             return "ask_initial_question"
#         return "followup_question_generator"
#     if status == "WAITING_FOR_ANSWER":
#         return "collect_text_answer"
#     if status == "PROCESSING_ANSWER":
#         return "decide_followup_or_next"
#     if status == "COMPLETED":
#         return END
#     raise ValueError(f"Unknown interview_status: {status}")


# graph.add_conditional_edges(
#     "step",
#     _select_step,
#     {
#         "initialize_interview": "initialize_interview",
#         "ask_initial_question": "ask_initial_question",
#         "followup_question_generator": "followup_question_generator",
#         "timer_engine": "timer_engine",
#         "collect_text_answer": "collect_text_answer",
#         "decide_followup_or_next": "decide_followup_or_next",
#         END: END,
#     }
# )

# # -------------------------
# # Linear transitions
# # -------------------------
# graph.add_edge("initialize_interview", "step")

# graph.add_edge("ask_initial_question", "timer_engine")
# graph.add_edge("followup_question_generator", "timer_engine")

# graph.add_edge("timer_engine", "step")

# graph.add_edge("collect_text_answer", "timer_engine")

# graph.add_edge("decide_followup_or_next", "step")

# # -------------------------
# # Compile
# # -------------------------
# stage4_graph = graph.compile()


# from langgraph.graph import StateGraph, END
# from interview_orchestration.state import Stage4State

# from interview_orchestration.nodes.ask_initial_question import ask_initial_question
# from interview_orchestration.nodes.collect_text_answer import collect_text_answer
# from interview_orchestration.nodes.cheating_detector import detect_text_cheating
# from interview_orchestration.nodes.followup_decision_engine import decide_followup_or_next
# from interview_orchestration.nodes.followup_question_generator import followup_question_generator

# # -------------------------
# # Graph
# # -------------------------
# graph = StateGraph(Stage4State)

# def _step_noop(state: dict) -> dict:
#     return state

# graph.add_node("step", _step_noop)
# graph.add_node("ask_initial_question", ask_initial_question)
# graph.add_node("collect_text_answer", collect_text_answer)
# graph.add_node("cheating_detection", detect_text_cheating)
# graph.add_node("decide_followup_or_next", decide_followup_or_next)
# graph.add_node("followup_question_generator", followup_question_generator)

# graph.set_entry_point("step")

# # -------------------------
# # Router
# # -------------------------
# def _select_step(state: dict):
#     status = state.get("interview_status")

#     if status in (None, "NOT_STARTED"):
#         return "ask_initial_question"

#     if status == "ASKING_QUESTION":
#         # UI controls reading time → graph pauses
#         return END

#     if status == "WAITING_FOR_ANSWER":
#         return "collect_text_answer"

#     if status == "PROCESSING_ANSWER":
#         return "cheating_detection"

#     if status == "COMPLETED":
#         return END

#     raise ValueError(f"Unknown interview_status: {status}")

# graph.add_conditional_edges(
#     "step",
#     _select_step,
#     {
#         "ask_initial_question": "ask_initial_question",
#         "collect_text_answer": "collect_text_answer",
#         "cheating_detection": "cheating_detection",
#         END: END,
#     }
# )

# # -------------------------
# # Linear chains
# # -------------------------
# graph.add_edge("cheating_detection", "decide_followup_or_next")

# graph.add_conditional_edges(
#     "decide_followup_or_next",
#     lambda s: s.get("next_action", END),
#     {
#         "FOLLOWUP": "followup_question_generator",
#         "NEXT_TOPIC": "ask_initial_question",
#         END: END,
#     }
# )

# graph.add_edge("followup_question_generator", END)
# graph.add_edge("ask_initial_question", END)

# stage4_graph = graph.compile()


from langgraph.graph import StateGraph, END
from interview_orchestration.state import Stage4State

from interview_orchestration.nodes.ask_initial_question import ask_initial_question
from interview_orchestration.nodes.collect_text_answer import collect_text_answer
from interview_orchestration.nodes.cheating_detector import detect_text_cheating
from interview_orchestration.nodes.followup_decision_engine import decide_followup_or_next
from interview_orchestration.nodes.followup_question_generator import followup_question_generator


# =====================================================
# Graph Initialization
# =====================================================
graph = StateGraph(Stage4State)


def _step_noop(state: dict) -> dict:
    """Entry noop node. Routing decides next node."""
    return state


# -------------------------
# Nodes
# -------------------------
graph.add_node("step", _step_noop)
graph.add_node("ask_initial_question", ask_initial_question)
graph.add_node("collect_text_answer", collect_text_answer)
graph.add_node("cheating_detection", detect_text_cheating)
graph.add_node("decide_followup_or_next", decide_followup_or_next)
graph.add_node("followup_question_generator", followup_question_generator)

graph.set_entry_point("step")


# =====================================================
# STEP ROUTER (single-node-per-invoke)
# =====================================================
def _select_step(state: dict):
    status = state.get("interview_status")

    if status in (None, "NOT_STARTED"):
        return "ask_initial_question"

    if status == "ASKING_QUESTION":
        # UI controls timers; graph pauses here
        return None

    if status == "WAITING_FOR_ANSWER":
        return "collect_text_answer"

    if status == "PROCESSING_ANSWER":
        return "cheating_detection"

    if status == "COMPLETED":
        return None

    raise ValueError(f"Unknown interview_status: {status}")


graph.add_conditional_edges(
    "step",
    _select_step,
    {
        "ask_initial_question": "ask_initial_question",
        "collect_text_answer": "collect_text_answer",
        "cheating_detection": "cheating_detection",
        None: END,   # ✅ CORRECT way to signal END
    }
)


# =====================================================
# Linear processing chain
# =====================================================
graph.add_edge("collect_text_answer", "cheating_detection")
graph.add_edge("cheating_detection", "decide_followup_or_next")


# =====================================================
# FOLLOWUP / NEXT TOPIC ROUTER (🔥 FIXED)
# =====================================================
def _decide_router(state: dict):
    """
    IMPORTANT:
    - NEVER return the string 'END'
    - Return None to signal END
    """
    action = state.get("next_action")

    if action == "FOLLOWUP":
        return "FOLLOWUP"

    if action == "NEXT_TOPIC":
        return "NEXT_TOPIC"

    return None   # ✅ clean END


graph.add_conditional_edges(
    "decide_followup_or_next",
    _decide_router,
    {
        "FOLLOWUP": "followup_question_generator",
        "NEXT_TOPIC": "ask_initial_question",
        None: END,   # ✅ THIS prevents KeyError
    }
)


# =====================================================
# After question generation → return control to UI
# =====================================================
graph.add_edge("followup_question_generator", END)
graph.add_edge("ask_initial_question", END)


# =====================================================
# Compile
# =====================================================
stage4_graph = graph.compile()
