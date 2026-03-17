"""
Ingestion Node - Reads documents and extracts raw text.

Uses local tools for OCR (Groq Vision), PDF, DOCX extraction.
Audio files are transcribed via Whisper (through LLM service).
"""
from typing import Any, Dict
from app.langgraph.state import GraphState
from app.langgraph.subgraphs.ingestion.tools import extract_text_from_file, is_audio_file
from app.services.llm_service import llm_service


async def ingestion_node(state: GraphState) -> Dict[str, Any]:
    """Read document files and extract text content.
    
    For each document:
    - Images → Groq Vision OCR
    - PDFs → PyPDF2 (with OCR fallback for scanned)
    - DOCX → python-docx
    - Audio → Whisper transcription
    - Text → direct read
    """
    print("---LANGGRAPH: INGESTION NODE---")
    
    documents = state.get("documents", {})
    document_texts = {}
    
    for doc_type, file_path in documents.items():
        if not file_path:
            continue
            
        print(f"  Reading: {doc_type} from {file_path}")
        
        try:
            if is_audio_file(file_path):
                print(f"    -> Audio file, transcribing via Whisper...")
                text = llm_service.transcribe_audio(file_path)
                document_texts[doc_type] = text
            else:
                text = extract_text_from_file(file_path)
                document_texts[doc_type] = text
                print(f"    -> Extracted {len(text)} characters")
        except Exception as e:
            print(f"  Error reading {doc_type}: {e}")
            document_texts[doc_type] = ""
    
    return {"document_texts": document_texts}
