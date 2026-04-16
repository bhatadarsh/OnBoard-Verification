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
    existing_kb = state.get("knowledge_base", {}) or {}
    
    results = {}
    tasks = {}
    
    # Process each document type concurrently
    for doc_type, text in document_texts.items():
        if not text:
            continue
            
        # Delta Optimization: Skip if we already extracted this document previously
        if doc_type in existing_kb and existing_kb[doc_type]:
            print(f"  Skipping extraction for {doc_type}: Already in Knowledge Base")
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
        elif doc_type == "i9_form":
            tasks["i9_form_data"] = llm_service.extract_from_i9(text)
            
    if tasks:
        # Run extractions through an asyncio Semaphore to strictly limit concurrency to 2
        sem = asyncio.Semaphore(2)
        
        async def run_with_sem(coro):
            async with sem:
                return await coro

        keys = list(tasks.keys())
        safe_coroutines = [run_with_sem(coro) for coro in tasks.values()]
        gathered_results = await asyncio.gather(*safe_coroutines, return_exceptions=True)
        
        for key, res in zip(keys, gathered_results):
            if isinstance(res, Exception):
                print(f"  [ERROR] Extraction failed completely for {key}: {res}")
                results[key] = {}
            else:
                results[key] = res
                print(f"  Completed extraction for: {key}")
    
    # Build merged knowledge base
    kb = dict(existing_kb) # Copy existing to not mutate original directly
    for doc_type in ["resume", "hr_transcript", "aadhar", "pan", "marksheet_10th", "marksheet_12th", "i9_form"]:
        res_key = f"{doc_type}_data"
        if res_key in results and results[res_key]:
            kb[doc_type] = results[res_key]
    
    results["knowledge_base"] = kb
    
    return results
