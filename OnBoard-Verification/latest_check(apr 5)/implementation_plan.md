# OnboardGuard: Optimization Analysis & Roadmap

After analyzing the entire codebase (FastAPI backend, LangGraph orchestration, Groq integration, and React frontend), the architecture is fundamentally strong. However, I have identified four critical bottlenecks that will cause the system to crash, run out of memory, or significantly slow down under high load.

## User Review Required

Please review the following optimization strategy. Let me know which of these you would like me to implement first, or if you want me to tackle all of them!

---

## Proposed Optimizations

### 1. AI Rate-Limit Crashing (Groq/LLM Service)
**The Problem:** Your `extraction_node` fires off up to 6 simultaneous LLM requests per candidate using `asyncio.gather()`. Since you are hitting Groq (which has tight TPM/RPM token rate limits), this aggressive bursting is causing **`429 Rate Limit Exceeded`** errors (as seen in your last server run). When it fails, it silently returns an empty dictionary `{}`, breaking the validation step.
**The Fix:**
- Introduce an `asyncio.Semaphore(2)` in `extraction/graph.py` to limit concurrent LLM requests to 2 at a time.
- Enhance the `tenacity` retry logic in `llm_service.py` to specifically dynamically backoff on `RateLimitError` exceptions.

### 2. Severe RAM Bloat during File Uploads
**The Problem:** In `validation.py`, your file upload logic uses `content = await file.read()` and then runs `fernet.encrypt(content)`. For large 20MB audio files or massive PDFs, this pulls the *entire* file into your server's RAM simultaneously. If 10 HR admins upload 5 files each at once, your server will hit Out-Of-Memory (OOM) fatal crashes.
**The Fix:** 
- Convert the upload endpoint to use **chunked processing** (`file.file.read(CHUNK_SIZE)`).
- Use a streaming cipher instead of Fernet, or encrypt chunks sequentially, writing to disk bit-by-bit instead of hoarding RAM.

### 3. Asymmetric Event-Loop Blocking (Database)
**The Problem:** You have defined all your FastAPI routes as `async def` (e.g., `async def validate_candidate`), but you are using synchronous standard SQLAlchemy (`sqlite3` / `sessionmaker`) for all database calls. A synchronous database call inside an `async` route completely blocks the ASGI event loop. This means while the DB is saving one candidate, *no other user can load the webpage or upload files*.
**The Fix:**
- Wrap database executions in `fastapi.concurrency.run_in_threadpool`, OR
- Upgrade `database.py` to use `aiosqlite` and `AsyncSession` so the event loop remains unblocked and highly concurrent.

### 4. Monolithic Frontend & Re-renders
**The Problem:** Your entire React application (`App.jsx`) is a single 760+ line monolithic file. You are handling "page routing" using a simple state variable `tab === 'home'`, meaning all components are loaded into the browser's bundle instantly. Furthermore, any state change (like a Toast notification appearing) forces the entire 700-line DOM tree to re-evaluate.
**The Fix:**
- Utilize `react-router-dom` (which is already in your `package.json` but unused) to split tabs into actual URLs (e.g., `/dashboard`, `/candidates`).
- Implement **React.lazy()** code-splitting so the browser only downloads the "Validation" page code when the user actually navigates there.

---

## Open Questions
> [!IMPORTANT]
> The Groq rate-limiting issue and the synchronous Database blocking are the highest-priority architectural flaws affecting scale. 
> 
> **How would you like to proceed? Do you approve of this roadmap, and which vector (1, 2, 3, or 4) should I begin refactoring first?**
