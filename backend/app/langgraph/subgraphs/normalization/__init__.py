"""
Normalization Node - Normalizes form data field names and filters unimportant fields.

This node sits between extraction and validation, ensuring form data uses canonical
field names and drops irrelevant CSV columns (timestamps, consent, uploads, etc.).
"""
from typing import Any, Dict
from app.langgraph.state import GraphState
from app.langgraph.subgraphs.validation.tools import normalize_form_data


async def normalization_node(state: GraphState) -> Dict[str, Any]:
    """Normalize form field names and filter out unimportant fields.
    
    Input: form_data (raw CSV columns like 'Email ID', 'Phone No', 'Timestamp')
    Output: normalized_form (canonical names like 'email', 'phone'; no 'timestamp')
    """
    print("---LANGGRAPH: NORMALIZATION NODE---")
    
    form_data = state.get("form_data", {})
    
    if not form_data:
        print("  No form data to normalize")
        return {"normalized_form": {}}
    
    print(f"  Input fields: {list(form_data.keys())}")
    
    normalized = normalize_form_data(form_data)
    
    print(f"  Output fields: {list(normalized.keys())}")
    print(f"  Filtered out {len(form_data) - len(normalized)} unimportant fields")
    
    return {"normalized_form": normalized}
