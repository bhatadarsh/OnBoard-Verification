from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional
import os
import shutil

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/documents")
async def upload_documents(
    candidate_name: str = Form(...),
    resume: Optional[UploadFile] = File(None),
    hr_call_audio: Optional[UploadFile] = File(None),
    aadhar_scan: Optional[UploadFile] = File(None),
    marksheet_10th: Optional[UploadFile] = File(None),
    marksheet_12th: Optional[UploadFile] = File(None),
    degree_cert: Optional[UploadFile] = File(None),
    payslip: Optional[UploadFile] = File(None),
    relieving_letter: Optional[UploadFile] = File(None)
):
    """
    Upload ground truth documents for a candidate.
    Supported file types:
    - Resume: PDF, DOCX
    - HR Call: MP3, WAV, M4A
    - Aadhar/Certs: PDF, JPG, PNG
    """
    candidate_dir = os.path.join(UPLOAD_DIR, candidate_name.replace(" ", "_").lower())
    os.makedirs(candidate_dir, exist_ok=True)
    
    uploaded_files = {}
    
    files_to_process = [
        ("resume", resume),
        ("hr_call_audio", hr_call_audio),
        ("aadhar_scan", aadhar_scan),
        ("marksheet_10th", marksheet_10th),
        ("marksheet_12th", marksheet_12th),
        ("degree_cert", degree_cert),
        ("payslip", payslip),
        ("relieving_letter", relieving_letter)
    ]
    
    for field_name, file in files_to_process:
        if file:
            # Get file extension
            ext = os.path.splitext(file.filename)[1]
            file_path = os.path.join(candidate_dir, f"{field_name}{ext}")
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            uploaded_files[field_name] = {
                "original_name": file.filename,
                "saved_path": file_path,
                "size_bytes": os.path.getsize(file_path)
            }
    
    return {
        "status": "success",
        "candidate": candidate_name,
        "uploaded_files": uploaded_files,
        "message": f"Uploaded {len(uploaded_files)} documents successfully"
    }


@router.get("/documents/{candidate_name}")
async def list_documents(candidate_name: str):
    """List all uploaded documents for a candidate."""
    candidate_dir = os.path.join(UPLOAD_DIR, candidate_name.replace(" ", "_").lower())
    
    if not os.path.exists(candidate_dir):
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    files = []
    for filename in os.listdir(candidate_dir):
        file_path = os.path.join(candidate_dir, filename)
        files.append({
            "name": filename,
            "size_bytes": os.path.getsize(file_path),
            "path": file_path
        })
    
    return {"candidate": candidate_name, "files": files}
