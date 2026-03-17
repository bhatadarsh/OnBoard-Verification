"""
Extraction Node - Uses LLM Service to extract data from documents.
"""
from typing import Any, Dict
from app.langgraph.state import GraphState
from app.services.llm_service import llm_service


async def extraction_node(state: GraphState) -> Dict[str, Any]:
    """Extract structured data from all uploaded documents."""
    print("---LANGGRAPH: EXTRACTION NODE---")
    
    documents = state.get("documents", {})
    document_texts = state.get("document_texts", {})
    
    results = {
        "resume_data": {},
        "hr_transcript_data": {},
        "aadhar_data": {},
        "pan_data": {},
        "marksheet_10th_data": {},
        "marksheet_12th_data": {},
        "knowledge_base": {}
    }
    
    # Process each document type
    for doc_type, text in document_texts.items():
        if not text:
            continue
            
        print(f"  Extracting from: {doc_type}")
        
        if doc_type == "resume":
            results["resume_data"] = llm_service.extract_from_resume(text)
        elif doc_type in ["hr_transcript", "hr_audio"]:
            results["hr_transcript_data"] = llm_service.extract_from_hr_transcript(text)
        elif doc_type == "aadhar":
            results["aadhar_data"] = llm_service.extract_from_aadhar(text)
        elif doc_type == "pan":
            results["pan_data"] = llm_service.extract_from_pan(text)
        elif doc_type == "marksheet_10th":
            results["marksheet_10th_data"] = llm_service.extract_from_marksheet(text, "10th")
        elif doc_type == "marksheet_12th":
            results["marksheet_12th_data"] = llm_service.extract_from_marksheet(text, "12th")
    
    # Build merged knowledge base
    kb = {}
    for source in ["resume", "hr_transcript", "aadhar", "pan", "marksheet_10th", "marksheet_12th"]:
        data = results.get(f"{source}_data", {})
        if data:
            kb[source] = data
    
    results["knowledge_base"] = kb
    
    return results
