"""
Ingestion Node - Reads documents and extracts raw text securely.
"""
from typing import Any, Dict
from app.langgraph.state import GraphState
from app.langgraph.subgraphs.ingestion.tools import extract_text_from_file, is_audio_file, decrypted_tempfile, verify_document_signature
from app.services.llm_service import llm_service


async def ingestion_node(state: GraphState) -> Dict[str, Any]:
    print("---LANGGRAPH: INGESTION NODE---")
    
    documents = state.get("documents", {})
    document_texts = {}
    
    for doc_type, file_path in documents.items():
        if not file_path:
            continue
            
        print(f"  Reading securely: {doc_type} from {file_path}")
        
        try:
            with decrypted_tempfile(file_path) as tmp_path:
                if not tmp_path:
                    continue
                
                if is_audio_file(tmp_path):
                    print(f"    -> Audio file, transcribing asynchronously...")
                    text = await llm_service.transcribe_audio(tmp_path)
                    document_texts[doc_type] = text
                elif doc_type == "i9_form":
                    text = await extract_text_from_file(tmp_path)
                    sig_report = await verify_document_signature(tmp_path)
                    document_texts[doc_type] = f"{text}\n\n[SIGNATURE VERIFICATION RESULT]\n{sig_report}"
                    print(f"    -> Extracted I-9 form and verified signature")
                else:
                    text = await extract_text_from_file(tmp_path)
                    document_texts[doc_type] = text
                    print(f"    -> Extracted {len(text)} characters")
        except Exception as e:
            print(f"  Error reading {doc_type}: {e}")
            document_texts[doc_type] = ""
    
    return {"document_texts": document_texts}
