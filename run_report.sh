#!/bin/bash
export TERM=dumb

# Output file
OUTPUT_FILE="output.md"

echo "# Data Extraction Pipeline Report" > "$OUTPUT_FILE"
echo "Generated on $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## 1. Configuration" >> "$OUTPUT_FILE"
echo '```yaml' >> "$OUTPUT_FILE"
source dvenv/bin/activate
python -c "from config.settings import settings; print(f'Embedding Model: {settings.embedding_model}'); print(f'Gemini Model: {settings.gemini_model}'); print(f'Postgres URI: {settings.postgres_uri}'); print(f'Chroma DB: {settings.chroma_persist_dir} (Collection: {settings.chroma_collection_name})')" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## 2. Pipeline Execution Logs" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
# Run pipeline and append, stripping ANSI codes if any (though non-tty usually disables them)
python main.py >> "$OUTPUT_FILE" 2>&1
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## 3. Database Verification" >> "$OUTPUT_FILE"

echo "### 3.1 PostgreSQL (Structured Data)" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
docker exec de_postgres psql -U postgres -d data_extraction -c "\dt" >> "$OUTPUT_FILE" 2>&1
docker exec de_postgres psql -U postgres -d data_extraction -c "SELECT * FROM quarterly_financials;" >> "$OUTPUT_FILE" 2>&1
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### 3.2 ChromaDB (Vector Embeddings)" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
python -c "
import chromadb
client = chromadb.PersistentClient(path='./chroma_db')
try:
    coll = client.get_collection('document_embeddings')
    print(f'Total embeddings: {coll.count()}')
    print('IDs:', coll.get()['ids'])
except Exception as e:
    print(f'Error: {e}')
" >> "$OUTPUT_FILE" 2>&1
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### 3.3 MongoDB (Metadata)" >> "$OUTPUT_FILE"
echo '```json' >> "$OUTPUT_FILE"
docker exec de_mongo mongosh data_extraction --eval "db.documents.find({}, {filename:1, content_type:1}).toArray()" --quiet >> "$OUTPUT_FILE" 2>&1
echo '```' >> "$OUTPUT_FILE"

echo "Done! Report saved to $OUTPUT_FILE"
