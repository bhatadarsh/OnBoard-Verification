# 🛡️ OnboardGuard - System Analysis & Optimization Plan

## 1. Current Technology Stack

### Frontend
- **React (v19) & React Router (v7)**: Modern, component-based UI and routing.
- **Vite (v7)**: Extremely fast development server and bundler.
- **Tailwind CSS (v4)**: Utility-first CSS framework for rapid styling.
- **Axios**: HTTP client for API interactions.
- **ESLint**: Standardized code linting.

### Backend
- **FastAPI / Python 3.10+**: High-performance async web framework.
- **Uvicorn**: ASGI server for running the FastAPI app.
- **SQLAlchemy (SQLite)**: ORM for database management.
- **LangGraph**: Workflow orchestration for the ingestion/validation pipelines.
- **Groq API (Llama 3.3)**: High-speed LLM service for data extraction and reasoning.
- **Whisper**: Audio transcription model for HR interview data.
- **PyPDF / python-docx**: Local document extraction utilities.

---

## 2. Key Areas for Improvement & Optimization

### A. Backend Performance & Async Paradigms 🚨
> [!IMPORTANT]  
> The system heavily relies on I/O-bound tasks (LLM requests, file reading) but is currently implementing them sequentially and synchronously. This blocks the FastAPI event loop and drastically reduces throughput.

- **Synchronous Groq Client in Async Functions**: `LLMService` uses the synchronous `Groq()` client. Invoking this inside `async def extraction_node` freezes the entire web server until the API responds. 
  - *Fix*: Switch to `AsyncGroq()` and `await` the completions.
- **Sequential Ingestion & Extraction**: The app loops over files (`for doc_type, text in document_texts.items():`) and extracts data one after another.
  - *Fix*: Use `asyncio.gather()` to run LLM extraction calls in parallel. Since Groq is highly parallelizable, extracting Aadhar, PAN, and Resume simultaneously will cut inference time by 60-80%.

### B. LLM Data Extraction Resilience & Structuring
> [!WARNING]  
> Data extraction relies on asking the LLM for `Key: Value` pairs and parsing them via RegEx string manipulation (`_parse_key_value()`). This is brittle and prone to silent failures.

- **Structured Output**: Transition from string-based prompting to **JSON Mode** or **function calling/tool use**. Groq natively supports `response_format={"type": "json_object"}`. Validating this directly with Pydantic avoids parsing errors entirely.
- **Retry Mechanisms**: Add a fallback or automatic retry (e.g., using Python's `tenacity` library or LangGraph built-in edges) for network failures when contacting Groq endpoints.

### C. Frontend Architecture & State
- **State Management**: The app lacks a dedicated global state manager. Integrating a lightweight option like **Zustand** will prevent prop-drilling as the application scales.
- **Data Fetching via React Query**: Replace raw `axios` calls with `@tanstack/react-query`. This provides automatic caching, background refetching, and drastically simplifies complex loading/error states.
- **Debounced Feedback Calls**: If the user rapidly toggles "Mark Correct/Ambigious" decisions on the UI, it could spam the API. Add UI-level debouncing for resolution endpoints.

### D. Infrastructure & Production Readiness (Security & Scale)
> [!CAUTION]  
> Before pushing this to production, there are significant security and scalability concerns regarding Personally Identifiable Information (PII) that must be addressed in this codebase.

- **Data Encryption for PII**: Right now, `upload.py` saves Aadhar, PAN, and Resumes in plain text directly to the file system (`backend/uploads/`). Because these are highly sensitive, they *must* be encrypted at rest using symmetric encryption (like AES or Fernet via a KMS key) before writing to disk or cloud storage.
- **API Authentication (RBAC)**: While frontend Google SSO might exist, the backend routes in `upload.py` and `validation.py` lack any role-based access control. Any user who knows the endpoint URL could theoretically fetch or upload PII. You need to add a `Depends(get_current_user)` guard.
- **Database Migration**: Switch from SQLite to **PostgreSQL**. The extraction system frequently passes dynamic JSON payloads, which maps perfectly to PostgreSQL's native `JSONB` column types.
- **Blob Storage**: Instead of storing files locally, shift to an object storage provider like **AWS S3** or **Google Cloud Storage** to allow horizontal scaling of the FastAPI instances.
- **Document Shredding/Retention Policy**: Implement a scheduled background job to securely delete (shred) PII documents a certain number of days after the validation is completed to comply with DPDP Act/GDPR.

### E. Graph Workflow Enhancements
- **Streaming UI Updates**: LangGraph processes in chunks. Exposing a Server-Sent Events (SSE) or WebSocket endpoint in FastAPI would allow the frontend to show realtime progress to the user (e.g., UI updating from "Ingesting..." → "Extracting..." → "Validating...").
