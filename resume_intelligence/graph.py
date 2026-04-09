"""
graph.py — LangGraph pipeline for resume-JD matching.

Node order:
  normalize_resume
    → extract_resume_claims
    → map_evidence
    → semantic_match
    → exaggeration_penalty
    → final_scoring_and_shortlisting
    → generate_admin_insights
"""
from langgraph.graph import StateGraph
from resume_intelligence.state import ResumeState

from resume_intelligence.nodes.normalize_resume import normalize_resume
from resume_intelligence.nodes.resume_claims import extract_resume_claims
from resume_intelligence.nodes.evidence_mapping import map_evidence
from resume_intelligence.nodes.semantic_matcher import semantic_match
from resume_intelligence.nodes.exaggeration_penalty import compute_exaggeration_penalty
from resume_intelligence.nodes.final_scoring import final_scoring_and_shortlisting
from resume_intelligence.nodes.admin_insights import generate_admin_insights

_NODES = [
    ("normalize_resume",  normalize_resume),
    ("resume_claims",     extract_resume_claims),
    ("evidence_mapping",  map_evidence),
    ("semantic_match",    semantic_match),
    ("exaggeration_penalty", compute_exaggeration_penalty),
    ("final_scoring",     final_scoring_and_shortlisting),
    ("admin_insights",    generate_admin_insights),
]

graph = StateGraph(ResumeState)

for name, fn in _NODES:
    graph.add_node(name, fn)

graph.set_entry_point(_NODES[0][0])

for (name_a, _), (name_b, _) in zip(_NODES, _NODES[1:]):
    graph.add_edge(name_a, name_b)

resume_graph = graph.compile()