from langgraph.graph import StateGraph
from resume_intelligence.state import ResumeState

from resume_intelligence.nodes.normalize_resume import normalize_resume
from resume_intelligence.nodes.resume_claims import extract_resume_claims
from resume_intelligence.nodes.evidence_mapping import map_evidence
from resume_intelligence.nodes.semantic_matcher import semantic_match
from resume_intelligence.nodes.exaggeration_penalty import compute_exaggeration_penalty
from resume_intelligence.nodes.final_scoring import final_scoring_and_shortlisting

graph = StateGraph(ResumeState)

graph.add_node("normalize_resume", normalize_resume)
graph.add_node("resume_claims", extract_resume_claims)
graph.add_node("evidence_mapping", map_evidence)
graph.add_node("semantic_match", semantic_match)
graph.add_node("exaggeration_penalty", compute_exaggeration_penalty)
graph.add_node("final_scoring", final_scoring_and_shortlisting)


graph.set_entry_point("normalize_resume")

graph.add_edge("normalize_resume", "resume_claims")
graph.add_edge("resume_claims", "evidence_mapping")
graph.add_edge("evidence_mapping", "semantic_match")
graph.add_edge("semantic_match", "exaggeration_penalty")
graph.add_edge("exaggeration_penalty", "final_scoring")

resume_graph = graph.compile()
