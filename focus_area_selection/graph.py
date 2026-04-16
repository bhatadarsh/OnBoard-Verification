from sre_parse import State
from langgraph.graph import StateGraph
from focus_area_selection.state import Stage3State
from focus_area_selection.nodes.focus_intersection import (
    intersect_focus_areas
)
from focus_area_selection.nodes.depth_worthiness_filter import (
    filter_depth_worthy_areas
)
from focus_area_selection.nodes.final_focus_selector import (
    select_final_focus_areas
)

# Import the shared state (we are extending the same global state)
# This assumes you are passing the accumulated state from Stage 1 & 2
from typing import TypedDict, List, Dict



# -----------------------------
# Import Stage 3 Nodes
# -----------------------------
from focus_area_selection.nodes.candidate_strength_profiler import (
    profile_candidate_strengths
)

# (Next nodes will be added later)
# from stage3_focus_area_selection.nodes.focus_intersection import intersect_focus_areas
# from stage3_focus_area_selection.nodes.depth_worthiness_filter import filter_depth_worthy_areas
# from stage3_focus_area_selection.nodes.final_focus_selector import select_final_focus_areas


# -----------------------------
# Build the Graph
# -----------------------------
graph = StateGraph(Stage3State)

# Entry node
graph.add_node(
    "candidate_strength_profiler",
    profile_candidate_strengths
)
graph.add_node(
    "focus_intersection",
    intersect_focus_areas
)
graph.add_node(
    "depth_worthiness_filter",
    filter_depth_worthy_areas
)
graph.add_node(
    "final_focus_selector",
    select_final_focus_areas
)



graph.set_entry_point("candidate_strength_profiler")

graph.add_edge(
    "candidate_strength_profiler",
    "focus_intersection"
)
graph.add_edge(
    "focus_intersection",
    "depth_worthiness_filter"
)
graph.add_edge(
    "depth_worthiness_filter",
    "final_focus_selector"
)


stage3_graph = graph.compile()
