# 📋 AI HirePro Enterprise — Mentor Q&A & System Architecture Guide

> This document is a comprehensive technical reference covering the full system architecture, database schemas, data flows, and potential mentor interview questions with detailed answers.

---

## 📐 PART 1: COMPLETE DATABASE SCHEMA

### 1.1 SQLite — `onboardguard.db` (Primary Relational Store)
**Table: `candidates`** — The single unified table shared across all three modules.

| Column | Type | Purpose |
|---|---|---|
| `id` | `String (PK)` | Unique ID: `cand_<md5>` format |
| `first_name` | `String` | Candidate first name |
| `last_name` | `String` | Candidate last name |
| `full_name` | `String` | Denormalized for compatibility with legacy scripts |
| `email` | `String (UNIQUE)` | Contact email |
| `phone` | `String` | With country code |
| `location` | `String` | City / region |
| `status` | `String` | Pipeline stage: `applied → shortlisted → interviewed → onboarding → onboarded` |
| `resume_path` | `String` | Disk path: `uploads/cand_001/resume.pdf` |
| `chroma_vector_id` | `String` | ID of this candidate's embedding inside ChromaDB |
| `raw_skills` | `Text (JSON)` | e.g., `["Python", "SQL", "React"]` |
| `raw_education` | `Text (JSON)` | List of education dicts (degree, college, year) |
| `raw_experience` | `Text (JSON)` | List of experience dicts (company, role, CTC) |
| `experience_years` | `Float` | Numeric years of experience |
| `current_company` | `String` | Current employer name |
| `current_role` | `String` | Current job title |
| `applied_jd_id` | `String (FK)` | Links to `job_descriptions` table |
| `match_score` | `Float` | Semantic similarity score from ChromaDB |
| `interview_id` | `String (FK)` | Links to interview session |
| `interview_score` | `Float` | AI-generated interview performance score |
| `interview_status` | `String` | `scheduled / completed / cancelled` |
| `aadhar_number` | `String` | Encrypted Aadhar number |
| `pan_number` | `String` | Encrypted PAN number |
| `dob` | `String` | Date of birth: `YYYY-MM-DD` format |
| `validation_score` | `Float` | OnboardGuard match % score |
| `validation_status` | `String` | e.g., `validated` |
| `documents` | `Text (JSON)` | `{ "resume": "/path/...", "forensic_alerts": [] }` |
| `knowledge_base` | `Text (JSON)` | Extracted data from all documents |
| `onboarding_form` | `Text (JSON)` | Original CSV / Form data |
| `validation_result` | `Text (JSON)` | Detailed field-by-field validation breakdown |
| `is_validated` | `Boolean` | `True` once validation is completed |
| `tamper_warning` | `Boolean` | `True` if forensic analysis detected tampering |
| `created_at` | `DateTime` | Auto-set on creation |
| `updated_at` | `DateTime` | Auto-updated on every change |

**Table: `audio_transcriptions`** — Stores interview audio transcripts.

| Column | Type | Purpose |
|---|---|---|
| `id` | `Integer (PK)` | Auto-increment |
| `candidate_id` | `String(50)` | FK → `candidates.id` |
| `filename` | `Text` | Audio file name |
| `transcript` | `Text` | Full text transcript via Whisper STT |
| `summary` | `Text` | AI-generated summary of the transcript |
| `created_at` | `TIMESTAMP` | Auto-set by the server |

---

### 1.2 MongoDB — `data_extraction` database (Document / Raw JSON Store)

**Collection: `documents`** — Stores full raw AI extraction results.
```json
{
  "_id": "ObjectId(auto)",
  "candidate_id": "riya_patel_e1cb66",
  "doc_type": "resume",
  "raw_text": "Full OCR text of the document...",
  "parsed_json": {
    "full_name": "Riya Patel",
    "email": "riya.patel@example.com",
    "current_company": "StartupHub",
    "total_experience": "2 Years"
  },
  "created_at": "2026-04-17T12:00:00Z"
}
```

**Collection: `relationships`** — Stores links between extracted elements.
```json
{
  "_id": "ObjectId(auto)",
  "document_id": "<parent_doc_id>",
  "type": "experience_at_company",
  "from": "Riya Patel",
  "to": "StartupHub",
  "created_at": "2026-04-17T12:00:00Z"
}
```

**Collection: `page_structures`** — Stores page-level layout metadata.
```json
{
  "_id": "ObjectId(auto)",
  "document_id": "<parent_doc_id>",
  "page_number": 1,
  "layout": "two-column",
  "created_at": "2026-04-17T12:00:00Z"
}
```

---

### 1.3 ChromaDB — `./chroma_db/` (Vector Store)

**Collection: `document_embeddings`** — Uses **cosine similarity** distance metric.

Each record in ChromaDB stores:
| Field | Description |
|---|---|
| `id` | Unique string: `{candidate_id}_{doc_type}` e.g., `riya_patel_e1cb66_resume` |
| `embedding` | 768-dimensional float vector from `BAAI/bge-base-en-v1.5` model |
| `document` | Raw text that was embedded (first 10,000 chars) |
| `metadata` | `{ "candidate_id": "...", "doc_type": "resume" }` |

