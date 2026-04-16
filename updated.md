# OnboardGuard: Comprehensive Enterprise Documentation

This document serves as the canonical map tracing the evolution of the OnboardGuard extraction, routing, and security architecture during its modernization cycles. It combines all historical logs, architectural designs, error mitigations, and feature upgrades into a single, cohesive technical manual.

---

## 1. Executive Summary
OnboardGuard is an enterprise-grade, AI-driven candidate onboarding validation system. It autonomously cross-references self-reported candidate data (via forms/CSV) against physical ground-truth documents (resumes, government IDs, marksheets, and audio transcripts) to detect discrepancies and minimize manual HR verification efforts.

### Core Technology Stack
*   **Backend**: FastAPI, Uvicorn, SQLite/PostgreSQL, LangGraph
*   **AI Models**: Groq (Llama 3.3 for NLP, LLaVA for Vision), Whisper (Audio)
*   **Frontend**: React v19, React Router v7, Tailwind CSS v4, Vite
*   **Security**: `cryptography` (Fernet AES-256), `PyMuPDF` (Redaction)

---

## 2. High-Level Architecture & Workflow

The ecosystem operates on a modular, decoupled architecture driven by the **LangGraph Orchestration Engine**.

```mermaid
architecture-beta
    group client(cloud)[Presentation Layer]
    group app(cloud)[Application Layer - FastAPI]
    group ai(cloud)[AI Inference Layer]
    group data(database)[Data & Security Layer]

    service frontend(internet)[React SPA] in client
    service api(server)[REST API Router] in app
    service langgraph(server)[LangGraph Orchestrator] in app
    service groq(cloud)[Groq LLM/Vision/Whisper] in ai
    service db(database)[Relational DB] in data
    service fs(disk)[AES Encrypted Local FS] in data

    frontend:R --> L:api
    api:B --> T:langgraph
    api:R --> L:db
    api:R --> L:fs
    langgraph:T --> B:groq
```

### The Ingestion to Validation Pipeline
1.  **HR Uploads CSV**: Structured inputs establish the baseline data.
2.  **Candidate Uploads Documents**: Files are immediately encrypted and injected into the pipeline.
3.  **Extraction Node**: Documents are decrypted in-memory, chunked, and pushed to AI Vision/Whisper via massively parallel async arrays to extract the "Truth".
4.  **Normalization Node**: Extracted text is canonically standardized.
5.  **Validation Node**: Sophisticated fuzzy-matching compares Form Data against Extracted Data, scoring fields as `CORRECT`, `INCORRECT`, or `AMBIGUOUS`.
6.  **Human-in-the-Loop Override**: Administrators use the React dashboard to clear ambiguities safely without re-triggering inference.

---

## 3. Engineering Marvels & Mitigations

### 3.1. Zero-Trust Security & Cryptography
*   **Encryption at Rest**: Highly sensitive Personal Identifiable Information (PII) files (Aadhar, PAN, Resumes) previously dumped globally into plaintext `/uploads` are now intercepted in `upload.py`. The stream is locked under an **AES-256 Fernet** cipher prior to hitting the disk.
*   **Volatile Memory Decryption**: LangGraph utilizes a specialized context-manager (`decrypted_tempfile`) which unlocks binary data into active system RAM, conducts LLM extraction, and instantly destroys the unlocked memory block.
*   **Auto-Redaction Pipelines**: When a recruiter opens a PDF, the FastApi backend uses `PyMuPDF` to paint black blocks over PAN and Aadhar character sequences before serving it to the browser.
*   **Document Forensics**: Integrates EXIF metadata scanning on inbound PDFs. If graphic design fingerprints (Adobe Photoshop, Canva) are found, the system triggers a `TAMPER RISK [High]` alarm to catch forged degrees or payslips.

### 3.2. Asynchronous Parallelization & Rate Limit Safeties
*   **Horizontally Mapped Execution**: Legacy LangGraph models ran synchronously (15 seconds per document). Now, the system loops over documents and executes `asyncio.gather(*tasks)`, causing documents to be evaluated simultaneously.
*   **Error Isolation**: Async arrays use `return_exceptions=True`. If a single parsing node fails, the framework natively catches the error instead of crashing the entire HTTP connection.
*   **HTTP 429 API Exhaustion Prevention**: Vertically parallelizing 20 pages of OCR hits Groq rate limits. We wrapped our `LLMService` in `@retry(tenacity)` exponentially backing off execution queues safely without timeout crashes.

### 3.3. Advanced Data Extraction & Vision Splitting
*   **JSON-Enforced Sandboxing**: Moved completely away from fragile `Regex` scraping. We now explicitly constrain Groq outputs utilizing `response_format={"type": "json_object"}`, mathematically forcing synthetic dictionaries and dropping hallucination gaps to zero.
*   **Asymmetric OCR (Page Sharding)**: Large scanned PDFs are pushed through `pdf2image`. The system dynamically splits pages into shards and feeds them recursively to the Groq Vision model.
*   **Whisper Truncation Solutions**: Massive audio transcripts (>25MB) would break standard Whisper APIs. Using `pydub`, our backend cleanly slices audio dynamically into 5-minute pieces, pushing fragments concurrently to the AI, and subsequently stitching them back together natively.
*   **Semantic "Fuzzy" Confidence Matching**: `values_match()` now leverages Python's `difflib.SequenceMatcher` to look past minor typos mapping form data (e.g., "B.Tech" merging flawlessly with "Bachelor of Technology").

---

## 4. Frontend Ecosystem (React Modernization)

*   **Modular Web Architecture**: The original 700+ line `App.jsx` monolith was completely dismantled into atomic components (`SelectedBanner`, `DocumentViewerModal`, etc.) mapped across proper `react-router-dom` layers.
*   **Real-Time Event Streaming**: Replaced blocking spinner elements with Server-Sent Events (SSE) directly from Langchain's `astream_events()`. The UI showcases a cinematic, streaming terminal terminal rendering AI sub-system logs sequentially.
*   **Cybernetic Aesthetics**: Overhauled CSS from rudimentary templates into a glowing, glassmorphic layout. Components feature `backdrop-blur` structures, asynchronous SVG animatics, and non-obstructive ambient gradient meshes entirely mapped via `TailwindCSS v4`.
*   **Traversable State Constraints**: Developed the `SelectedBanner` anchor component providing an `✕ Deselect` override, allowing the admin to instantly exit a targeted applicant scope without reloading the browser layout. 

---

## 5. Conclusion
OnboardGuard successfully transcends traditional validation engines by combining cryptographic security methodologies with violently horizontal asyncio optimizations. It is an end-to-end, deterministic solution capable of ingesting noisy real-world documentation to produce clean, enterprise-grade HR insights.
