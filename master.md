# Master Log

This document tracks all conversations, solutions provided, file changes, and summaries date-wise.

## Date: 2026-02-06

### Conversation Overview

**Topic**: Initial Analysis of "Problem Statement_ Automated Candidate Onboarding Validation System.docx"
**User Request**: Understand the document, propose an efficient build strategy with reasons, provide a Mermaid architecture diagram, and maintain this master log.

### Actions Taken

- [ ] Initialized `master.md`.
- [ ] Read and analyzed the problem statement.
- [ ] Proposed architecture and stack.

### Solutions & Changes

* **Analyzed Problem Statement**: The goal is to build an automated validation system for candidate onboarding.
* **Proposed Solution**:
  * **Stack**: Python (FastAPI), LLMs (GPT/Llama) for extraction/validation, PostgreSQL (JSONB).
  * **Architecture**: Ingestion -> LLM Extraction -> Structured Knowledge Base -> Semantic Validation -> Report.
* **Artifacts Created**:
  * `read_docx.py`: Script to extract text from the provided problem statement.
  * `Architecture_Design.md`: Detailed breakdown of the efficient build strategy and Mermaid architecture diagram.

### Key Decisions (Why?)

* **LLMs over Regex**: Essential for parsing unstructured resumes and handling semantic ambiguity (e.g., "B.E." vs "Bachelor of Engineering").
* **LLMs over Regex**: Essential for parsing unstructured resumes and handling semantic ambiguity (e.g., "B.E." vs "Bachelor of Engineering").
* **Structured JSON**: Converting all inputs to a common schema allows for standardized comparison logic.

### Follow-up Request (LangGraph & Infra)

**User Request**:

* Implement **LangGraph** with a clean, modular directory structure (subgraphs, state).
* Ensure **Environment Separation** & **Secrets Management**.
* Setup **CI/CD** with GitHub Actions.
* **Frontend/Backend Segregation** and **Authentication**.
* **Action**: Created `implementation_plan.md` detailing the folder structure and tech stack for approval.

### Refinement (Guardrails, SSO, & Deployment)

**User Feedback**:

* Requested **guardrails** for input/output safety.
* Requested **Google SSO** for auth.
* Clarified **Local Conda Env** preference and **Unified CI/CD**.
* Critiqued LangGraph simplicity; requested "proper" complex structure.
* Requested **guardrails** for input/output safety.
* Requested **Google SSO** for auth.
* Clarified **Local Conda Env** preference and **Unified CI/CD**.
* Critiqued LangGraph simplicity; requested "proper" complex structure.
* **Updated Plan**: Added guardrail nodes, retry loops, Google OAuth flow, and `requirements.txt`.

### Implementation Decisions

* **LangGraph**: Implemented a StateGraph with `extraction`, `validation`, and `guardrails` nodes.
  * **Orchestration**: `backend/app/langgraph/orchestration.py`
  * **Advanced Flow**: Includes retry logic if output guardrails fail.
* **Frontend**: React (Vite) with segregated `services/api.js`.
* **Auth**: Implemented Mock Google Login (Frontend) and Token Verification (Backend).
* **CI/CD**: Created `.github/workflows/main-pipeline.yml` for unified testing.

### Final Delivery

* System is fully implemented.
* See `walkthrough.md` for run instructions.

### Refinement Phase (Refactoring, Vector DB, Tailwind)

**User Feedback**:

* **Error**: Relative imports failing in backend.
* **Feature request**: `npm run build` should be served by Backend (Single Artifact).
* **Feature request**: Integrate **Vector Database** (Knowledge Base) as per original problem statement.
* **Feature request**: Use **TailwindCSS** for better UI.
* **Scope Refinement**: Explicitly handle **HR Transcripts** and **RAG-based Citations** to meet "Explainability" requirements.
* **Action**: Updated Plan to include Ingestion Subgraph (ChromaDB), Citation Logic, and Granular Metrics (Correct/Ambiguous/Incorrect %).

### Implementation Status: Refinement Completed

* **RAG Implemented**: Added `ingestion` subgraph causing `ChromaDB` indexing.
* **Validation Logic**: Updated to use `VectorDBService` for source lookup and % scoring.
* **Frontend Upscaled**: Integrated **TailwindCSS** for a modern dashboard.
* **Deployment**: Configured FastAPI (`app.main`) to mount the `frontend/dist` at root.
* **Metric**: Added `scores` object to API response for granular tracking.

