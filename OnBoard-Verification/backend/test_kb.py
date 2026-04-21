import asyncio
import os
from app.core.database import SessionLocal, Candidate
from app.langgraph.orchestration import extraction_graph

async def main():
    db = SessionLocal()
    candidates = db.query(Candidate).all()
    if not candidates:
        print("No candidates")
        return
    c = candidates[-1]
    docs = c.get_documents()
    input_state = {
        "candidate_id": c.id,
        "documents": docs,
        "document_texts": {},
        "knowledge_base": {}
    }
    kb = {}
    print("Streaming events...")
    async for event in extraction_graph.astream_events(input_state, version="v1"):
        kind = event["event"]
        name = event.get("name", "")
        if kind == "on_chain_end":
            output = event["data"].get("output", {})
            if isinstance(output, dict) and "knowledge_base" in output and output["knowledge_base"]:
                kb = output["knowledge_base"]
                print(f"FOUND KB in {name}:", kb)
            elif isinstance(output, dict):
                for k, v in output.items():
                    if isinstance(v, dict) and "knowledge_base" in v and v["knowledge_base"]:
                        kb = v["knowledge_base"]
                        print(f"FOUND Nested KB in {name} -> {k}")
    
    print("FINAL KB:", kb)

if __name__ == "__main__":
    asyncio.run(main())