---

### 1.4 LangGraph — GraphState Schema

The shared state object that flows through the entire validation pipeline:

```python
GraphState = {
  # Input
  "candidate_id": str,
  "documents": { "resume": "/path/to/file", "pan": "/path/to/file" },
  "form_data": { "full_name": "Riya Patel", "dob": "1998-11-01", ... },

  # After Ingestion Node
  "document_texts": { "resume": "Full extracted text...", ... },

  # After Extraction Node
  "knowledge_base": { "resume": { "full_name": "Riya Patel", ... }, ... },

  # After Normalization Node
  "normalized_form": { "full_name": "Riya Patel", "dob": "1998-11-01", ... },

  # After Validation Node
  "validations": [ { "field": "full_name", "status": "CORRECT", ... }, ... ],
  "validation_score": 76.9,
  "correct_count": 10,
  "incorrect_count": 1,
  "ambiguous_count": 2
}
```

---

## 🔄 PART 2: COMPLETE DATA FLOW DIAGRAM

```
CSV Upload (Onboarding Form)
        │
        ▼
POST /api/v1/onboarding/upload
  └─► SQLite: saves to candidates.onboarding_form (JSON)

Document Upload (Resume, PAN, Aadhar, etc.)
        │
        ▼
POST /api/v1/documents/{candidate_id}
  └─► Disk: saves file to backend/uploads/{id}/resume.pdf
  └─► SQLite: updates candidates.documents (JSON)

Knowledge Base Build
        │
        ▼
POST /api/v1/extract/{candidate_id}  ← Server-Sent Events (SSE) stream
  ├─► DocumentOCR (Llama 3.2 Vision): PDF/Image → JSON
  ├─► Vectorizer (BAAI/bge-base-en-v1.5): text → 768-dim vector
  ├─► ChromaDB:  store_embeddings(id, vector, text, metadata)
  ├─► MongoDB:   store_document_metadata({ candidate_id, doc_type, parsed_json })
  └─► SQLite:    candidates.knowledge_base = merged JSON

Compliance Validation
        │
        ▼
POST /api/v1/validate/{candidate_id}
  ├─► LangGraph: normalization_node  (canonicalizes form field names)
  ├─► LangGraph: validation_node     (cross-references KB vs Form)
  └─► SQLite:    candidates.validation_result, validation_score, is_validated=True
```

---

## ❓ PART 3: MENTOR Q&A — 20 LIKELY QUESTIONS

---

### Q1: Why did you use three different databases instead of just one?

**Answer:**  
Each database is specialized for a different type of data:
- **SQLite** handles fast, structured, relational data (candidate profile, status flags) with ACID transactions.
- **MongoDB** handles variable, complex, nested JSON (raw AI extraction results that have different fields per document type). Using SQLite for this would require hundreds of nullable columns.
- **ChromaDB** is a vector database—it stores mathematical embeddings and supports **semantic similarity search**, which no relational DB can do natively.

Together, this is called a **Heterogeneous Storage Architecture**.

---

### Q2: What is ChromaDB and why is it used here?

**Answer:**  
ChromaDB is an open-source **vector database**. When a document (resume, ID card) is extracted, we convert its text into a 768-dimensional floating-point vector using the `BAAI/bge-base-en-v1.5` embedding model. ChromaDB stores this vector.

During validation, instead of exact string matching, we can ask: *"Find the document content most similar to 'work experience'"* — ChromaDB will return the most relevant sections even if they use different vocabulary. This is the foundation of **Retrieval-Augmented Generation (RAG)**.

---

### Q3: Walk me through exactly what happens when you click "Build Knowledge Base."

**Answer:**  
1. Frontend calls `POST /api/v1/extract/{candidate_id}` — server responds with an **SSE (Server-Sent Events)** stream so we see live logs.
2. The backend reads all uploaded file paths from `candidates.documents` in SQLite.
3. For each file, `DocumentService` is called:
   - PDFs/Images → `DocumentOCR.extract()` (Llama 3.2 Vision model via Groq API) → structured JSON.
   - `.txt` files → read directly, bypassing the Vision API.
4. The extracted text is vectorized using `BAAI/bge-base-en-v1.5` → **768-dim vector**.
5. **Triple save:**
   - ChromaDB: `collection.upsert(id, vector, text, metadata)`
   - MongoDB: `db.documents.insert_one({ candidate_id, doc_type, parsed_json })`
   - SQLite: `candidate.knowledge_base = merged JSON`
6. The SSE stream sends live log messages to the frontend (you see `> Vector generated and indexed in ChromaDB & MongoDB`).

---

### Q4: How do the three branches (Interview Agent, Heterogeneous Extractor, OnboardGuard) share data?

