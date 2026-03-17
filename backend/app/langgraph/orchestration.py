"""
LangGraph Orchestration - Main workflow for onboarding document validation.

Graph flow:
  input_guard → ingestion → extraction → normalization → validation → output_guard

Each node is self-contained with its own tools:
- Ingestion: OCR (Groq Vision), PDF, DOCX, audio transcription
- Extraction: LLM-based structured data extraction
- Normalization: Field name mapping, CSV filtering
- Validation: Smart matching (phone, location, abbreviation, name overlap)
"""
from langgraph.graph import StateGraph, END
from app.langgraph.state import GraphState
from app.langgraph.subgraphs.ingestion.graph import ingestion_node
from app.langgraph.subgraphs.extraction.graph import extraction_node
from app.langgraph.subgraphs.normalization import normalization_node
from app.langgraph.subgraphs.validation.graph import validation_node


# ============ GUARD NODES ============

async def input_guard_node(state: GraphState):
    """Validate input documents exist before processing."""
    print("---LANGGRAPH: INPUT GUARD---")
    documents = state.get("documents", {})
    is_safe = len(documents) > 0
    if not is_safe:
        print("  BLOCKED: No documents provided")
    return {"is_safe_input": is_safe}


async def output_guard_node(state: GraphState):
    """Validate output quality after processing."""
    print("---LANGGRAPH: OUTPUT GUARD---")
    kb = state.get("knowledge_base", {})
    is_safe = len(kb) > 0
    if not is_safe:
        print("  WARNING: Empty knowledge base")
    return {"is_safe_output": is_safe}


# ============ ROUTING ============

def route_input(state: GraphState):
    if state.get("is_safe_input"):
        return "ingestion"
    return END


def route_output(state: GraphState):
    return END


# ============ BUILD GRAPH ============

workflow = StateGraph(GraphState)

# Add all nodes
workflow.add_node("input_guard", input_guard_node)
workflow.add_node("ingestion", ingestion_node)
workflow.add_node("extraction", extraction_node)
workflow.add_node("normalization", normalization_node)
workflow.add_node("validation", validation_node)
workflow.add_node("output_guard", output_guard_node)

# Define edges (linear flow with conditional entry)
workflow.set_entry_point("input_guard")

workflow.add_conditional_edges(
    "input_guard",
    route_input,
    {"ingestion": "ingestion", END: END}
)

workflow.add_edge("ingestion", "extraction")
workflow.add_edge("extraction", "normalization")
workflow.add_edge("normalization", "validation")
workflow.add_edge("validation", "output_guard")

workflow.add_conditional_edges(
    "output_guard",
    route_output,
    {END: END}
)

# Compile
app = workflow.compile()


# ============ WORKFLOW RUNNERS ============

async def run_extraction_workflow(documents: dict) -> dict:
    """Run ingestion → extraction only. Returns knowledge base."""
    initial_state = {
        "documents": documents,
        "document_texts": {},
        "knowledge_base": {}
    }
    
    result = await ingestion_node(initial_state)
    initial_state.update(result)
    
    result = await extraction_node(initial_state)
    initial_state.update(result)
    
    return initial_state.get("knowledge_base", {})


async def run_validation_workflow(knowledge_base: dict, form_data: dict, existing_validation: list = None) -> dict:
    """Run normalization → validation only. Returns validation results."""
    state = {
        "knowledge_base": knowledge_base,
        "form_data": form_data,
        "existing_validation": existing_validation or []
    }
    
    # Normalize first
    norm_result = await normalization_node(state)
    state.update(norm_result)
    
    # Then validate
    result = await validation_node(state)
    
    return {
        "validations": result.get("validations", []),
        "overall_score": result.get("validation_score", 0),
        "correct_count": result.get("correct_count", 0),
        "incorrect_count": result.get("incorrect_count", 0),
        "ambiguous_count": result.get("ambiguous_count", 0)
    }


async def run_full_workflow(documents: dict, form_data: dict) -> dict:
    """Run the complete workflow through LangGraph graph."""
    initial_state = {
        "documents": documents,
        "form_data": form_data,
        "document_texts": {},
        "knowledge_base": {}
    }
    
    final_state = await app.ainvoke(initial_state)
    
    return {
        "knowledge_base": final_state.get("knowledge_base", {}),
        "validations": final_state.get("validations", []),
        "validation_score": final_state.get("validation_score", 0),
        "correct_count": final_state.get("correct_count", 0),
        "incorrect_count": final_state.get("incorrect_count", 0),
        "ambiguous_count": final_state.get("ambiguous_count", 0)
    }
