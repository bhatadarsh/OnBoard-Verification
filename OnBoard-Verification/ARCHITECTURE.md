---
description: Comprehensive overview of the OnboardGuard AI validation system architecture
---

# OnboardGuard: System Architecture & Workflow Specifications

## Executive Summary
OnboardGuard is an enterprise-grade, AI-driven candidate onboarding validation system. It is designed to autonomously cross-reference self-reported candidate data (received via structured forms) against physical ground-truth documents (resumes, government IDs, marksheets, and audio transcripts) to detect discrepancies and minimize manual HR verification efforts.

---

## 1. High-Level System Architecture

The ecosystem operates on a modular, decoupled architecture consisting of four primary tiers: the Presentation Layer, the Application Layer, the Data & Security Layer, and the AI Inference Layer.

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
    
    service db(database)[SQLite Relational DB] in data
    service fs(disk)[AES Encrypted Local FS] in data

    frontend:R --> L:api
    api:B --> T:langgraph
    
    api:R --> L:db
    api:R --> L:fs
    
    langgraph:T --> B:groq
```
*(Note: Mermaid beta architecture diagrams provide spatial visualization of the infrastructure)*

---

## 2. Core Validation Workflow

The sequential data flow follows a strict graph-based lifecycle driven by the **LangGraph Orchestration Engine**.

```mermaid
sequenceDiagram
    participant HR as HR Admin
    participant Cand as Candidate
    participant API as FastAPI Backend
    participant Graph as LangGraph Engine
    participant Groq as Groq AI Models
    participant DB as SQLite DB
    participant FS as Encrypted Storage

    %% Ingestion Phase
    HR->>API: 1. Upload Onboarding CSV (Self-Reported Data)
    API->>DB: Store Candidate Profiles & Form Data
    Cand->>API: 2. Upload Proof Documents (PDFs, Images, Audio)
    API->>FS: Encrypt via AES (Fernet) & Store locally
    
    %% AI Extraction Phase
    HR->>API: 3. Trigger Extraction Workflow
    API->>Graph: Initialize GraphState Context
    Graph->>FS: Decrypt documents into secure memory buffers
    Graph->>Groq: Transmit raw data to LLM, Vision, & Whisper endpoints
    Groq-->>Graph: Return structured JSON (Knowledge Base)
    Graph->>DB: Commit Extracted Knowledge Base
    
    %% Validation Phase
    HR->>API: 4. Trigger Validation Workflow
    API->>Graph: Map Form Data vs Knowledge Base
    Graph->>Graph: Standardize and fuzzy-match data points
    Graph->>DB: Store Validation Scores & Discrete Results
    
    %% Review Phase
    API-->>HR: 5. Return System Dashboard (Scores & Discrepancies)
    HR->>API: (Optional) Override Ambiguous Fields
    API->>DB: Commit Human-in-the-Loop Overrides
```

---

## 3. LangGraph Subgraph Execution Flow

The heart of the system is the intelligent state-machine graph (`app/langgraph/orchestration.py`) that governs the AI agents and heuristics. Execution is highly deterministic.

```mermaid
flowchart TD
    %% Node Definitions
    Start((Start))
    InputGuard{Input Guard}
    Ingestion[Ingestion Node: File Parsing & OCR]
    Extraction[Extraction Node: LLM JSON Generation]
    Normalization[Normalization Node: Data Standardization]
    Validation{Validation Node: Heuristic Matching}
    OutputGuard{Output Guard}
    End((End))

    %% Routing logic
    Start --> InputGuard
    InputGuard -- "Unsafe/Missing Data" --> End
    InputGuard -- "Safe Input" --> Ingestion
    
    Ingestion --> Extraction
    Extraction --> Normalization
    Normalization --> Validation
    Validation --> OutputGuard
    
    OutputGuard -- "Invalid DB" --> End
    OutputGuard -- "Safe Output" --> End

    %% Styling
    classDef guard fill:#f39c12,stroke:#d35400,color:white,font-weight:bold;
    classDef process fill:#3498db,stroke:#2980b9,color:white;
    classDef decision fill:#9b59b6,stroke:#8e44ad,color:white;
    
    class InputGuard,OutputGuard guard;
    class Ingestion,Extraction,Normalization process;
    class Validation decision;
```

---

## 4. Component Deep Dive

### 4.1. Data Ingestion & Cryptographic Security
* **Responsibility:** Securely handle raw data streams from the edge to the server.
* **Mechanism:** Upon upload, physical documents are intercepted and immediately encrypted at rest using **Fernet symmetric cryptography (AES)**. When a document must be processed, a context manager (`decrypted_tempfile`) securely mounts a decrypted slice into temporary memory and automatically shreds the payload from memory upon completion to ensure stringent PII protection.

### 4.2. LangGraph Orchestration Engine
* **Responsibility:** Maintain the unified `GraphState` across distributed asynchronous operations.
* **Mechanism:** 
  * Replaces fragile procedural code with a directed acyclic graph (DAG). 
  * Allows parallel concurrent execution (multi-threading extraction tasks across resumes and marksheets simultaneously).
  * Enforces state constraints via an `input_guard` and `output_guard` to preemptively detect corruption.

### 4.3. AI Extraction Service
* **Responsibility:** Convert unstructured or multi-modal contextual data into precise, predictable JSON schemas.
* **Mechanism:** 
  * Interfaces with Groq's high-speed inference engine.
  * Dynamically routs requests based on file type:
    * **Standard PDFs/Text:** `openai/gpt-oss-120b` (Standard instruction models)
    * **Scanned Government IDs (Aadhar/PAN):** `meta-llama/llama-4-scout` (Groq Vision Models)
    * **HR Audios:** `whisper-large-v3-turbo` (Speech-to-text integration with automated file chunking).

### 4.4. Heuristic Validation Engine
* **Responsibility:** Analyze relationships between self-reported structured data and the newly generated AI knowledge base.
* **Mechanism:** 
  * Iterates through all extracted metadata and compares fields using normalization formatting.
  * Grades every field into a strict schema: **CORRECT**, **INCORRECT**, or **AMBIGUOUS**.
  * Outputs an algorithmic trust threshold (validation score percentages).

### 4.5. Human-in-the-Loop (HITL) Framework
* **Responsibility:** Manage systemic edge cases and enforce administrative authority.
* **Mechanism:** Any flagged mismatches (or ambiguous predictions derived from fuzzy parsing logic) are highlighted in the React SPA. A reviewing officer interacts exclusively with the outliers, forcing specific overrides and updating database telemetry without re-running the heavy AI inference pipelines.
