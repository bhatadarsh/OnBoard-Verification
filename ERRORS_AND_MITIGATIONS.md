# OnboardGuard: Errors, Loopholes & Mitigations Log

This document serves as an exhaustive audit trail tracing the structural flaws, architectural vulnerabilities, and logic loopholes that were historically present within the OnboardGuard Candidate Validation System, and the precise engineering methods utilized to safely mitigate them.

---

## 1. The "House of Cards" Asyncio Cancel Vulnerability
**The Problem:** 
We heavily upgraded the LangGraph extraction matrix to run natively utilizing asynchronous horizontal mapping—meaning if a candidate uploaded 5 documents, we launched 5 simultaneous network requests utilizing Python's `asyncio.gather()`. However, we discovered a lethal loophole: if even *one* document failed to parse (e.g., a micro-second network timeout on an Aadhar card), `asyncio` natively reacted by throwing an unhandled exception and **immediately cancelling/deleting all other successfully parsed documents**. 

**The Conclusion:**
Massively parallel ingestion frameworks completely collapse under partial failures if they lack granular exception isolation.

**The Mitigation:**
We explicitly injected `return_exceptions=True` into every single `asyncio.gather` array operation deep across the system (OCR mappings, Audio mappings, and generic File mappings). We then looped the resulting outputs with an `isinstance(Expection)` catch logic. If one page fails to parse, the system safely ignores it natively, isolating the error and successfully synthesizing all remaining operational pieces!

---

## 2. The PII Plain-text Storage Violation (Encryption at Rest)
**The Problem:** 
The platform is an explicitly sensitive HR application. When users dragged PAN cards, Aadhar records, and legal interviews into the application, the `upload.py` route dumped them globally into local `/uploads/` directories as completely unsecured Plain Text records.

**The Conclusion:**
This is a catastrophic deployment vulnerability regarding standard SOC-2 / GDPR operational mandates. Should the deployment cluster face any generic traversal breach, total applicant physical histories would be leaked violently.

**The Mitigation:**
Implemented the heavy-duty `cryptography` Python package to lock down data ingress boundaries utilizing absolute AES-256 (`Fernet`) Symmetric stream ciphering. 
Files hitting FastAPI are completely scrambled algorithmically *prior* to hitting the hard drive. 
When the LLM requires parsing rights, a strict internal context-manager unlocks the raw bytes deep into active, volatile local RAM, completes the extraction generation cycle, and instantly destroys the unlocked memory block mathematically.

---

## 3. The Brittle LLM Output (RegEx Hallucination Traps)
**The Problem:** 
Inside the original structure, the LangGraph extraction logic generated raw wall-of-text prompts from the AI structure and forcefully attempted to fish dict keys out using raw Python formatting like `re.search("CTCC: (\d+)")`. 

**The Conclusion:**
AI outputs behave non-deterministically globally. If Groq simply hallucinates a trailing comma (`" CTC , "`), the RegEx rules completely crash and cause the Extraction phase to fail silently producing missing dictionary values.

**The Mitigation:**
We discarded RegEx. We heavily parameterized Groq API hooks assigning `response_format={"type": "json_object"}` locally. This enforces strict programmatic alignment natively forcing the LLM to execute only inside standard JSON arrays. We can now cleanly utilize `json.loads(response)` operating under mathematically absolute guarantees.

---

## 4. Groq HTTP 429 Network Freezes (API Exhaustion)
**The Problem:** 
Because we successfully re-mapped standard OCR methodologies to slice highly-compressed global Scanned PDFs into arrays of discrete PNG shards dynamically sending them globally at `asyncio` speeds, we instantly broke Groq's network constraints. Hitting any AI endpoint with 24 pages in a single millisecond immediately creates a brutal `HTTP 429 Rate Limit` crash.

**The Conclusion:**
Vertical parallelization creates horizontal API choke points.

**The Mitigation:**
Augmented the `LLMService` hooks completely natively with the `tenacity` library. Utilizing `@retry(wait=wait_exponential)`, our API layer intelligently assesses Rate Limit exceptions locally and natively puts execution queues safely *to sleep* for multiple seconds, letting the API cool off before seamlessly resuming.

---

## 5. The Whisper Truncation Paradox (Network Bounds)
**The Problem:** 
Whenever Human Resources supplied large scale interview audio explicitly traversing >25MB limits natively required by generic Whisper integrations, the endpoint explicitly threw an extraction error and discarded the transcript violently.

**The Conclusion:**
Production audio structures (like a simple 40-minute `.M4a` internal HR dial) will dynamically shatter generalized LLM endpoints consistently.

**The Mitigation:**
Integrated `.ffmpeg` routing methodologies overlaid cleanly with `pydub.AudioSegment`. As massive network payload sizes mathematically trigger Whisper ceilings, our system evaluates the boundary locally and slices the interview structurally into perfect sub-5-minute blocks. The chunks simultaneously pass to Whisper, run OCR translation synchronously, and cleanly stitch the transcription texts natively back into a single clean blob!

---

## 6. The UX React Traversal Prison (State Locking)
**The Problem:**
Upon launching the initial application layer, whenever an HR Rep clicked a candidate name explicitly loading them into the "Active Candidate" target array, they became physically trapped inside the file upload architecture. No exit vectors existed preventing them from globally un-selecting a user without executing a full HTTP browser refresh mathematically destroying their memory cache.

**The Conclusion:**
Bad DOM architectural execution natively blocks simple high-frequency user switching.

**The Mitigation:**
We rebuilt the state management completely dropping a `SelectedBanner` anchor component locally. We provided the Rep a hyper-visible layout mechanism mapping an `✕ Deselect` override control directly routing logic to `setSelected(null)`, cleanly letting users bounce natively between targeted applications fluidly globally.