### Next Steps

* Run `npm run build` in frontend.
* Start backend with `uvicorn app.main:app`.
* Navigate to `localhost:8000` to see the full system.

## Date: 2026-02-06 (16:16)

### Conversation Overview

**Topic**: **Multi-Modal Ground Truth & Advanced Validation Logic**
**User Request**:

* **Multi-Modal**: Support *Aadhar Card* (Identity/Address), *Call Recordings* (Transcript), *Resume*, *Education Certs* (10th/12th/Degree), *Signatures*.
* **Logic**: Precedence rules (Current > Permanent Address), specific Education/Employment checks.
* **Dataset**: Create a realistic sample dataset (1-2 candidates).
* **UI**: Improve "neatness" (verify Tailwind).
* **Research**: Identify standard onboarding documents.

### Research: Standard Onboarding Documents

1. **Identity**: Aadhar Card (India), Passport, PAN Card.
2. **Address Proof**: Rent Agreement (Current), Aadhar/Passport (Permanent).
3. **Education**:
   * **Class 10th/12th**: Verifies DoB and Father's Name.
   * **Degree Certificate**: Verifies Qualification.
4. **Employment**: Relieving Letter (Last Co.), Pay Slips (Last 3 months).
5. **Interviews**: HR Screening Transcript (Salary/Notice Period confirmation).

### Action Plan

1. **Update Schema**: Expand `CandidateProfile` to support multi-modal fields (Aadhar, 10th, 12th).
2. **Mock Ingestion**: Since we can't easily run OCR on Aadhar locally without heavy deps, we will *simulate* the extraction of these documents for the "Sample Dataset".
3. **Validation Logic**: Implement "Cross-Check" rules (e.g., specific Name match from Aadhar, DoB from 10th).
4. **UI**: Fix Tailwind configuration (PostCSS) and update Dashboard to show "Ground Truth" sources.

### Detailed Architecture (Production-Grade)

* **Data Models Defined**: `AadharData`, `EducationMarksheet`, `ResumeData`, `HRTranscriptData`, `GroundTruth`.
* **Precedence Rules**:
  * Address: HR Transcript (Current) > Resume > Aadhar (Permanent).
  * DOB: 10th Marksheet > Aadhar.
  * Name: Aadhar = 10th (Legal Match).
  * Employment: Relieving Letter > HR Transcript > Resume.
* **Tech Stack**: FastAPI + LangGraph + ChromaDB + Groq (LLM) + Whisper (Audio) + Tesseract (OCR).
* See `implementation_plan.md` for full details.

### Implementation Complete ✅

* **Mock Dataset**: 2 candidates (Rahul Sharma, Priya Patel) with realistic data.
* **Validation Engine**: Precedence-based logic comparing form data to Ground Truth.
* **Modern UI**: Dark theme Dashboard with TailwindCSS, Ground Truth panel, Metrics cards.
* **API**: `/api/v1/validate` returns detailed report with source citations.
* **Testing**: Sample data with intentional errors to demonstrate validation.

**Run Command**: `cd backend && uvicorn app.main:app --port 8000` then open `http://localhost:8000`.

backend/app/
├── langgraph/                          ← ALL processing logic lives here
│   ├── state.py                        ← Shared state definition
│   ├── orchestration.py                ← Graph: input_guard → ingestion → extraction → normalization → validation → output_guard
│   └── subgraphs/
│       ├── ingestion/
│       │   ├── graph.py                ← Node: reads files, OCR, transcription
│       │   └── tools.py                ← Tools: Groq Vision OCR, PDF, DOCX extraction
│       ├── extraction/
│       │   └── graph.py                ← Node: LLM extracts structured data
│       ├── normalization/
│       │   └── __init__.py             ← Node: maps CSV fields → canonical names, filters junk
│       ├── validation/
│       │   ├── graph.py                ← Node: smart matching, produces auditable results
│       │   └── tools.py                ← Tools: field mapping, phone/location/abbreviation matching
│       └── guardrails/
│           └── guards.py               ← Security guards
├── services/
│   └── llm_service.py                  ← Only Groq API calls (extraction + Whisper)
└── api/routes/
    ├── validation.py                   ← API endpoints (uses LangGraph orchestration)
    ├── auth.py                         ← Google SSO
    └── upload.py                       ← File upload
