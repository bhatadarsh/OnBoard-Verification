"""Check ChromaDB for a specific candidate."""
import chromadb
import json

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_collection("document_embeddings")

# Filter by candidate_id
results = collection.get(
    where={"candidate_id": "cand_7e9ab900"},   # ← paste candidate id here
    include=["documents", "metadatas", "embeddings"]
)

print(f"Found {len(results['ids'])} record(s) for this candidate\n")

for i in range(len(results["ids"])):
    print(f"ID:        {results['ids'][i]}")
    print(f"Metadata:  {json.dumps(results['metadatas'][i], indent=2)}")
    print(f"\nFull stored text:")
    print(results["documents"][i])
    print(f"\nEmbedding size: {len(results['embeddings'][i])} dimensions")