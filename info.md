# Recro — AI-Powered Interview System
### Branch: `feat/stt_to_whisper`

---

## Table of Contents
1. [What This Project Does](#1-what-this-project-does)
2. [What This Branch Specifically Does](#2-what-this-branch-specifically-does)
3. [System Architecture](#3-system-architecture)
4. [Full End-to-End Workflow](#4-full-end-to-end-workflow)
5. [Module Breakdown](#5-module-breakdown)
6. [Technology Stack & Why](#6-technology-stack--why)
7. [Anti-Cheating System](#7-anti-cheating-system)
8. [STT Engine Deep Dive](#8-stt-engine-deep-dive)
9. [Project Structure](#9-project-structure)
10. [How to Run](#10-how-to-run)

---

## 1. What This Project Does

Recro is a **full-stack, end-to-end AI hiring platform** that automates the entire technical interview process. It replaces human interviewers for the initial screening and evaluation stages.

**Core capabilities:**
- Admin uploads a Job Description (PDF/DOCX) — the system extracts skills, seniority, and evaluation criteria automatically
- Candidates upload their resume — the system semantically scores it against the JD (not keyword matching — actual meaning)
- Admin shortlists based on scores, or the system auto-shortlists above 60% match
- A shortlisted candidate starts an **AI-conducted voice interview** — questions are asked by the AI, candidate speaks, audio is transcribed, the AI evaluates answers and decides follow-ups
- The camera monitors for cheating in real time using computer vision
- After the interview, the system generates a full report with per-answer scores, cheating summary, and a Hire / No Hire recommendation

---

## 2. What This Branch Specifically Does

**Branch:** `feat/stt_to_whisper`  
**Core change:** Replaces Azure Speech Services (cloud STT) with **local OpenAI Whisper** for audio transcription.

### The Problem This Solves
The `main` branch uses Azure Cognitive Services for Speech-to-Text:
- Requires `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`
- Makes a network call to Azure per audio file
- Costs money per minute of transcribed audio
- Fails if the API key expires or Azure is down

### What Changed
| Component | Before (main) | After (this branch) |
|-----------|--------------|---------------------|
| STT Engine | `AzureSpeechToText` | `WhisperSpeechToText` |
| Model | Azure cloud API | `faster-whisper` (`large-v3-turbo`) locally |
| Network calls | Yes (per transcription) | None — fully offline |
| API keys needed | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | None for STT |
| Cost | Pay-per-minute | Free |
| Factory (`stt/factory.py`) | Reads `STT_PROVIDER` env var | Hard-wired to Whisper |

### Architecture of the STT module

```
interview_orchestration/stt/
├── base.py           ← Abstract base class: transcribe(audio_path) → str
├── azure_stt.py      ← Azure implementation (kept, not used on this branch)
├── whisper_stt.py    ← NEW: faster-whisper local implementation
└── factory.py        ← Singleton factory — returns WhisperSpeechToText()
```

The factory uses a **singleton pattern** — Whisper loads once at startup, then every interview reuses the same model in memory. This avoids the 2-4 second model load time per request.

### Whisper Configuration (via `.env`)
```
WHISPER_MODEL=large-v3-turbo     # model size (default)
WHISPER_DEVICE=cpu               # cpu or cuda (GPU)
WHISPER_COMPUTE=int8             # int8 for CPU, float16 for GPU
WHISPER_CPU_THREADS=8            # parallelism on CPU
WHISPER_LANGUAGE=en              # skip auto-detect overhead
WHISPER_BATCHED=false            # enable batched pipeline for GPU
```

### Also on this branch
- Local filesystem storage (`backend/infra/local_storage_helper.py`) replaces Azure Blob Storage for dev
- All files stored under `datasets/` instead of Azure containers
- Full E2E interview pipeline tested and working (commit history confirms: "Working code E-to-E")

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)              │
│  Admin UI ←→ http://localhost:3000  ←→ Candidate UI         │
└────────────────────────┬────────────────────────────────────┘
                         │ REST (Axios)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│  /auth/*   /admin/*   /user/*   /interview/*                │
│                                                             │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ JD Pipeline  │  │ Resume Pipeline│  │ Interview Loop │  │
│  │ (LangGraph)  │  │  (LangGraph)   │  │  (LangGraph)   │  │
│  └──────────────┘  └────────────────┘  └────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  Groq LLM   │  │ Whisper STT    │  │  YOLOv8n +     │  │
│  │  (Llama 3)  │  │ (local, fast)  │  │  SentenceBERT  │  │
│  └──────────────┘  └────────────────┘  └────────────────┘  │
│                                                             │
│  data.json (dev DB)   datasets/ (local file storage)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Full End-to-End Workflow

### Stage 1 — Admin: Upload Job Description

```
Admin → POST /admin/jd/upload (PDF/DOCX)
         │
         ▼
   Text extraction (pypdf / python-docx)
         │
         ▼
   JD Intelligence Graph (LangGraph)
   ┌─────────────────────────────────┐
   │ normalize_jd                    │  ← Clean raw text
   │ role_context                    │  ← Extract job title, seniority
   │ skill_intelligence              │  ← Identify core skills + weights
   │ competency_model                │  ← Depth, experience requirements
   │ interview_filter                │  ← Build interview requirements
   └─────────────────────────────────┘
         │
         ▼
   Result stored in data.json → JD marked ACTIVE
```

---

### Stage 2 — Candidate: Upload Resume

```
Candidate → POST /user/resume/upload (PDF/DOCX)
              │
              ▼
        Text extraction
              │
              ▼
        Resume Intelligence Graph (LangGraph)
        ┌──────────────────────────────────────────────────┐
        │ normalize_resume      ← Clean resume text         │
        │ resume_claims         ← Extract projects, skills  │
        │ evidence_mapping      ← Map skills to JD pillars  │
        │ semantic_match        ← Cosine similarity (MiniLM)│
        │   ├─ core_skill_match                             │
        │   ├─ project_alignment                            │
        │   └─ conceptual_alignment                         │
        │ exaggeration_penalty  ← Penalise buzzword claims  │
        │ jd_parser             ← Parse JD for comparison   │
        │ final_scoring         ← Calculate fit score 0-1   │
        │ admin_insights        ← Generate readable summary  │
        └──────────────────────────────────────────────────┘
              │
              ▼
        Resume stored → status = UNDER_REVIEW
        Auto-shortlist if score > 0.6 OR 4+ matched skills
```

---

### Stage 3 — Admin: Shortlist

```
Admin → GET /admin/candidates
         (sees all resumes with match scores, insights)
         │
         ▼
Admin → POST /admin/candidates/{id}/shortlist
         { "decision": "SHORTLISTED" }
         │
         ▼
        resume.status = SHORTLISTED
        resume.interview_unlocked = true
```

---

### Stage 4 — Focus Area Selection

```
POST /user/interview/start  (or /admin/interview/start/{id})
        │
        ▼
Focus Area Selection Graph
┌─────────────────────────────────────────┐
│ Takes: JD intelligence + Resume scores  │
│ Output: Top 5 topics unique to this     │
│         candidate's gaps and strengths  │
│ e.g. ["Python", "System Design",        │
│        "Databases", "API Design",       │
│        "Cloud Infrastructure"]          │
└─────────────────────────────────────────┘
        │
        ▼
Interview session created → status = IN_PROGRESS
First question generated by LLM
```

---

### Stage 5 — The AI Interview (Core Loop)

This is the heart of the system. The loop runs over **5 topics × 3 questions = 15 turns max**.

```
┌──────────────────────────────────────────────────────────┐
│                  INTERVIEW LOOP                           │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │ ask_initial_question                            │     │
│  │  LLM generates question for current topic       │─┐   │
│  └─────────────────────────────────────────────────┘ │   │
│           ↓                                           │   │
│     [UI displays question, records audio]             │   │
│           ↓                                           │   │
│  ┌─────────────────────────────────────────────────┐ │   │
│  │ POST /interview/{id}/answer (audio + type)      │ │   │
│  │  1. pydub: .webm → .wav (16kHz mono PCM)        │ │   │
│  │  2. Whisper: .wav → transcript text              │ │   │
│  │  3. Graph invoked with transcript                │ │   │
│  └─────────────────────────────────────────────────┘ │   │
│           ↓                                           │   │
│  ┌─────────────────────────────────────────────────┐ │   │
│  │ collect_text_answer                             │ │   │
│  │  Appends turn to interview_trace                │ │   │
│  └─────────────────────────────────────────────────┘ │   │
│           ↓                                           │   │
│  ┌─────────────────────────────────────────────────┐ │   │
│  │ cheating_detection                              │ │   │
│  │  Text: TOO_FAST / SIMILAR_PATTERN / AI_phrases  │ │   │
│  │  Visual: YOLO on buffered camera frames         │ │   │
│  └─────────────────────────────────────────────────┘ │   │
│           ↓                                           │   │
│  ┌─────────────────────────────────────────────────┐ │   │
│  │ decide_followup_or_next                         │ │   │
│  │  followup_count < 3  → FOLLOWUP                 │ │   │
│  │  more topics left    → NEXT_TOPIC               │─┘   │
│  │  all done            → EVALUATE                 │     │
│  └─────────────────────────────────────────────────┘     │
│           ↓ (on EVALUATE)                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │ evaluate_interview                              │     │
│  │  LLM grades every answer: score 0–10            │     │
│  │  Strengths, weaknesses, reasoning per turn      │     │
│  │  Cheating penalties applied to final score      │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
         ↓
  session.status = COMPLETED
```

#### Parallel Camera Monitoring (out-of-band)
While the loop above runs, the frontend continuously sends camera frames:
```
Every ~1 second:
Frontend → POST /interview/{id}/video-frame { frame: base64 }
                    │
                    ▼
            YOLOv8n → detect persons, phones, electronics
                    │
                    ▼
            Flags appended to cheating_events
            Penalties added to session.cheating_score
```

---

### Stage 6 — Report Generation

```
Admin → GET /admin/candidates/{id}/report
         │
         ▼
        Builds HTML report containing:
        ├─ Candidate personal details
        ├─ Resume-JD match score
        ├─ Shortlisting insights (from admin_insights node)
        ├─ Interview performance metrics
        │   ├─ Adjusted total score (cheating penalty applied)
        │   ├─ Decision confidence (HIGH / MEDIUM / LOW)
        │   └─ Cheating severity
        ├─ Question-by-question breakdown
        │   ├─ Question text
        │   ├─ Candidate's answer
        │   ├─ Strengths / weaknesses
        │   └─ Score + reasoning
        └─ Final recommendation: STRONG HIRE / HIRE / NO HIRE / NO HIRE (Integrity)
```

---

## 5. Module Breakdown

### `jd_intelligence/` — Job Description Pipeline
| Node | Purpose |
|------|---------|
| `normalize_jd` | Cleans raw JD text, removes formatting noise |
| `role_context` | Extracts job title, seniority level, primary role |
| `skill_intelligence` | Identifies core skills with depth weights |
| `competency_model` | Builds competency profile with experience thresholds |
| `interview_filter` | Defines primary focus areas and evaluation dimensions |

### `resume_intelligence/` — Resume Scoring Pipeline
| Node | Purpose |
|------|---------|
| `normalize_resume` | Cleans resume text |
| `resume_claims` | Extracts projects, responsibilities, experience signals |
| `evidence_mapping` | Maps each claim to a JD skill pillar |
| `semantic_match` | MiniLM cosine similarity: 3 independent scores |
| `exaggeration_penalty` | Detects buzzword-only claims (no evidence) |
| `jd_parser` | Re-parses JD in resume context |
| `final_scoring` | Combines all scores into 0–1 fit score, triggers auto-shortlist |
| `admin_insights` | Generates natural-language summary for admin dashboard |

### `focus_area_selection/` — What to Ask
Takes the JD intelligence + resume scores → selects top 5 topics where the candidate is either strong (confirm depth) or weak (probe gaps). Returns ordered list like `[{topic, rationale}]`.

### `interview_orchestration/` — The Interview Engine
| Node | Purpose |
|------|---------|
| `ask_initial_question` | LLM generates first question for a topic |
| `collect_text_answer` | Receives Whisper transcript, appends to trace |
| `cheating_detection` | Text + visual analysis, updates cheating_score |
| `decide_followup_or_next` | Routes: FOLLOWUP / NEXT_TOPIC / EVALUATE |
| `followup_question_generator` | LLM generates a deeper probe based on prior answer |
| `evaluate_interview` | LLM scores all answers 0–10 with written feedback |

---

## 6. Technology Stack & Why

| Technology | Role | Why chosen |
|-----------|------|-----------|
| **Python 3.12** | Backend language | Ecosystem for ML/AI is unmatched |
| **FastAPI** | REST API framework | Async-native — LLM calls are slow, can't block |
| **LangGraph** | AI pipeline orchestration | Stateful multi-agent graphs with conditional routing |
| **Groq + Llama 3.1-8B** | LLM (questions, evaluation, JD parsing) | 10× faster inference than OpenAI — critical for real-time |
| **faster-whisper** | Speech-to-text (this branch) | Local, free, no API latency, `large-v3-turbo` is fast+accurate |
| **pydub + FFmpeg** | Audio format conversion | Browser records `.webm`; Whisper needs `.wav` at 16kHz |
| **YOLOv8n** | Real-time camera fraud detection | 50ms/frame on CPU, 80 COCO classes include phones/people |
| **SentenceTransformers (MiniLM)** | Semantic resume↔JD matching + cheating detection | Meaning-aware similarity, not keyword matching |
| **React 18 + Vite** | Frontend UI | Fast HMR, handles WebRTC camera/audio natively |
| **React Router v7** | Client-side routing | Admin vs candidate route separation |
| **Axios** | HTTP client | Handles multipart form data (audio upload) |
| **JWT + bcrypt** | Auth | Stateless auth, role-based (admin / user) |
| **python-jose** | JWT decode/encode | Lightweight, works with FastAPI security dependencies |
| **SQLAlchemy (models defined)** | ORM — ready for prod DB | Models exist but dev uses `data.json` |
| **`data.json`** | Dev persistence | Zero-infra, swap to SQL via existing models in prod |
| **Local file storage** | File storage (this branch) | No Azure dependency for dev; same interface as Blob |
| **LangSmith** | LLM observability + tracing | Debugs graph executions, traces prompts and latencies |
| **pypdf + python-docx** | Document text extraction | Handles both PDF and DOCX resume/JD formats |

---

## 7. Anti-Cheating System

### Layer 1 — Text Analysis (per answer, post-transcription)
| Flag | Trigger | Score |
|------|---------|-------|
| `TOO_FAST` | >6 words/second (copy-paste speed) | +0.3 |
| `QUESTION_REPEATING` | Answer ≈ question (cosine sim > 0.85) | +0.4 |
| `SIMILAR_PATTERN` | Answer ≈ previous answer (cosine sim > 0.9) | +0.3 |
| `AI_GENERATED_SUSPECTED` | ≥2 generic ChatGPT phrases detected | +0.2 |

### Layer 2 — Visual Monitoring (real-time per camera frame)
| Flag | Trigger | Score |
|------|---------|-------|
| `MULTIPLE_PEOPLE_DETECTED` | >1 person with confidence >0.60 | +1.0 |
| `MOBILE_DETECTED` | Phone with confidence >0.30 | +1.0 |
| `COMBINED_MISCONDUCT` | Both people + phone | +1.5 |
| `CANDIDATE_OUT_OF_FRAME` | 0 people even at 0.35 threshold | +0.3 |
| `SUSPICIOUS_OBJECT_DETECTED` | Laptop/tablet/monitor visible | +0.5 |

### Layer 3 — Behavioural (frontend events)
| Event | Trigger | Score |
|-------|---------|-------|
| `TAB_CHANGE` | Candidate switches tab | +0.1 each |

### Final Score Adjustment
```
cheating_severity:
  score > 3.0  →  HIGH   →  "NO HIRE (Integrity)"
  score > 2.0  →  MEDIUM
  score ≤ 2.0  →  LOW

adjusted_interview_score = raw_score × (1 - min(0.5, cheating_score / 5.0))
```

---

## 8. STT Engine Deep Dive

### Audio Flow (this branch)
```
Browser (WebRTC MediaRecorder)
    ↓  .webm blob
POST /interview/{id}/answer
    ↓
pydub.AudioSegment.from_file()
    ↓  convert → 16kHz, mono, 16-bit PCM
.export(wav_path, format="wav")
    ↓
WhisperSpeechToText.transcribe(wav_path)
    ↓
faster_whisper.WhisperModel.transcribe()
    ├─ beam_size=5, best_of=5       ← accuracy
    ├─ vad_filter=True              ← silence handling (replaces Azure timeout)
    ├─ min_silence_duration_ms=3000 ← matches Azure's 3s end-silence
    └─ condition_on_previous_text   ← coherence across long answers
    ↓
Returns: plain text string (same signature as Azure version)
    ↓
Passed into LangGraph as `simulated_answer`
```

### Fallback Handling
- If conversion fails → tries Whisper on the original `.webm` directly
- If Whisper returns empty → `STT_NO_SPEECH_RECOGNIZED`
- If Whisper throws → `STT_FAILED: <error>`
- All fallbacks result in `"[submission_type] (No audible response captured)"` which the evaluator scores as 0.0

---

## 9. Project Structure

```
Recro/
│
├── backend/                        # FastAPI application
│   ├── main.py                     # All API endpoints (~1000 lines)
│   ├── auth.py                     # JWT creation, verification, role guards
│   ├── config.py                   # Pydantic settings (reads .env)
│   ├── database.py                 # JSON-based dev database
│   ├── models.py                   # Pydantic data models
│   ├── infra/
│   │   ├── local_storage_helper.py # Local file storage (replaces Azure Blob)
│   │   ├── azure_blob.py           # Azure Blob (kept, unused on this branch)
│   │   └── text_extraction.py      # PDF/DOCX → plain text
│   └── agent-sigmoid-venv/         # Python 3.12 venv (LOCAL, not global)
│
├── jd_intelligence/                # Stage 1: Parse Job Description
│   ├── graph.py                    # LangGraph pipeline definition
│   ├── state.py                    # JDState typed dict
│   └── nodes/                      # One file per processing step
│
├── resume_intelligence/            # Stage 2: Score Resume vs JD
│   ├── graph.py                    # 8-node LangGraph pipeline
│   ├── state.py                    # ResumeState typed dict
│   └── nodes/                      # normalize → claims → semantic → score
│
├── focus_area_selection/           # Stage 3: Pick interview topics
│   ├── graph.py
│   └── nodes/
│
├── interview_orchestration/        # Stage 4+5: Run the interview
│   ├── graph.py                    # Stateful interview loop (LangGraph)
│   ├── state.py                    # Stage4State typed dict
│   ├── nodes/
│   │   ├── ask_initial_question.py
│   │   ├── collect_text_answer.py
│   │   ├── cheating_detector.py    # YOLOv8 + SentenceBERT
│   │   ├── followup_decision_engine.py
│   │   ├── followup_question_generator.py
│   │   └── evaluator.py            # LLM grading agent
│   └── stt/                        # ← THIS BRANCH'S CORE CHANGE
│       ├── base.py                 # Abstract: transcribe(audio) → str
│       ├── azure_stt.py            # Azure implementation (not used)
│       ├── whisper_stt.py          # faster-whisper implementation ✅
│       └── factory.py              # Singleton: always returns Whisper
│
├── frontend/                       # React + Vite UI
│   ├── src/                        # Components, pages, hooks
│   └── package.json
│
├── datasets/                       # Local file storage
│   └── uploaded_docs/              # Resumes, JDs stored here
│
├── utils/                          # Shared helpers
├── .env                            # API keys and config
├── requirements.txt                # All Python dependencies
├── info.md                         # This file
└── start.sh                        # One-command startup script
```

---

## 10. How to Run

### Prerequisites
- Python 3.12
- Node.js 18+
- FFmpeg (`snap install ffmpeg` on Ubuntu)

### One command
```bash
cd /home/sigmoid/Desktop/RecroInter/Recro
./start.sh
```

### Manual (two terminals)
```bash
# Terminal 1 — Backend
cd /home/sigmoid/Desktop/RecroInter/Recro
backend/agent-sigmoid-venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
cd /home/sigmoid/Desktop/RecroInter/Recro/frontend
npm run dev
```

### URLs
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

### `.env` keys needed
```
GROQ_API_KEY=...              # Required — all LLM calls
LANGSMITH_API_KEY=...         # Optional — tracing
LANGSMITH_PROJECT=...         # Optional — tracing

# STT keys (NOT needed on this branch — Whisper is local)
# AZURE_SPEECH_KEY=...
# AZURE_SPEECH_REGION=...

# Whisper tuning (optional — defaults work)
WHISPER_MODEL=large-v3-turbo
WHISPER_DEVICE=cpu
WHISPER_COMPUTE=int8
```
