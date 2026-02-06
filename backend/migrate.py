import sys
import os
import asyncio
from datetime import datetime

# Add root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import db
from jd_intelligence.graph import jd_graph
from resume_intelligence.graph import resume_graph
from infra.text_extraction import extract_text
from azure.storage.blob import BlobServiceClient
from backend.config import settings

async def migrate():
    print("Starting migration / intelligence backfill...")
    
    # Check JDs first
    for job_id, jd in db.jds.items():
        if not jd.get("intelligence"):
            print(f"Backfilling intelligence for JD: {job_id}")
            try:
                # Download JD text
                blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
                blob_client = blob_service_client.get_blob_client(container="job-descriptions", blob=jd["jd_blob_path"])
                content = blob_client.download_blob().readall()
                text = extract_text(content, jd["jd_blob_path"])
                if text:
                    res = jd_graph.invoke({"raw_jd": text})
                    jd["intelligence"] = res
                    print(f"  JD {job_id} intelligence generated.")
            except Exception as e:
                print(f"  Error backfilling JD {job_id}: {e}")

    # Check Resumes
    active_jd = next((j for j in db.jds.values() if j.get("status") == "ACTIVE"), None)
    if not active_jd or not active_jd.get("intelligence"):
        print("No active JD with intelligence found. Skipping resume backfill.")
    else:
        jd_intel = active_jd["intelligence"]
        for resume in db.resumes:
            if not resume.get("intelligence") or resume.get("intelligence") == {}:
                print(f"Backfilling intelligence for resume of candidate {resume['candidate_id']}")
                try:
                    blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
                    blob_client = blob_service_client.get_blob_client(container="resumes", blob=resume["resume_blob_path"])
                    content = blob_client.download_blob().readall()
                    text = extract_text(content, resume["resume_blob_path"])
                    if text:
                        state_input = {
                            "candidate_id": str(resume["candidate_id"]),
                            "raw_resume": text,
                            "role_context": jd_intel.get("role_context", {}),
                            "skill_intelligence": jd_intel.get("skill_intelligence", {}),
                            "competency_profile": jd_intel.get("competency_profile", {}),
                            "interview_requirements": jd_intel.get("interview_requirements", {})
                        }
                        res = resume_graph.invoke(state_input)
                        resume["intelligence"] = res
                        resume["job_id"] = active_jd["job_id"]
                        print(f"  Resume for candidate {resume['candidate_id']} intelligence generated.")
                except Exception as e:
                    print(f"  Error backfilling resume for candidate {resume['candidate_id']}: {e}")

    db.save()
    print("Migration / Backfill complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
