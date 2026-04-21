import sys
import os

# Add current directory to path so we can import local modules
sys.path.append(os.getcwd())

from storage.chroma_handler import chroma_handler

def test_fetch_jd(vector_id: str):
    print(f"\n--- Fetching Data for Vector ID: {vector_id} ---\n")
    
    # Retrieve data from ChromaDB
    data = chroma_handler.get_by_id(vector_id)
    
    if not data or not data.get('id'):
        print(f"❌ No data found for ID: {vector_id}")
        return

    print(f"✅ ID found: {data['id']}")
    print("-" * 30)
    print("📋 Metadata:")
    for k, v in data.get('metadata', {}).items():
        print(f"  {k}: {v}")
    
    print("-" * 30)
    print("📄 Entire Raw Text:")
    text = data.get('document', 'No text found')
    print(text)
    print("-" * 30)
if __name__ == "__main__":
    # 1. Use ID from command line if provided
    # 2. Otherwise use your default ID
    if len(sys.argv) > 1:
        test_id = sys.argv[1]
    else:
        test_id = "job_b5cd68c8" # Default ID for testing
    
    test_fetch_jd(test_id)
