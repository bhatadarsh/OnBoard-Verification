# AI HirePro Enterprise

> **AI-powered end-to-end recruitment and onboarding compliance platform.** Two modules operate over a shared data layer: the **Interview Agent** handles talent acquisition (AI voice interviews, resume scoring, fraud detection), and **OnboardGuard** handles post-hire document verification and compliance (extraction, knowledge-base indexing, validation).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         AI HirePro Enterprise             
￼
 merged-features*
 0 
 0
Antigravity - Settings
Ignore
LF
UTF-8
Spaces: 4
Ln 22, Col 10
 yatinjadhav (1 month ago)
Productionizing HirePro Architecture and UI
how do we know the hetrogenous is really working alongside onboard guide?
and can you tell me here..
what is api..api endpoint route which we have used here...
undo
￼
Thought for 1s
chevron_right


You can verify that the heterogeneous storage is working by checking both the System Logs and the Health Endpoints I've built into the project.

1. How to know it's "really working"?
There are three ways to confirm this right now:

The Logs (Real-time): When you run an extraction, watch your terminal. You will see these specific lines:
Stored 1 embeddings in ChromaDB → Confirms the Vector Layer is active.
Stored document metadata: [ID] → Confirms MongoDB has saved the data.
The Health Check: You can visit this URL in your browser while the app is running:
http://localhost:8000/api/v1/health/db
It will return a JSON showing the status of your connections to SQLite, MongoDB, and ChromaDB.
The Filesystem: Look in your project folder for a directory named chroma_db/. If that folder exists and contains files, it means ChromaDB is successfully persisting your data.
2. The Core API Endpoints
Here are the primary routes (defined in backend/app/api/routes/validation.py) that bridge OnboardGuard and the Heterogeneous Engine:

Action	Endpoint (Route)	What it does
Upload Form	POST /api/v1/onboarding/up               │
│                                                                          │
│   ┌──────────────────────────┐   ┌───────────────────────────────────┐   │
│   │     Interview Agent       │   │          OnboardGuard             │   │
│   │   (Talent Acquisition)    │   │      (Compliance Engine)          │   │
│   │                           │   │                                   │   │
│   │  JD Upload → AI Scoring   │   │  CSV Import → Doc Upload          │   │
│   │  Resume Match             │   │  Auto-Extraction (background)     │   │
│   │  Voice Interview          │   │  KB Build → ChromaDB + MongoDB    │   │
│   │  YOLOv8 Anti-Cheat        │   │  LangGraph Validation             │   │
│   │  Evaluation Report        │   │  AES-256 PII Redaction            │   │
│   └────────────┬──────────────┘   └───────────────┬───────────────────┘   │
│                │                                   │                      │
│                └────────────┬──────────────────────┘                      │
│                             ▼                                             │
│                   ┌──────────────────┐                                    │
│                   │   FastAPI Backend │                                    │
│                   │   localhost:8000  │                                    │
│                   └──────────────────┘                                    │
│                             ▼                                             │
│                   ┌──────────────────┐                                    │
│                   │  React Frontend   │                                    │
│                   │  localhost:5173   │                                    │
│                   └──────────────────┘                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Module Breakdown

### Interview Agent

| Component | Technology | Description |
|-----------|-----------|-------------|
| JD Intelligence | LangGraph + Groq (Llama 3.3) | Parses job descriptions, extracts skill requirements |
| Resume Intelligence | LangGraph + Groq | Scores resumes against JD, produces semantic match |
| Focus Area Selection | LangGraph (`stage3_graph`) | Determines interview topics from candidate profile |
| Interview Orchestration | LangGraph + Groq (`stage4_graph`) | Generates adaptive follow-up questions |
| Speech-to-Text | Faster-Whisper (local) | Transcribes candidate audio responses offline |
| Anti-Cheat | YOLOv8 + OpenCV | Real-time object detection (phones, multiple people, tab switching) |
| Evaluation | LangGraph evaluator node | Per-answer scoring with strengths/weaknesses analysis |

### OnboardGuard (Compliance Engine)

