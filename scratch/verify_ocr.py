import asyncio
import os
import json
from unittest.mock import MagicMock
from sqlalchemy.orm import Session
from candidate.services.document_service import DocumentService
from candidate.models.document_extraction import DocumentExtraction

# Mock environment variable for testing
os.environ["GROQ_API_KEY"] = "mock_key"

async def test_extraction():
    print("🚀 Starting Verification Test...")
    
    # Mock DB Session
    mock_db = MagicMock(spec=Session)
    
    # Mock file path (use a local file if available, or just mock the OCR call)
    test_file = "sampledata.pdf" # This exists in the root according to list_dir
    if not os.path.exists(test_file):
        print(f"⚠️ Test file {test_file} not found, using a dummy string.")
        test_file = "dummy.png"

    print(f"📝 Testing with file: {test_file}")
    
    # We need to mock DocumentOCR to avoid real API calls during verification
    from unittest.mock import patch
    
    with patch("candidate.services.document_service.DocumentOCR") as MockOCR:
        instance = MockOCR.return_value
        instance.extract_from_pdf.return_value = "This is a mock Aadhar Card text. Name: John Doe, ID: 1234-5678-9012"
        instance.extract_text_from_image.return_value = "This is a mock Aadhar Card text. Name: John Doe, ID: 1234-5678-9012"
        instance.parse_to_json.return_value = {
            "document_type": "Aadhar Card",
            "extracted_data": {"name": "John Doe", "id_number": "1234-5678-9012"}
        }
        
        try:
            result = await DocumentService.extract_and_store_document(
                db=mock_db,
                file_path=test_file,
                candidate_id="cand_123"
            )
            
            print("✅ Initial service call successful!")
            
            # --- Test Deletion Logic ---
            print("\n🔄 Testing Re-upload (Deletion Logic)...")
            # Set up the mock instance to return the same doc type again
            instance.parse_to_json.return_value = {
                "document_type": "Aadhar Card",
                "extracted_data": {"name": "John Doe", "id_number": "1234-5678-9012", "note": "updated"}
            }
            
            # Mock the DB query to return the "existing" doc we just "saved"
            mock_db.query.return_value.filter.return_value.first.return_value = result
            
            with patch("os.path.exists", return_value=True), patch("os.remove") as mock_remove:
                updated_result = await DocumentService.extract_and_store_document(
                    db=mock_db,
                    file_path="updated_aadhar.pdf",
                    candidate_id="cand_123"
                )
                
                print("✅ Re-upload service call successful!")
                mock_remove.assert_called_once_with(test_file)
                print(f"✅ Physical file deletion verified: {test_file}")
                
                # Check DB deletion call
                mock_db.delete.assert_called_once_with(result)
                print("✅ DB record deletion verified!")

        except Exception as e:
            print(f"❌ Test failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_extraction())

if __name__ == "__main__":
    asyncio.run(test_extraction())