**Answer:**  
The key integration point is the **`candidates` table in SQLite**. This is the single source of truth shared by all three modules:
- **Interview Agent** writes to `interview_id`, `interview_score`, `interview_status`.
- **Heterogeneous Extractor** writes to `chroma_vector_id`, `knowledge_base`, `raw_skills`, `raw_experience`.
- **OnboardGuard** writes to `validation_score`, `validation_result`, `is_validated`, `documents`.

All modules import from `app.core.database` (SQLAlchemy) and the `Candidate` model from `app.models.candidate`.

---

### Q5: What is LangGraph and how does it work in this project?

**Answer:**  
LangGraph is a framework for building **stateful, multi-step AI pipelines** using a graph structure. Each "node" in the graph is a processing step, and they all share a common `GraphState` dictionary.

In this project, the validation workflow is:
```
input_guard → ingestion → extraction → normalization → validation → output_guard
```
Each node receives the state, does its job, and returns an updated state. For example, `normalization_node` takes the raw `form_data` and returns `normalized_form` with canonical field names. `validation_node` then reads both `knowledge_base` and `normalized_form` to produce the final report.

---

### Q6: What was the "Extraction Hang" bug and how did you fix it?

**Answer:**  
The root cause was a **type error** inside the extraction loop. The `documents` JSON stored in SQLite contained a key called `forensic_alerts` whose value was a **list** (not a file path string). The loop was calling `os.stat(forensic_alerts)` which crashed with `stat: path should be string, bytes, os.PathLike or integer, not list`.

Because the crash happened inside an async generator (SSE stream), it was silently swallowed, never reaching the `db.commit()` at the end. The candidate was permanently stuck at "Awaiting Extraction."

**Fix:** Added a type check in the loop to skip any value that is not a string:
```python
if not isinstance(file_path, str):
    continue
```

---

### Q7: What is the embedding model and why `BAAI/bge-base-en-v1.5`?

**Answer:**  
`BAAI/bge-base-en-v1.5` is a HuggingFace sentence embedding model developed by the Beijing Academy of AI. It produces **768-dimensional** dense vectors. We chose it because:
- It's free and runs locally on CPU (no API cost).
- It performs extremely well on semantic retrieval benchmarks (MTEB leaderboard).
- It has a manageable size (~438MB), suitable for a development environment.

The `BERT`-family constraint of 512 tokens per chunk is handled by our `_chunk_text()` function in `embedding_generator.py`, which splits long texts into 1500-character chunks before embedding and then averages the chunk vectors.

---

### Q8: How does the Validation Engine compare CSV fields against document data?

**Answer:**  
It uses a 5-step matching pipeline in `validation/tools.py`:
1. **Exact normalized match** — removes punctuation, lowercases both sides.
2. **Date normalization** — `01/11/1998` and `1998-11-01` both normalize to `1998-11-01`.
3. **Phone normalization** — removes country codes and formats to last 10 digits.
4. **Type-aware matching** — IDs (Aadhar, PAN) use strict alphanumeric equality. Years require exact integer match. Degrees use abbreviation expansion (`B.Sc` → `bachelor of science`).
5. **Fuzzy confidence** — `difflib.SequenceMatcher` gives a 0–100 confidence score; above 80% is CORRECT, 60–80% is flagged as suspicious.

---

### Q9: What is the `GraphState` and why is it a `TypedDict`?

**Answer:**  
`GraphState` is a Python `TypedDict` — a typed dictionary that serves as the **shared memory** for the entire LangGraph pipeline. Using `TypedDict` instead of a plain dict gives us:
- **Type safety** — we know exactly what keys and value types each node expects.
- **`total=False`** — all keys are optional, meaning early nodes don't need to provide data for late nodes.

Each node function receives the full state, reads only what it needs, and returns only the keys it modifies. LangGraph merges the returned dict back into the shared state automatically.

---

### Q10: Why did the validation report show "null" for most fields, giving 0% match?

**Answer:**  
There were two bugs:
1. **Prompt mismatch:** The AI extraction prompt was too generic. It didn't know to specifically look for onboarding fields like `gender`, `aadhar_number`, or `current_ctc`. I rewrote the prompt to explicitly ask for these fields.
2. **Key normalization failure:** The AI returned `"Full Name"` (with a space and capital), but the lookup table expected `"full_name"`. The flat KB builder was doing exact string matching. I added a normalization step:
   ```python
   field_norm = str(field).lower().strip().replace(' ', '_')
   flat_kb[field_norm] = entry  # Store under normalized key too
   ```
   I also added a fuzzy fallback that checks if the lookup field is a substring of any KB key.

---

### Q11: What is an SSE (Server-Sent Events) stream and why use it here?

**Answer:**  
SSE is a one-way HTTP streaming protocol where the **server pushes events to the browser** over a long-lived connection. We use `StreamingResponse` in FastAPI with `text/event-stream` MIME type.

We chose SSE for the extraction endpoint because document processing can take 10–60 seconds (AI inference + embedding + DB saves). Without SSE, the user would just see a loading spinner. With SSE, they see a **live log in real-time** (e.g., `> Vectorizing RESUME text...`, `> Vector indexed in ChromaDB`). This greatly improves perceived performance.