| Component | Technology | Description |
|-----------|-----------|-------------|
| CSV Ingestion | FastAPI + SQLAlchemy | Parses HR onboarding forms, creates candidate records |
| Document Upload | FastAPI multipart | Accepts Aadhar, PAN, Resume, Marksheets, I-9 Form |
| PII Encryption | AES-256 (Fernet) | All uploaded files encrypted at rest |
| Document Forensics | PyMuPDF metadata scan | Detects Photoshop/GIMP/Canva tamper signatures |
| Extraction Engine | `DocumentService` + Groq Vision | LLM-powered OCR: extracts structured JSON from any document type |
| Knowledge Base (Vectors) | ChromaDB (PersistentClient) | Stores embeddings per document per candidate |
| Knowledge Base (Raw) | MongoDB | Raw text + parsed JSON metadata for full-text retrieval |
| Validation | LangGraph (`run_validation_workflow`) | Fuzzy + semantic cross-reference: KB vs CSV form data |
| PII Redaction | PyMuPDF redaction | On-demand redacted PDF — Aadhar and PAN auto-blacked |

---

## Tech Stack

### Backend
- **FastAPI** — unified API server (Interview Agent + OnboardGuard routes)
- **LangGraph** — stateful AI agent orchestration (4 pipeline stages + validation)
- **Groq API** — `llama-3.3-70b-versatile` (text) + `meta-llama/llama-4-scout-17b-16e-instruct` (vision/OCR)
- **Faster-Whisper** — local offline STT engine
- **YOLOv8 (Ultralytics)** — real-time object detection for anti-cheat
- **SQLAlchemy** — ORM for SQLite (OnboardGuard)
- **PyMuPDF (fitz)** — PDF parsing, redaction, and forensics
- **Cryptography (Fernet)** — AES-256 symmetric encryption for PII at rest
- **Pydub + FFmpeg** — audio conversion (WebM → WAV → Whisper)

### Frontend
- **React 18** (State-based routing without React Router)
- **Vite** — dev server and production bundler
- **Tailwind CSS v4** — utility-first styling
- **Custom design system** — Sigmoid Careers unified portal, dark theme, Outfit + Inter fonts
- **Unified Portals** — fully integrated Candidate & Admin dashboards (Job Postings, Applications, Interview Sessions, Verification Dashboards)

### Storage
- **ChromaDB** — local PersistentClient, cosine similarity HNSW
- **MongoDB** — pymongo, localhost:27017
- **SQLite** — OnboardGuard operational DB
- **Local filesystem** — AES-256 encrypted document storage

---

## Data Flow

```
HR uploads CSV
     │
     ▼
Candidate profiles created in SQLite
     │
HR uploads identity documents (Aadhar, PAN, Resume...)
     │
     ├── Documents AES-256 encrypted on disk
     │
     ▼
Auto-extraction triggered in background
     │
     ├── Document decrypted into volatile memory (tmpfile)
     ├── Groq Vision extracts text + structured JSON
     ├── Embeddings generated → ChromaDB (cosine HNSW index)
     ├── Raw text + metadata → MongoDB
     └── Knowledge Base committed to SQLite candidate record
     │
     ▼
HR runs Validation
     │
     ├── LangGraph workflow: for each form field
     │     ├── Fetch form value (CSV)
     │     ├── Query ChromaDB for semantic match in KB
     │     ├── Fuzzy + exact match scoring
     │     └── Result: CORRECT / INCORRECT / AMBIGUOUS
     │
     ▼
Validation results stored → score on Candidates page
```

---

## Running Locally

### Prerequisites
```bash
# Python 3.12, Node 20+, FFmpeg, MongoDB
sudo snap install ffmpeg
```

### Setup
```bash
# Clone and configure
cp .env.example .env
# Fill in GROQ_API_KEY and other values

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Start Everything
```bash
chmod +x start.sh
./start.sh
```

This starts:
1. **Backend** at `http://localhost:8000` (FastAPI + uvicorn)
2. **Frontend** at `http://localhost:5173` (Vite dev server)

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for LLM inference |
| `LLM_MODEL` | Text model (default: `llama-3.3-70b-versatile`) |
| `EMBEDDING_PROVIDER` | `huggingface` (local) or `openai` (API) |
| `EMBEDDING_MODEL` | Embedding model (default: `BAAI/bge-base-en-v1.5`) |
| `MONGO_URI` | MongoDB connection string |
| `CHROMA_PERSIST_DIR` | ChromaDB persistence path |

