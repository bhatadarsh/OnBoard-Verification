import os
from sqlalchemy.orm import Session
from candidate.doc_extraction.handle_doc import DocumentOCR
from candidate.models.document_extraction import DocumentExtraction
from utils.logger import get_logger

log = get_logger(__name__)

class DocumentService:
    @staticmethod
    async def extract_and_store_document(
        db: Session,
        file_path: str,
        candidate_id: str = None
    ) -> DocumentExtraction:
        """
        Generic service to extract text from a document, parse it to JSON, 
        and store the results in the database."""
        from config.settings import settings
        api_key = settings.groq_api_key
        if not api_key:
            log.error("GROQ_API_KEY not found in centralized settings or .env file")
            raise ValueError("Groq API key is missing")

        ocr_engine = DocumentOCR(api_key=api_key)
        
        # 1. Extract raw text
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext == ".pdf":
            raw_text = await ocr_engine.extract_from_pdf(file_path)
        elif file_ext in [".txt", ".log", ".md"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                raw_text = f.read()
        else:
            # Assume image for now (png, jpg, etc.)
            raw_text = await ocr_engine.extract_text_from_image(file_path)

        # 2. Parse to structured JSON
        parsed_result = await ocr_engine.parse_to_json(raw_text)
        doc_type = parsed_result.get("document_type", "unknown")
        extracted_data = parsed_result.get("extracted_data", {})

        # 3. Store in Database & Handle Duplicates Atomically
        try:
            # Find existing document of same type for this candidate
            existing_doc = db.query(DocumentExtraction).filter(
                DocumentExtraction.candidate_id == candidate_id,
                DocumentExtraction.doc_type == doc_type
            ).first()

            if existing_doc:
                log.info(f"Duplicate document detected for candidate {candidate_id} (Type: {doc_type}). Replacing...")
                
                # Delete old physical file ONLY if it's not the same file we're currently processing
                # This prevents "self-deletion" if the new file has the same name/path as the old one.
                if existing_doc.file_path and existing_doc.file_path != file_path and os.path.exists(existing_doc.file_path):
                    try:
                        os.remove(existing_doc.file_path)
                        log.info(f"Deleted old physical file: {existing_doc.file_path}")
                    except Exception as fe:
                        log.warning(f"Could not delete old physical file {existing_doc.file_path}: {fe}")
                
                # Mark for deletion (but don't commit yet to keep it atomic)
                db.delete(existing_doc)

            # Create new record
            db_record = DocumentExtraction(
                candidate_id=candidate_id,
                file_name=os.path.basename(file_path),
                file_path=file_path,
                doc_type=doc_type,
                raw_text=raw_text,
                extracted_data=extracted_data,
                status="processed"
            )
            db.add(db_record)
            
            # Commit both the deletion and the insertion together
            db.commit()
            db.refresh(db_record)
            
            log.info(f"Successfully stored extraction record for {os.path.basename(file_path)} (ID: {db_record.id})")
            return db_record

        except Exception as e:
            db.rollback()
            log.error(f"Failed to process and store document extraction: {e}")
            raise e