---

### Q12: How is the Candidate `id` generated?

**Answer:**  
The ID is generated as: `{first_name}_{last_name}_{md5_hash[:6]}`.  
Example: `riya_patel_e1cb66`.

The MD5 hash is computed from the candidate's email address. This ensures:
- IDs are human-readable (include the name).
- IDs are collision-resistant (the hash suffix handles duplicate names).
- IDs are deterministic — the same email always produces the same ID.

---

### Q13: What is the role of the `postgres_handler.py` if you switched to SQLite?

**Answer:**  
`postgres_handler.py` was originally part of the **Heterogeneous Extraction** branch where CSV files uploaded by admin were parsed into dynamic SQL tables (one table per CSV schema). It uses SQLAlchemy's `_TYPE_MAP` to convert inferred Python types to SQL column types.

After the merge, we configured it to fall back to SQLite if no `DATABASE_URL` environment variable points to a real PostgreSQL server:
```python
if not db_url or "postgresql" not in db_url:
    db_url = "sqlite:///./onboardguard.db"
```
So it still works, just against SQLite in the current development environment.

---

### Q14: How do you prevent sensitive data (Aadhar, PAN) from being stored in plain text?

**Answer:**  
Currently, the `pan_number` field in the `candidates` table is masked in the UI using `••••••••••` (the frontend never renders the raw value). The PAN column in SQLite stores the value received from the AI extraction.