See [.env.example](.env.example) for the full list.

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register user (candidate or admin) |
| POST | `/api/v1/auth/login` | Login → JWT token |
| GET  | `/api/v1/auth/me` | Get current user |

### Interview Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/jd/upload` | Upload job description |
| POST | `/api/v1/user/resume/upload` | Upload + AI-score resume |
| POST | `/api/v1/admin/interview/start/{id}` | Launch interview session |
| GET  | `/api/v1/interview/{id}/question` | Get current question |
| POST | `/api/v1/interview/{id}/answer` | Submit audio answer |
| POST | `/api/v1/interview/{id}/video-frame` | YOLOv8 anti-cheat frame |

### OnboardGuard
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/onboarding/upload` | Import HR CSV → create candidates |
| POST | `/api/v1/documents/{id}` | Upload encrypted candidate documents |
| POST | `/api/v1/extract/{id}` | Run extraction → build KB (SSE stream) |
| POST | `/api/v1/validate/{id}` | Run LangGraph validation |
| POST | `/api/v1/resolve/{id}` | Resolve ambiguous validation field |
| GET  | `/api/v1/candidates` | List all candidates |
| GET  | `/api/v1/documents/{id}/{doc}/redacted` | Serve PII-redacted PDF |

---

## LangGraph Pipelines

```
Stage 1: JD Intelligence      → role_context, skill_intelligence, competency_profile
Stage 2: Resume Intelligence  → resume_claims, evidence_map, match_scores, final_score
Stage 3: Focus Area Selection → final_focus_areas (interview topics)
Stage 4: Interview Agent      → adaptive Q&A, scoring, cheating detection, evaluation
```

OnboardGuard validation runs a separate graph:
```
Validation Graph → field-by-field cross-reference → CORRECT / INCORRECT / AMBIGUOUS
```

---

## Security

- **AES-256 Fernet encryption** — all uploaded documents encrypted at rest
- **PDF forensics** — Photoshop/GIMP/Canva metadata detection flags tampered documents
- **PII redaction** — Aadhar (12-digit) and PAN (alphanumeric) auto-blacked via PyMuPDF
- **JWT authentication** — role-based (ADMIN / USER) access control
- **Zero plaintext persistence** — documents only decrypted into volatile tmpfiles during extraction

---

## Project Structure

```
Recro/
├── backend/                    # FastAPI backend
│   ├── main.py                 # Interview Agent routes + app factory
│   ├── app/api/routes/         # OnboardGuard routes (validation, extraction)
│   ├── app/core/               # DB config, settings
│   ├── auth.py                 # JWT auth helpers
│   └── models.py               # SQLAlchemy models
├── frontend/                   # React + Vite frontend
│   ├── src/components/         # UI components (InterviewSession, Dashboard, etc.)
│   ├── src/pages/              # Page views (AdminPortal, Candidates, Validate, etc.)
│   ├── src/api/client.js       # Axios API client
│   └── src/index.css           # Design system (CSS variables, animations)
├── candidate/                  # Candidate CRUD service
├── job_description/            # JD upload and management
├── jd_intelligence/            # LangGraph Stage 1 — JD parsing
├── resume_intelligence/        # LangGraph Stage 2 — Resume scoring
├── focus_area_selection/       # LangGraph Stage 3 — Interview topic selection
├── interview_orchestration/    # LangGraph Stage 4 — Adaptive interview
├── pipeline/                   # Full pipeline orchestrator
├── storage/                    # ChromaDB + MongoDB handler singletons
├── embeddings/                 # Embedding generator (HuggingFace / OpenAI)
├── extraction/                 # Document extraction (text, tables, charts, images)
├── ingestion/                  # File loading and type detection
├── metadata/                   # Relationship mapping and structure extraction
├── validation/                 # Document validation logic
├── audio/                      # STT engines (Whisper, speech)
├── config/                     # App settings
├── datasets/                   # Uploaded docs + interview traces
├── migrations/                 # Alembic DB migrations
├── tests/                      # Test suite
├── .env.example                # Environment variable template
├── start.sh                    # One-command startup script
├── requirements.txt            # Python dependencies
├── docker-compose.yml          # Docker services (MongoDB, PostgreSQL)
├── alembic.ini                 # Alembic migration config
└── yolov8n.pt                  # YOLOv8 model weights (anti-cheat)
```
