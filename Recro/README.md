# AI-Powered Smart Interview System

## 🚀 Project Overview
The **AI-Powered Smart Interview System** is an advanced, automated capabilities-evaluation platform designed to streamline the technical hiring process. It leverages LLMs, and Voice Processing to conduct end-to-end assessments—from resume screening to real-time interactive technical interviews.

Unlike traditional keyword-matching tools, this system uses **Semantic Intelligence** to understand a candidate's actual depth of expertise, detects cheating in real-time, and generates comprehensive hiring reports with actionable recommendations.

## ✨ Key Features
*   **🧠 Resume Intelligence**: Automatically parses resumes, maps skills to Job Descriptions (JDs) using semantic matching, and calculates a "fit score" based on depth and experience.
*   **🎯 Smart Shortlisting**: Filters candidates based on core skill coverage, experience flexibility rules, and project alignment.
*   **🗣️ Interactive Voice Interview**: Conducts a real-time, voice-based technical conversational interview. The AI asks dynamic follow-up questions based on the candidate's actual answers.
*   **👁️ Visual & Behavioral Anti-Cheating**: Uses **YOLOv8** for real-time object detection (phones, multiple people) and text analysis to flag suspicious answer patterns.
*   **📊 Comprehensive Reporting**: Generates deep performance insights, including strengths, weaknesses, and a final "Hire/No Hire" recommendation.
*   **☁️ Enterprise-Grade Infrastructure**: Powered by **Azure Blob Storage** for secure document handling and **Azure Speech Services** for low-latency transcription.

## 🛠️ Technology Stack
*   **Backend**: Python, FastAPI
*   **AI Orchestration**: LangGraph (Stateful Multi-Agent Workflow)
*   **LLM Engine**: Groq (Llama-3-70B / Llama-3.1-8B for extreme speed)
*   **Speech Processing**: Azure Speech Services (STT) + Pydub (Audio Conversion)
*   **Computer Vision**: Ultralytics YOLOv8 (Real-time Object Detection)
*   **Vector Search**: SentenceTransformers (Semantic Matching)
*   **Storage**: Azure Blob Storage (Documents, Logs, Interview Traces)
*   **Data Persistence**: Hybrid In-Memory + JSON Persistence (extensible to SQL)

## 🏗️ System Architecture
The system follows a multi-stage pipeline:

1.  **Ingestion**: Resumes and JDs are uploaded to Azure Blob Storage; text is extracted and normalized.
2.  **Intelligence Graphs**:
    *   **JD Graph**: Extracts core skills, seniority.
    *   **Resume Graph**: Maps candidate experience to the valid JD pillars.
3.  **Focus Selection**: The system selects the top 5 pillars or topics unique to that candidate.
4.  **Interview Orchestration (LangGraph)**:
    *   **Node A**: Ask Question (Voice/Text).
    *   **Node B**: Transcribe & Analyze Answer.
    *   **Node C**: Detect Cheating (Visual/Text).
    *   **Node D**: Decide Next Step (Dig deeper vs. Next topic).
5.  **Evaluation**: Post-interview, the `Evaluator` agent grades every turn and compiles the Final Report.

## 💻 Local Environment Setup

### 1. Prerequisites
Before running the system, ensure you have the following installed:
*   **Python 3.10+**: Core programming language.
*   **Git**: For version control.
*   **FFmpeg**: Required for audio processing (converting WebM to WAV).
    *   *Mac*: `brew install ffmpeg`
    *   *Windows*: `winget install ffmpeg` (or add to PATH manually).
    *   *Linux*: `sudo apt install ffmpeg`

### 2. Installation
Follow these steps to set up the project locally:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Interview_System

# 2. Create a virtual environment
python -m venv venv

# 3. Activate the virtual environment
# Mac/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# 4. Install dependencies
pip install -r backend/requirements.txt
```

### 3. API & Cloud Configuration (Critical)
Create a `.env` file in the root directory and add the following keys:

```bash
# -----------------------------
# 🤖 LLM Engine (Groq)
# -----------------------------
GROQ_API_KEY="gsk_..."  # Get from console.groq.com. Model used: llama-3.1-8b-instant

# -----------------------------
# ☁️ Azure Blob Storage
# -----------------------------
# Connection string from Azure Portal -> Storage Account -> Access Keys
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"

# ⚠️ You MUST create these 3 containers in your Azure Storage Account:
# 1. resumes
# 2. job-descriptions
# 3. interview-traces

# -----------------------------
# 🗣️ Azure Speech Services
# -----------------------------
# From Azure Portal -> Cognitive Services (Speech)
AZURE_SPEECH_KEY="your_speech_key"
AZURE_SPEECH_REGION="eastus"  # e.g., eastus, westeurope

# -----------------------------
# ⚙️ Application Settings
# -----------------------------
STT_PROVIDER="azure"  # Options: 'azure', 'whisper' (local)
ACCESS_TOKEN_EXPIRE_MINUTES=300
SECRET_KEY="your_secret_key_for_jwt"
```

### 4. Running the Application
The easiest way to start the system is using the provided shell script:

```bash
# Make the script executable (first time only)
chmod +x start_stage1.sh

# Run the system
./start_stage1.sh
```

**Alternative (Manual Start):**
```bash
uvicorn backend.main:app --reload --port 8000
```

Once running, access the services:
*   **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
*   **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin) (If Frontend is running)
*   **User Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## 📋 End-to-End Workflow

### Step 1: Admin Setup
1.  Navigate to **Admin Dashboard**.
2.  Upload a Job Description (PDF/DOCX).
3.  The system analyzes the JD and extracts "Core Skills" & "Seniority Level".

### Step 2: Candidate Application
1.  Candidate logs in.
2.  Uploads their Resume (PDF/DOCX).
3.  The system runs **Resume Intelligence**:
    *   Maps skills to the Active JD.
    *   Calculates a Match Score (0-100%).
    *   Checks for experience gaps.

### Step 3: Admin Shortlisting
1.  Admin reviews the candidate list.
2.  Candidates with **Score > 60%** OR **4+ Matched Skills** are auto-shortlisted.
3.  Admin can manually Shortlist/Reject.

### Step 4: The AI Interview
1.  Shortlisted candidate clicks **"Start Interview"**.
2.  **Phase A**: System selects Top 5 Focus Areas (e.g., "Python", "System Design").
3.  **Phase B**: AI asks a voice question.
4.  **Phase C**: Candidate answers (Audio is recorded & transcribed).
5.  **Phase D**: AI analyzes the answer and asks dynamic follow-up questions (3 questions per topic).
6.  **Real-Time Cheating Detection**:
    *   📸 Camera checks for multiple people / phones.
    *   📝 Text analysis checks for "ChatGPT-style" responses.

### Step 5: Final Evaluation
1.  Once the interview ends, the **Evaluator Agent** grades every answer (1-10).
2.  Admin views the **Comprehensive Report**:
    *   Overall Score (Average of all answers).
    *   Cheating Severity (Low/Medium/High).
    *   Hiring Recommendation (Hire / No Hire).

---



## ❗ Troubleshooting
**Q: The interview audio isn't transcribing.**
A: Ensure **FFmpeg** is installed and accessible in your system PATH. The backend uses `pydub`, which relies on FFmpeg to convert WebM to WAV.

**Q: I get "403 Forbidden" on Azure.**
A: Check your `AZURE_STORAGE_CONNECTION_STRING` in `.env`. Ensure your IP isn't blocked by the Storage Account firewall.