A production-grade implementation would use **column-level encryption** (e.g., AES-256 via SQLAlchemy's encryption extension `sqlalchemy-utils.EncryptedType`) before writing to the DB, and decrypt only in authenticated API calls.

---

### Q15: What happens if ChromaDB or MongoDB goes down? Does the whole system fail?

**Answer:**  
No, by design. Both the ChromaDB and MongoDB saves in the extraction pipeline are wrapped in `try...except` blocks:
```python
try:
    chroma_handler.store_embeddings(...)
    mongo_handler.store_document_metadata(...)
except Exception as storage_err:
    yield f"⚠ Vector storage warning: {str(storage_err)}"
```
The warning is logged and streamed to the user, but execution continues. The most important save — the **SQLite knowledge base commit** — happens in a separate `try...finally` block afterwards. So even if the vector stores are unavailable, the extracted data is still saved to SQLite.

---

### Q16: What is the difference between the `knowledge_base` in SQLite and the data in MongoDB?

**Answer:**  
- **SQLite `knowledge_base`** is a **merged, processed JSON** — it's the combined, cleaned output from all documents (resume + marksheets + ID cards) used directly by the LangGraph validation agents.
- **MongoDB `documents` collection** stores the **raw, unprocessed extraction result** per document — including the original OCR text (`raw_text`) and the exact JSON the AI produced before any normalization.

Think of SQLite as the "working copy" and MongoDB as the "archive backup."

---

### Q17: What is the vision model used for OCR? Why that specific model?

**Answer:**  
We use `meta/llama-3.2-90b-vision-preview` via the **Groq API**. We chose it because:
- It's a multimodal model — it accepts both text and image inputs.
- Groq's inference API is extremely fast (low latency vs. OpenAI).
- The 90B parameter size handles complex, real-world document layouts (multi-column PDFs, handwritten text in marksheets) far better than smaller vision models.
- The `llama-4-scout` model was originally used but caused `400 Bad Request` errors due to MIME type handling issues with certain image formats, so we switched to the more stable `llama-3.2-90b-vision-preview`.

---

### Q18: How does the Interview Agent integrate with OnboardGuard?

**Answer:**  
The integration is **data-level, not code-level**. They share the same `candidates` table in SQLite:
1. After a candidate is `shortlisted` (set by the Interview Agent based on `match_score`), their `status` is updated to `interviewed` and `interview_score` is written to the DB.
2. The OnboardGuard dashboard reads the `status` column and only shows the "Upload Documents" step for candidates whose status is `interviewed` or `onboarding`.
3. This way, neither module needs to import from the other — they communicate through the shared database state.

---

### Q19: What was the Git strategy for merging the three branches?

**Answer:**  
We did not use `git merge` to combine branches into `main`. Instead, we created a new feature branch `merged-features` locally and manually integrated the code changes from all three branches:
- `develop-interview-agent`: Interview orchestration, STT, YOLO anti-cheat.
- `develop-heterogeneous-extractor`: Embedding generator, ChromaDB, MongoDB, LangGraph.
- `develop-document-validation`: OnboardGuard UI, validation logic, candidate pipeline.

This approach avoids merge conflicts on `main` and allows the mentor to review the full integration as a clean Pull Request on the `merged-feature` branch.

---

### Q20: If you were to scale this to 10,000 candidates, what would you change?

**Answer:**  
1. **Replace SQLite with PostgreSQL** — SQLite has write-lock limitations under concurrent load. PostgreSQL supports true parallel writes.
2. **Add a job queue (Celery + Redis)** — The extraction pipeline (AI inference + embedding) should be done asynchronously by background workers, not inline in an HTTP request.
3. **ChromaDB → Pinecone or Weaviate** — For production scale, a managed vector DB with auto-scaling handles large embedding collections far better than local ChromaDB.
4. **Encrypt PII columns** — Use `sqlalchemy-utils.EncryptedType` for Aadhar, PAN, and DOB fields.
5. **Add rate limiting** — Wrap all Groq API calls with exponential backoff and per-user rate limits.

---

## 🔑 PART 4: KEY TERMS CHEAT SHEET

| Term | Definition |
|---|---|
| **RAG** | Retrieval-Augmented Generation — using a vector store to feed relevant context to an LLM |
| **Heterogeneous Storage** | Using multiple DB types (SQL + NoSQL + Vector) together, each optimized for its data type |
| **Embeddings** | Text converted into a list of numbers (vector) that captures its semantic meaning |
| **ChromaDB** | Local vector DB that stores embeddings and supports cosine similarity queries |
| **LangGraph** | Framework for building stateful, multi-agent AI pipelines as directed graphs |
| **SSE** | Server-Sent Events — one-way HTTP streaming from server to browser |
| **BAAI/bge-base-en-v1.5** | The HuggingFace embedding model used here; produces 768-dim vectors |
| **GraphState** | The shared TypedDict that carries all data between LangGraph nodes |
| **Normalization** | Standardizing field names/values so they can be compared (e.g., `Full Name` → `full_name`) |
| **Cosine Similarity** | A metric to measure how similar two vectors are, regardless of magnitude |

---

## 🏗️ PART 5: HOW THE KNOWLEDGE BASE IS BUILT — DEEP DIVE

### Step 1 — Document Upload & Encryption

When HR uploads a document (Resume, PAN, Aadhar), the backend:
1. Encrypts the file using **Fernet symmetric encryption** (`cryptography` library) with a key stored in `.env` as `FERNET_KEY`.
2. Saves the encrypted bytes to disk under `backend/uploads/{candidate_id}/{doc_name}.{ext}`.
3. Writes the file paths to `candidates.documents` (a JSON column in SQLite):

```json
{
  "resume": "/home/.../uploads/riya_patel_e1cb66/resume.pdf",
  "pan": "/home/.../uploads/riya_patel_e1cb66/pan.pdf",
  "forensic_alerts": []
}
```

---

### Step 2 — The Extraction Pipeline (SSE Stream)

Triggered by `POST /api/v1/extract/{candidate_id}` — returns a **Server-Sent Events** stream.

```
For each document in candidates.documents:
    │
    ├─1. Decrypt → volatile temp file (never persisted decrypted)
    │
    ├─2. Route by file type:
    │     .txt / .log  →  Read directly (no AI needed)
    │     .pdf         →  Try pypdf text extraction first
    │                    If text < 100 chars → scanned PDF detected
    │                    → convert_from_path() → page images → Vision OCR
    │     .png/.jpg    →  Direct Vision OCR (base64 encoded)
    │
    ├─3. Vision OCR (if needed):
    │     Model: meta-llama/llama-4-scout (or llama-3.2-90b-vision-preview)
    │     API: Groq (async, 120s timeout)
    │     Input: data:image/png;base64,<encoded_bytes>
    │     Output: Raw text string
    │     Multi-page PDFs: parallel asyncio.gather() on all page tasks
    │
    ├─4. parse_to_json():
    │     Model: llama-3.3-70b-versatile (text-only LLM)
    │     API: Groq, response_format={"type": "json_object"}, 60s timeout
    │     Prompt: Identifies doc type + extracts specific onboarding fields
    │     Output: { "document_type": "Resume", "extracted_data": { ... } }
    │
    ├─5. Vectorization:
    │     Model: BAAI/bge-base-en-v1.5 (HuggingFace, runs locally on CPU)
    │     Output: 768-dimensional float vector
    │     Long text: chunked at 1500 chars, averaged per chunk
    │
    ├─6. ChromaDB save:
    │     collection.upsert(
    │       id = "{candidate_id}_{doc_name}",   # e.g., "riya_patel_e1cb66_resume"
    │       embedding = [0.234, -0.012, ...],   # 768 floats
    │       document = "raw text (first 10000 chars)",
    │       metadata = { "candidate_id": "...", "doc_type": "resume" }
    │     )
    │
    ├─7. MongoDB save:
    │     db.documents.insert_one({
    │       "candidate_id": "riya_patel_e1cb66",
    │       "doc_type": "resume",
    │       "raw_text": "Full OCR text...",
    │       "parsed_json": { "full_name": "Riya Patel", ... },
    │       "created_at": datetime.utcnow()
    │     })
    │
    └─8. Knowledge Base merge:
          knowledge_base["resume"] = { "full_name": "Riya Patel", ... }
          knowledge_base["pan"]    = { "pan_number": "ABCDE1234F", ... }

After ALL documents processed:
    → candidates.knowledge_base = JSON.dumps(knowledge_base)  [SQLite commit]
```

**What the Knowledge Base looks like after extraction:**
```json
{
  "resume": {
    "full_name": "Riya Patel",
    "email": "riya.patel@example.com",
    "phone": "8888888888",
    "current_company": "StartupHub",
    "current_role": "Software Developer",
    "total_experience": "2 Years",
    "current_ctc": "800000 INR",
    "graduation_degree": "B.Sc Computer Science",
    "graduation_college": "Mumbai University",
    "graduation_year": "2020"
  },
  "pan": {
    "document_type": "PAN Card",
    "pan_number": "ABCDE1234F",
    "full_name": "RIYA PATEL",
    "dob": "01/11/1998"
  },
  "marksheet_10th": {
    "document_type": "10th Marksheet",
    "school_name": "St. Xavier's High School",
    "year_of_passing": "2014",
    "percentage": "87.4%",
    "board": "CBSE"
  }
}
```

---

## ✅ PART 6: HOW VALIDATION WORKS — SEMANTIC SCORING ENGINE

### The 4-Node LangGraph Validation Pipeline

```
POST /api/v1/validate/{candidate_id}
         │
         ▼
   Load from SQLite:
     kb   = candidate.get_knowledge_base()   ← extracted from docs
     form = candidate.get_form()             ← original CSV data
         │
         ▼
   LangGraph: run_validation_workflow(kb, form, existing_validations)
         │
    ┌────▼─────────────────────────────────────────────────────────┐
    │ NODE 1: normalization_node                                    │
    │                                                               │
    │  Input:  raw form_data keys (as-is from CSV)                 │
    │  e.g.:   "Email ID", "Phone No.", "Date of Birth (DD/MM/YY)" │
    │                                                               │
    │  Process: normalize_form_data()                               │
    │  1. is_important_field() → drops:                            │
    │     - Timestamps, consent fields, emergency contacts          │
    │     - Upload/signature fields, IT system access               │
    │     - Nomination, gratuity, medical, insurance fields         │
    │  2. normalize_field_name() → maps to canonical names:        │
    │     "Email ID"           → "email"                           │
    │     "Phone No."          → "phone"                           │
    │     "Date of Birth"      → "dob"                             │
    │     "Aadhaar Number"     → "aadhar_number"                   │
    │                                                               │
    │  Output: normalized_form = { "email": "riya@...", ... }      │
    └────────────────────────┬─────────────────────────────────────┘
                             │
    ┌────▼─────────────────────────────────────────────────────────┐
    │ NODE 2: validation_node                                       │
    │                                                               │
    │  Input: knowledge_base + normalized_form                      │
    │                                                               │
    │  Step A: _build_flat_kb(knowledge_base)                       │
    │    - Flattens nested KB into a single key-value dict          │
    │    - Normalizes all keys (lowercase, underscore)              │
    │    - Source prefixes for marksheets:                          │
    │        marksheet_10th.percentage → also stored as:           │
    │        "10th_percentage", "percentage_10th"                   │
    │                                                               │
    │  Step B: For each form field → _find_kb_value()              │
    │    1. Direct exact match in flat_kb                           │
    │    2. Alias lookup via KB_FIELD_LOOKUP table                  │
    │       (e.g., "aadhar_number" → checks "aadhaar", "aadhar")   │
    │    3. Fuzzy fallback: substring match on normalized key names │
    │                                                               │
    │  Step C: values_match(form_value, doc_value, field_type)     │
    │    → Full semantic scoring (see below)                        │
    │                                                               │
    │  Step D: Manual overrides respected                           │
    │    - If field was manually accepted/rejected by HR reviewer,  │
    │      that decision is preserved on re-validation              │
    └────────────────────────────────────────────────────────────┘
```

---

### The `values_match()` Semantic Scoring Engine

This function is the brain of the validation system. It applies 9 strategies **in order**:

```
values_match(form_value="2020", doc_value="2014", field_type="graduation_year")

Strategy 1: Exact normalized match
  normalize("2020") == normalize("2014")? → NO → continue

Strategy 2: Gender strict check (only for gender/sex fields)
  → Not a gender field → skip

Strategy 3: Date normalization (for dob/date/birth fields)
  normalize_date("2020") → None (not a date string)
  → skip

Strategy 4: Phone normalization (for phone/mobile/contact fields)
  → Not a phone field → skip

Strategy 5: ID strict match (for aadhar/pan/bank/ifsc fields)
  → Not an ID field → skip

Strategy 6: Location matching (for address/location fields)
  → Not a location field → skip

Strategy 7: Degree matching (for degree/qualification/school/college)
  → Not a degree field → skip

Strategy 8: Numeric comparison (for ctc/salary/year/experience/marks)
  ✓ field_type contains "year" → IS a numeric field
  
  is_year check: field_type contains "graduation_year"? → YES
  → EXACT YEAR MODE ENGAGED
  float("2020") = 2020.0, float("2014") = 2014.0
  abs(2020 - 2014) = 6 → NOT < 1.0
  → return (False, "Year mismatch: '2020' ≠ '2014'")

Result: INCORRECT ✕
```

**All 9 matching strategies explained:**

| # | Strategy | Fields Used For | Logic |
|---|---|---|---|
| 1 | **Exact normalized match** | All fields | Lowercase, strip punctuation, compare |
| 2 | **Gender strict** | `gender`, `sex` | Must match exactly — no substring |
| 3 | **Date normalization** | `dob`, `date`, `birth` | Both values → `YYYY-MM-DD`, then compare |
| 4 | **Phone normalization** | `phone`, `mobile`, `contact` | Strip country code, keep last 10 digits |
| 5 | **ID strict match** | `aadhar`, `pan`, `bank`, `ifsc` | Strip special chars, uppercase, strict equality; supports masked `XXXX` suffix |
| 6 | **Location matching** | `address`, `location` | Normalize city aliases (e.g., Bangalore = Bengaluru) |
| 7 | **Degree matching** | `degree`, `college`, `school` | Expand abbreviations (B.Sc → bachelor of science), word overlap check |
| 8 | **Numeric comparison** | `ctc`, `year`, `experience`, `marks` | Extract digits, handle lakh↔absolute scaling (80,000 vs 8), exact match for years |
| 9 | **Semantic fuzzy** | All remaining | `difflib.SequenceMatcher` confidence: ≥80% = CORRECT, 60–79% = Suspicious, <60% = INCORRECT |

---

### JSON-Aware Comparison (Structured Experience Data)

When the AI extracts experience as a structured list:
```json
[{"company": "StartupHub", "total_experience": "2 Years", "current_ctc": "800000 INR"}]
```

And the CSV has `experience = "2"`, a naive comparison would fail.

The fix in `values_match()`:
```python
# Detect if doc_value is a JSON string
if dv.startswith('[') or dv.startswith('{'):
    parsed = json.loads(dv)
    if isinstance(parsed, list):
        first = parsed[0]
        # Look for: total_experience, experience, value, text, degree, year
        dv = str(first.get("total_experience", first))
    # dv is now "2 Years"

# Numeric comparison:
fv_num = "2"  →  float("2") = 2.0
dv_num = "2"  →  float("2") = 2.0   (extracted from "2 Years")
abs(2.0 - 2.0) = 0  → CORRECT ✓
```

---

### Scoring Formula

```python
total_fields = correct_count + incorrect_count + ambiguous_count
overall_score = round((correct_count / total_fields) * 100, 1)
```

**Example from Riya Patel's report:**
```
correct    = 5  (name, email, phone, dob, experience)
incorrect  = 1  (graduation_year: 2020 ≠ 2014)
ambiguous  = 7  (gender, aadhar, pan, degree, college, company, ctc)

score = (5 / 13) * 100 = 38.5%
```

**Why so many Ambiguous fields?**
Ambiguous means the field was in the CSV but the AI couldn't find it in any uploaded document.
Resolution:
- HR can click **✓ Accept** (manually marks field as CORRECT, reason: "Manually marked")
- HR can click **✕ Reject** (marks as INCORRECT)
- These overrides persist across re-validations (stored in `candidates.validation_result`)

---

### Manual Override Persistence

When HR resolves an ambiguous field:
```
POST /api/v1/resolve/{candidate_id}
Body: { "field": "gender", "resolution": "CORRECT" }

→ Updates validation_result JSON in SQLite
→ Sets reason = "Manually marked as CORRECT by reviewer"
→ Recalculates score with new counts
→ New score = (6/13) * 100 = 46.2%
```

On the next Re-Validation:
```python
# validation_node checks for manual overrides FIRST
if "Manually marked" in v.get("reason", ""):
    manual_overrides[v["field"]] = v   # Preserved as-is
```
This means manual HR decisions are **never overwritten** by the AI on subsequent runs.

---

## 🔐 PART 7: SECURITY DESIGN

| Feature | Implementation |
|---|---|
| **Document Encryption at Rest** | Fernet AES-128 (symmetric) — key in `.env` as `FERNET_KEY` |
| **PAN Masking in UI** | Frontend renders `••••••••••` — raw value never sent to browser |
| **PII Redaction API** | `GET /api/v1/documents/{id}/{doc}/redacted` — serves auto-redacted PDFs on the fly |
| **Temp File Cleanup** | Decrypted files are written to `/tmp`, processed, then `os.remove(temp_path)` in `finally` block |
| **JWT Auth** | All admin routes protected by JWT Bearer tokens (`/auth/login`, `/auth/me`) |
| **CORS** | Configured per-origin in FastAPI middleware |


## ❓ Mentor Q&A: Integration of Hetro Extraction & OnboardGuard

### Q1. How did you merge the Heterogeneous Extraction branch with the OnboardGuard validation pipeline?
**Answer:**
We bridged them by pointing the extraction engine (`DocumentService.extract_and_store_document` from the Hetro branch) to process the decrypted, volatile memory files generated by OnboardGuard. Instead of keeping two separate databases, we mapped the Hetro pipeline (which natively stores structured JSON and ChromaDB embeddings) into the central OnboardGuard `candidates` table. Once the Hetro Engine parses the raw text and JSON into the `knowledge_base` dictionary, it is committed back to the unified SQLite `onboardguard.db` and PostgreSQL `data_extraction` databases, enabling the LangGraph validation node to instantly compare it against the onboarding form.

### Q2. How is the Knowledge Base constructed and stored for a candidate?
**Answer:**
The knowledge base is dynamically built by decrypting the candidate's files (Resume, Marksheets, Aadhar, PAN, I-9, etc.) on the fly. The Hetro Engine extracts:
1. **Raw Text:** Which is vectorized using `generate_embeddings` and stored in ChromaDB (with the ID format `{candidate_id}_{doc_type}`).
2. **Structured JSON Data:** Extracted via specialized LLM prompts. 
These extracted JSON structures from all documents are aggregated into a single `knowledge_base` dictionary. This dictionary is then serialized and stored in the `knowledge_base` Text column of the `Candidate` schema.

### Q3. How does the validation actually work? Can you explain semantic scoring?
**Answer:**
The validation workflow uses LangGraph. It takes the newly constructed `knowledge_base` and the user-submitted `onboarding_form` (CSV/Excel) and passes them to the validation node.
It flattens the nested JSON KB and normalizes the keys. Then, the `values_match()` engine compares each form field to the KB document value using a sequence of 9 strategies:
1. **Exact string match** (case-insensitive)
2. **Gender strict checks**
3. **Date normalization** (YYYY-MM-DD conversion)
4. **Phone normalization** (last 10 digits)
5. **ID strict match** (for PAN/Aadhar, ignoring hyphens/spaces)
6. **Location mapping** (aliases like Bangalore -> Bengaluru)
7. **Degree matching**
8. **Numeric scaling** (handling absolute numbers vs. "Lakhs")
9. **Semantic Fuzzy Match** (using sequence matching confidence, where ≥80% is CORRECT).
If it doesn't match confidently, it marks it as AMBIGUOUS or INCORRECT. The final score is `(correct / total_fields) * 100`.

### Q4. What happens when a PAN Card is forged? How does the pipeline detect and report it?
**Answer:**
During the initial document upload phase, before the file is even encrypted, the system performs **Document Forensics**. It reads the PDF metadata (using `pypdf`) and checks the `/Creator` and `/Producer` tags. If it detects graphic design software like Photoshop, Illustrator, or Canva, it flags a `TAMPER RISK`. 
These alerts are appended to the `forensic_alerts` list within the candidate's `documents` JSON. 
To display this in the Candidate Pipeline UI, we updated the `admin_routes.py` to cross-reference the Application email with the OnboardGuard Candidate database, pulling the `forensic_alerts` and injecting them into the `CandidateProfile` payload, which then aggressively renders a red forgery warning before the AI assessment.

### Q5. What database schema changes were required for this unified integration?
**Answer:**
We standardized on a unified `candidates` table that serves all three systems (Interview Agent, Extraction, OnboardGuard). 
```sql
CREATE TABLE candidates (
    id VARCHAR PRIMARY KEY,             -- Unique string ID (cand_<hash>)
    email VARCHAR UNIQUE NOT NULL,      -- Used to join with Applications/CandidateAccounts
    status VARCHAR DEFAULT 'applied',
    documents TEXT,                     -- JSON: Encrypted file paths & forensic_alerts
    knowledge_base TEXT,                -- JSON: Aggregated Hetro Extraction data
    onboarding_form TEXT,               -- JSON: Form data from CSV
    validation_result TEXT,             -- JSON: Detailed scoring & field statuses
    is_validated BOOLEAN,
    tamper_warning BOOLEAN
    -- Plus standard fields: resume_path, match_score, interview_score, etc.
);
```
We also ensured that both `app.db.database` (used by OnboardGuard) and `candidate.db.database` (used by Auth/Pipeline) point to the same database engine (PostgreSQL if `DATABASE_URL` is set, falling back to SQLite `onboardguard.db`).

### Q6. Why did we move away from `window.alert` and `window.confirm`?
**Answer:**
Legacy browser popups block the main JavaScript thread, are difficult to style, and don't match the modern, space-themed "Mission Control" UI we implemented across the Enterprise Dashboard. We replaced them with asynchronous API calls coupled with a unified Toast notification system (`showToast`) to ensure a non-blocking, responsive, and visually consistent user experience.

### Q7. How did you test the final integrated product?
**Answer:**
We ensured all the required backend services and databases were initialized by wiping the old test databases and fully migrating the merged schemas via SQLAlchemy for both PostgreSQL and SQLite. We verified that the frontend was successfully hitting the single unified port `8000` via the frontend `.env` logic. Candidate Registration API was verified to ensure the `mobile` field mapped properly without Internal Server Errors. Finally, the AI Extraction stream endpoint, document forensic check integration, and the dashboard's Job CRUD logic were all tested to make sure the platform works synchronously without any missing mock API responses.

