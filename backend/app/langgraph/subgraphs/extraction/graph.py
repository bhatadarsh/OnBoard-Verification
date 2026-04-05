"""
Extraction Node - Uses LLM Service to extract data from documents.
"""
import asyncio
from typing import Any, Dict
from app.langgraph.state import GraphState
from app.services.llm_service import llm_service


async def extraction_node(state: GraphState) -> Dict[str, Any]:
    """Extract structured data from all uploaded documents using parallel execution."""
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
    
    tasks = {}
    
    # Process each document type concurrently
    for doc_type, text in document_texts.items():
        if not text:
            continue
            
        print(f"  Scheduling extraction from: {doc_type}")
        
        if doc_type == "resume":
            tasks["resume_data"] = llm_service.extract_from_resume(text)
        elif doc_type in ["hr_transcript", "hr_audio"]:
            tasks["hr_transcript_data"] = llm_service.extract_from_hr_transcript(text)
        elif doc_type == "aadhar":
            tasks["aadhar_data"] = llm_service.extract_from_aadhar(text)
        elif doc_type == "pan":
            tasks["pan_data"] = llm_service.extract_from_pan(text)
        elif doc_type == "marksheet_10th":
            tasks["marksheet_10th_data"] = llm_service.extract_from_marksheet(text, "10th")
        elif doc_type == "marksheet_12th":
            tasks["marksheet_12th_data"] = llm_service.extract_from_marksheet(text, "12th")
            
    if tasks:
        # Run all extractions in parallel safely
        keys = list(tasks.keys())
        coroutines = list(tasks.values())
        gathered_results = await asyncio.gather(*coroutines, return_exceptions=True)
        
        for key, res in zip(keys, gathered_results):
            if isinstance(res, Exception):
                print(f"  [ERROR] Extraction failed completely for {key}: {res}")
                results[key] = {}
            else:
                results[key] = res
                print(f"  Completed extraction for: {key}")
    
    # Build merged knowledge base
    kb = {}
    for source in ["resume", "hr_transcript", "aadhar", "pan", "marksheet_10th", "marksheet_12th"]:
        data = results.get(f"{source}_data", {})
        if data:
            kb[source] = data
    
    results["knowledge_base"] = kb
    
    return results
