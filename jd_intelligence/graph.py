from langgraph.graph import StateGraph
from jd_intelligence.state import JDState
from jd_intelligence.nodes.normalize_jd import normalize_jd
from jd_intelligence.nodes.role_context import infer_role_context
from jd_intelligence.nodes.skill_intelligence import extract_skill_intelligence
from jd_intelligence.nodes.competency_model import extract_competency_profile
from jd_intelligence.nodes.interview_filter import filter_interview_requirements



graph = StateGraph(JDState)

graph.add_node("normalize", normalize_jd)
graph.add_node("role_context", infer_role_context)
graph.add_node("skill_intelligence", extract_skill_intelligence)
graph.add_node("competency_model", extract_competency_profile)
graph.add_node("interview_filter", filter_interview_requirements)


graph.set_entry_point("normalize")
graph.add_edge("normalize", "role_context")
graph.add_edge("role_context", "skill_intelligence")
graph.add_edge("skill_intelligence", "competency_model")
graph.add_edge("competency_model", "interview_filter")


jd_graph = graph.compile()
