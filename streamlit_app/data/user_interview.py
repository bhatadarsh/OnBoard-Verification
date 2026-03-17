# import streamlit as st
# from interview_orchestration.graph import stage4_graph

# # Role guard
# if st.session_state.get("role") != "user":
#     st.error("Unauthorized access")
#     st.stop()

# st.title("AI Interview")

# # Ensure interview_state exists
# state = st.session_state.get("interview_state")
# if not state:
#     st.error("No active interview. Please start the interview from the Status page.")
#     st.stop()

# # -------------------------
# # MIC TEST (optional)
# # -------------------------
# if st.checkbox("🎤 Test microphone (one-time check)"):
#     from streamlit_app.components.mic_answer import record_and_transcribe

#     st.info("Speak now for 5 seconds")

#     with st.spinner("Listening..."):
#         test_text = record_and_transcribe(5)

#     if test_text:
#         st.success("Mic working ✅")
#         st.code(test_text)
#     else:
#         st.error("Mic not capturing audio ❌")

# st.divider()

# # Interview UI
# st.markdown(f"**Interview Status:** {state.get('interview_status')}")

# if state.get("interview_status") == "ASKING_QUESTION":
#     st.markdown("### Question")
#     st.write(state.get("current_question"))

# elif state.get("interview_status") == "WAITING_FOR_ANSWER":
#     st.info("Please answer the question")

#     if st.button("🎤 Submit Answer"):
#         # For now use mic component if available, else ask for text
#         from streamlit_app.components.mic_answer import record_and_transcribe

#         with st.spinner("Recording..."):
#             answer_text = record_and_transcribe(state.get("answer_time_limit", 45))

#         if not answer_text:
#             st.warning("No audio captured — submitting placeholder text.")
#             answer_text = "(no audio captured)"

#         state["simulated_answer"] = answer_text
#         state["early_finish"] = True

#         # Advance graph
#         state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#         st.session_state["interview_state"] = state
#         from streamlit_app.utils.st_helpers import safe_rerun
#         safe_rerun()

# elif state.get("interview_status") == "PROCESSING_ANSWER":
#     st.info("Processing answer...")
#     # Allow graph to progress
#     state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#     st.session_state["interview_state"] = state
#     from streamlit_app.utils.st_helpers import safe_rerun
#     safe_rerun()

# elif state.get("interview_status") == "COMPLETED":
#     st.success("Interview completed")
#     st.write("Thanks for your time.")
#     st.write("Interview trace:")
#     for turn in state.get("interview_trace", []):
#         st.write(f"Q: {turn.get('question')} — A: {turn.get('answer_text')}")




# import sys
# import os
# import streamlit as st

# # -------------------------
# # FIX IMPORT PATH (FIRST)
# # -------------------------
# ROOT_DIR = os.path.abspath(
#     os.path.join(os.path.dirname(__file__), "..", "..")
# )
# if ROOT_DIR not in sys.path:
#     sys.path.insert(0, ROOT_DIR)

# from interview_orchestration.graph import stage4_graph
# from streamlit_app.components.mic_answer import record_and_transcribe

# # -------------------------
# # ROLE GUARD
# # -------------------------
# if st.session_state.get("role") != "user":
#     st.error("Unauthorized access")
#     st.switch_page("app.py")

# # -------------------------
# # INTERVIEW STATE GUARD
# # -------------------------
# if "interview_state" not in st.session_state:
#     st.error("No active interview. Please start from the status page.")
#     st.switch_page("pages/user_status.py")

# state = st.session_state["interview_state"]

# st.title("🎤 AI Interview")

# # -------------------------
# # OPTIONAL MIC TEST
# # -------------------------
# with st.expander("🎧 Test Microphone (one-time)"):
#     st.info("Speak for 5 seconds")
#     if st.button("Start Mic Test"):
#         with st.spinner("Listening..."):
#             test_text = record_and_transcribe(5)

#         if test_text:
#             st.success("Mic working ✅")
#             st.code(test_text)
#         else:
#             st.error("Mic not capturing audio ❌")

# st.divider()

# # -------------------------
# # STATUS DISPLAY
# # -------------------------
# st.markdown(f"**Interview Status:** `{state['interview_status']}`")

# # -------------------------
# # INVOKE GRAPH FOR FIRST QUESTION (NOT_STARTED)
# # Per contract: UI invokes the graph exactly once when status is NOT_STARTED
# # -------------------------
# if state.get("interview_status") == "NOT_STARTED":
#     # Run graph to generate the first question (initialize -> ask_initial_question)
#     state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#     st.session_state["interview_state"] = state
#     from streamlit_app.utils.st_helpers import safe_rerun
#     safe_rerun()

# # ======================================================
# # ASKING QUESTION
# # ======================================================
# if state["interview_status"] == "ASKING_QUESTION":
#     st.subheader("Question")

#     question = state.get("current_question")
#     if not question:
#         st.warning("Preparing next question...")
#     else:
#         st.write(question)

#     st.info("Click **Start Answer** when ready")

#     if st.button("▶️ Start Answer"):
#         # Move explicitly to WAITING_FOR_ANSWER
#         state["interview_status"] = "WAITING_FOR_ANSWER"
#         st.session_state["interview_state"] = state
#         from streamlit_app.utils.st_helpers import safe_rerun
#         safe_rerun()
#     else:
#         # Auto-skip if the reading window has elapsed without user action.
#         import time as _time
#         now_ts = _time.time()
#         reading_started = state.get("reading_started_at")
#         read_limit = state.get("read_time_limit", 20)

#         if reading_started and (now_ts - reading_started) >= read_limit:
#             # Mark as no response and advance the graph so the interview
#             # progresses to processing and subsequent question generation.
#             state["simulated_answer"] = "(no response - timed out)"
#             state["early_finish"] = True
#             state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#             st.session_state["interview_state"] = state
#             from streamlit_app.utils.st_helpers import safe_rerun
#             safe_rerun()

# # ======================================================
# # WAITING FOR ANSWER
# # ======================================================
# elif state["interview_status"] == "WAITING_FOR_ANSWER":
#     st.subheader("🎙️ Your Answer")

#     st.caption(
#         f"You have **{state.get('answer_time_limit', 45)} seconds** to answer"
#     )

#     if st.button("🎤 Record Answer"):
#         with st.spinner("Recording..."):
#             answer_text = record_and_transcribe(
#                 state.get("answer_time_limit", 45)
#             )

#         if not answer_text:
#             answer_text = "(No audio captured)"

#         # 🔑 Inject answer
#         state["simulated_answer"] = answer_text
#         state["early_finish"] = True

#         # 🔑 Advance graph ONLY ON USER ACTION
#         state = stage4_graph.invoke(
#             state,
#             config={"recursion_limit": 200}
#         )

#         st.session_state["interview_state"] = state
#         from streamlit_app.utils.st_helpers import safe_rerun
#         safe_rerun()

# # ======================================================
# # PROCESSING ANSWER (SHORT TRANSIENT STATE)
# # ======================================================
# elif state["interview_status"] == "PROCESSING_ANSWER":
#     st.info("Processing your answer...")

#     state = stage4_graph.invoke(
#         state,
#         config={"recursion_limit": 200}
#     )

#     st.session_state["interview_state"] = state
#     from streamlit_app.utils.st_helpers import safe_rerun
#     safe_rerun()

# # ======================================================
# # COMPLETED
# # ======================================================
# elif state["interview_status"] == "COMPLETED":
#     st.success("✅ Interview Completed")

#     st.subheader("Interview Summary")

#     for turn in state.get("interview_trace", []):
#         st.markdown(
#             f"""
# **Topic:** {turn['topic']}  
# **Q:** {turn['question']}  
# **A:** {turn['answer_text']}
# ---
# """
#         )

#     st.info("Your interview has been submitted for review.")

#     if st.button("⬅️ Back to Status"):
#         st.switch_page("pages/user_status.py")



# import sys
# import os
# import time
# import streamlit as st



# def tick_every_second():
#     time.sleep(1)
#     st.rerun()

# # -------------------------
# # FIX IMPORT PATH (FIRST)
# # -------------------------
# ROOT_DIR = os.path.abspath(
#     os.path.join(os.path.dirname(__file__), "..", "..")
# )
# if ROOT_DIR not in sys.path:
#     sys.path.insert(0, ROOT_DIR)

# from interview_orchestration.graph import stage4_graph
# from streamlit_app.components.mic_answer import record_and_transcribe

# # -------------------------
# # ROLE GUARD
# # -------------------------
# if st.session_state.get("role") != "user":
#     st.error("Unauthorized access")
#     st.switch_page("app.py")

# # -------------------------
# # INTERVIEW STATE GUARD
# # -------------------------
# if "interview_state" not in st.session_state:
#     st.error("No active interview. Please start from the status page.")
#     st.switch_page("pages/user_status.py")

# state = st.session_state["interview_state"]

# st.title("🎤 AI Interview")

# # -------------------------
# # OPTIONAL MIC TEST
# # -------------------------
# with st.expander("🎧 Test Microphone (one-time)"):
#     if st.button("Start Mic Test"):
#         with st.spinner("Listening..."):
#             text = record_and_transcribe(5)

#         if text:
#             st.success("Mic working ✅")
#             st.code(text)
#         else:
#             st.error("Mic not capturing audio ❌")

# st.divider()

# # -------------------------
# # STATUS DISPLAY
# # -------------------------
# st.markdown(f"**Interview Status:** `{state['interview_status']}`")

# # ======================================================
# # 1️⃣ BOOTSTRAP FIRST QUESTION
# # ======================================================
# if state["interview_status"] in (None, "NOT_STARTED"):
#     state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#     st.session_state["interview_state"] = state
#     st.rerun()

# # ======================================================
# # 2️⃣ ASKING QUESTION (READING PHASE – 20s)
# # ======================================================
# if state["interview_status"] == "ASKING_QUESTION":
#     st.subheader("Question")

#     st.write(state.get("current_question"))

#     # -------------------------
#     # ⏱️ Reading timer (20s)
#     # -------------------------
#     started_at = state.get("answering_started_at")

#     if not started_at:
#         state["answering_started_at"] = time.time()
#         started_at = state["answering_started_at"]

#     elapsed = int(time.time() - started_at)
#     remaining = max(0, state.get("answer_time_limit", 45) - elapsed)

#     st.info(f"🎤 You have **{remaining}s** to answer")

    

#     if st.button("▶️ Start Answer"):
#         state["interview_status"] = "WAITING_FOR_ANSWER"
#         state["answering_started_at"] = time.time()   # ✅ FIX
#         st.session_state["interview_state"] = state
#         st.rerun()


#     # 🔑 Auto countdown tick
#     if remaining > 0:
#         time.sleep(1)
#         st.rerun()

#     # ⌛ Auto-advance when reading time expires
#     if remaining == 0:
#         state["interview_status"] = "WAITING_FOR_ANSWER"
#         st.session_state["interview_state"] = state
#         st.rerun()


# # ======================================================
# # 3️⃣ WAITING FOR ANSWER (ANSWER PHASE – 45s)
# # ======================================================
# elif state["interview_status"] == "WAITING_FOR_ANSWER":
#     st.subheader("🎙️ Your Answer")

#     elapsed = int(time.time() - state["answering_started_at"])
#     remaining = max(0, state.get("answer_time_limit", 45) - elapsed)

#     st.warning(f"⏳ Answer time left: **{remaining}s**")

#     if st.button("🎤 Record Answer"):
#         with st.spinner("Recording..."):
#             answer = record_and_transcribe(remaining)

#         if not answer:
#             answer = "(no audio captured)"

#         state["simulated_answer"] = answer
#         state["interview_status"] = "PROCESSING_ANSWER"

#         st.session_state["interview_state"] = state
#         st.rerun()

#     # ⏱️ AUTO TICK (THIS IS THE KEY)
#     if remaining > 0:
#         tick_every_second()

#     # ⌛ TIMEOUT
#     if remaining == 0:
#         state["simulated_answer"] = "(no response – timed out)"
#         state["interview_status"] = "PROCESSING_ANSWER"
#         st.session_state["interview_state"] = state
#         st.rerun()


# # ======================================================
# # 4️⃣ PROCESSING ANSWER (GRAPH DECIDES NEXT STEP)
# # ======================================================
# elif state["interview_status"] == "PROCESSING_ANSWER":
#     st.info("🧠 Processing your answer...")

#     state = stage4_graph.invoke(state, config={"recursion_limit": 200})

#     # 🔑 RESET TIMERS AFTER GRAPH DECISION
#     state.pop("reading_started_at", None)
#     state.pop("answering_started_at", None)

#     st.session_state["interview_state"] = state
#     st.rerun()

# # ======================================================
# # 5️⃣ COMPLETED
# # ======================================================
# elif state["interview_status"] == "COMPLETED":
#     st.success("✅ Interview Completed")

#     st.subheader("Interview Summary")

#     for turn in state.get("interview_trace", []):
#         st.markdown(
#             f"""
# **Topic:** {turn['topic']}  
# **Q:** {turn['question']}  
# **A:** {turn['answer_text']}
# ---
# """
#         )

#     st.info("Your interview has been submitted for review.")

#     if st.button("⬅️ Back to Status"):
#         st.switch_page("pages/user_status.py")






import sys
import os
import time
from streamlit.components.v1 import html as st_html
import streamlit as st

# Fix import path so repository modules can be imported
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from interview_orchestration.graph import stage4_graph
from streamlit_app.components.mic_answer import record_and_transcribe

# Role guard
if st.session_state.get("role") != "user":
    st.error("Unauthorized access")
    st.switch_page("app.py")

# Ensure interview state exists
if "interview_state" not in st.session_state:
    st.error("No active interview. Please start from the status page.")
    st.switch_page("pages/user_status.py")

state = st.session_state["interview_state"]

st.title("🎤 AI Interview")

# Server-side expiry handling: ensure transitions happen on any rerun
try:
    # If reading window elapsed, transition to WAITING_FOR_ANSWER
    if state.get("interview_status") == "ASKING_QUESTION":
        reading_started = state.get("reading_started_at")
        read_limit = state.get("read_time_limit", 20)
        if reading_started and (time.time() - reading_started) >= read_limit:
            state["interview_status"] = "WAITING_FOR_ANSWER"
            state["answering_started_at"] = time.time()
            state["recording_started"] = False
            st.session_state["interview_state"] = state

    # If answer window elapsed, auto-submit and advance graph
    if state.get("interview_status") == "WAITING_FOR_ANSWER":
        answer_started = state.get("answering_started_at")
        answer_limit = state.get("answer_time_limit", 45)
        # If recording is in-progress, do not auto-submit here (record_and_transcribe blocks)
        if answer_started and (time.time() - answer_started) >= answer_limit and not state.get("recording_started"):
            state["simulated_answer"] = "(no response)"
            state = stage4_graph.invoke(state, config={"recursion_limit": 200})
            st.session_state["interview_state"] = state
            # persist optionally, but ignore persistence errors
            try:
                from streamlit_app.storage.azure_store import save_interview_trace
                from streamlit_app.storage.candidate_store import update_candidate
                cid = state.get("candidate_id")
                if cid:
                    save_interview_trace(cid, state.get("interview_trace", []))
                    update_candidate(cid, {"interview_trace": state.get("interview_trace", [])})
            except Exception:
                pass
            st.rerun()
except Exception:
    # tolerate transient state shape issues
    pass

# Optional mic test
with st.expander("🎧 Test Microphone (one-time)"):
    st.info("Speak for 5 seconds")
    if st.button("Start Mic Test"):
        with st.spinner("Listening..."):
            test_text = record_and_transcribe(5)
        if test_text:
            st.success("Mic working ✅")
            st.code(test_text)
        else:
            st.error("Mic not capturing audio ❌")

st.divider()
st.markdown(f"**Interview Status:** `{state.get('interview_status')}`")

# Bootstrap first question
if state.get("interview_status") in (None, "NOT_STARTED"):
    state = stage4_graph.invoke(state, config={"recursion_limit": 200})
    st.session_state["interview_state"] = state
    st.rerun()

# ASKING_QUESTION: show question + 20s reading countdown
if state.get("interview_status") == "ASKING_QUESTION":
    st.subheader("Question")
    st.write(state.get("current_question", "Preparing next question..."))

    if "reading_started_at" not in state or state.get("reading_started_at") is None:
        state["reading_started_at"] = time.time()
        st.session_state["interview_state"] = state

    read_limit = state.get("read_time_limit", 20)
    elapsed = int(time.time() - state["reading_started_at"])
    remaining = max(0, read_limit - elapsed)

    # Client-side countdown (JS) + server-side fallback tick
    try:
        js = """
        <div id='countdown'>Reading time left: <strong>{REM}s</strong></div>
        <script>
        var rem = {REM};
        var el = document.getElementById('countdown');
        function tick(){
            if(rem<=0){
                try{ window.parent.postMessage({type: 'streamlit:rerun'}, '*'); }
                catch(e){ window.location.href = window.location.href; }
                return;
            }
            el.innerHTML = 'Reading time left: <strong>' + rem + 's</strong>';
            rem -= 1;
            setTimeout(tick, 1000);
        }
        tick();
        </script>
        """
        st_html(js.replace('{REM}', str(remaining)), height=40)
    except Exception:
        pass

    # server-side tick fallback
    if remaining > 0:
        time.sleep(1)
        try:
            st.experimental_rerun()
        except Exception:
            st.rerun()

    # Auto transition or manual start
    if remaining == 0 or st.button("▶️ Start Answer"):
        state["interview_status"] = "WAITING_FOR_ANSWER"
        state.pop("reading_started_at", None)
        state["answering_started_at"] = time.time()
        state["recording_started"] = False
        st.session_state["interview_state"] = state
        st.rerun()

# WAITING_FOR_ANSWER: show 45s countdown, recorder, uploader, submit
elif state.get("interview_status") == "WAITING_FOR_ANSWER":
    st.subheader("🎙️ Your Answer")

    answer_limit = state.get("answer_time_limit", 45)
    if "answering_started_at" not in state or state.get("answering_started_at") is None:
        state["answering_started_at"] = time.time()
        st.session_state["interview_state"] = state

    elapsed = int(time.time() - state["answering_started_at"])
    remaining = max(0, answer_limit - elapsed)

    # Countdown UI (JS) — posts rerun when it reaches zero unless recording started
    st_html(
        f"""
        <div style='padding:10px;border-radius:6px;background:#fff3cd;font-weight:600;'>
            ⏱️ Answer time left: <span id="at">{remaining}</span>s
        </div>
        <script>
            window.recordingStarted = false;
            let rem = {remaining};
            const el = document.getElementById('at');
            function tick(){{
                if(rem <= 0 && !window.recordingStarted){{
                    window.parent.postMessage({{type:'streamlit:rerun'}}, '*');
                    return;
                }}
                if(!window.recordingStarted){{ el.innerText = rem; rem--; }}
                setTimeout(tick, 1000);
            }}
            tick();
        </script>
        """,
        height=70,
    )

    st.warning("🎙️ Recording will temporarily pause the screen. This is expected — please speak clearly.")

    # Recording flow: enter a recording mode so Start Recording does not
    # immediately attempt to capture inputs (Streamlit widgets are rendered
    # on rerun). User must click Submit to finalize, or the 45s timer will
    # auto-submit when it reaches zero.
    recording_mode = state.get("recording_mode", False)

    if not recording_mode:
        if st.button("🎤 Start Recording"):
            state["recording_mode"] = True
            state["recording_started_at"] = time.time()
            st.session_state["interview_state"] = state
            st.rerun()

    # Render recording UI when in recording mode
    if state.get("recording_mode"):
        st.info("Recording mode — use browser recorder (if available), upload, or type your answer. Click Submit when done.")

        # Try native audio_input first
        audio = None
        audio_input_fn = getattr(st, "audio_input", None)
        if callable(audio_input_fn):
            try:
                audio = audio_input_fn(f"Click to record (max {remaining}s)", key=f"live_audio_{int(time.time())}")
            except Exception:
                audio = None

        uploaded = st.file_uploader("Or upload recorded audio (wav/mp3)", type=["wav", "mp3", "m4a", "ogg"], key="upload_audio")
        typed = st.text_area("Or type your answer (fallback)")

        if st.button("Submit Recording"):
            answer_text = ""

            if audio is not None:
                try:
                    import tempfile
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                        if hasattr(audio, "getbuffer"):
                            f.write(audio.getbuffer())
                        else:
                            f.write(audio.read())
                        audio_path = f.name
                    from interview_orchestration.stt.factory import get_stt_engine
                    stt = get_stt_engine()
                    answer_text = stt.transcribe(audio_path)
                except Exception:
                    answer_text = ""

            if not answer_text and uploaded is not None:
                try:
                    import tempfile
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                        f.write(uploaded.getbuffer())
                        audio_path = f.name
                    from interview_orchestration.stt.factory import get_stt_engine
                    stt = get_stt_engine()
                    answer_text = stt.transcribe(audio_path)
                except Exception:
                    answer_text = ""

            if not answer_text and typed and typed.strip():
                answer_text = typed.strip()

            if not answer_text:
                answer_text = "(No audio captured)"

            # finalize
            state.pop("recording_mode", None)
            state.pop("recording_started_at", None)
            state["simulated_answer"] = answer_text
            state = stage4_graph.invoke(state, config={"recursion_limit": 200})
            st.session_state["interview_state"] = state
            try:
                from streamlit_app.storage.azure_store import save_interview_trace
                from streamlit_app.storage.candidate_store import update_candidate
                cid = state.get("candidate_id")
                if cid:
                    save_interview_trace(cid, state.get("interview_trace", []))
                    update_candidate(cid, {"interview_trace": state.get("interview_trace", [])})
            except Exception:
                pass
            st.rerun()

    else:
        # Not in recording mode: show uploader + manual submit as alternative
        st.markdown("---")
        uploaded = st.file_uploader("Or upload recorded audio (wav/mp3) and click Submit", type=["wav", "mp3", "m4a", "ogg"], key="upload_audio")
        typed = st.text_area("Or type your answer (fallback)")

        if st.button("Submit Answer"):
            answer_text = ""
            if uploaded is not None:
                try:
                    import tempfile
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                        f.write(uploaded.getbuffer())
                        audio_path = f.name
                    from interview_orchestration.stt.factory import get_stt_engine
                    stt = get_stt_engine()
                    answer_text = stt.transcribe(audio_path)
                except Exception:
                    answer_text = ""

            if not answer_text and typed and typed.strip():
                answer_text = typed.strip()

            if not answer_text:
                answer_text = "(No audio captured)"

            state["simulated_answer"] = answer_text
            state = stage4_graph.invoke(state, config={"recursion_limit": 200})
            st.session_state["interview_state"] = state
            try:
                from streamlit_app.storage.azure_store import save_interview_trace
                from streamlit_app.storage.candidate_store import update_candidate
                cid = state.get("candidate_id")
                if cid:
                    save_interview_trace(cid, state.get("interview_trace", []))
                    update_candidate(cid, {"interview_trace": state.get("interview_trace", [])})
            except Exception:
                pass
            st.rerun()

# PROCESSING_ANSWER: let graph handle followup/next-topic
elif state.get("interview_status") == "PROCESSING_ANSWER":
    st.info("Processing your answer...")
    state = stage4_graph.invoke(state, config={"recursion_limit": 200})
    st.session_state["interview_state"] = state
    try:
        from streamlit_app.storage.azure_store import save_interview_trace
        from streamlit_app.storage.candidate_store import update_candidate
        cid = state.get("candidate_id")
        if cid:
            save_interview_trace(cid, state.get("interview_trace", []))
            update_candidate(cid, {"interview_trace": state.get("interview_trace", [])})
    except Exception:
        pass
    st.rerun()

# COMPLETED
elif state.get("interview_status") == "COMPLETED":
    st.success("✅ Interview Completed")
    st.subheader("Interview Summary")
    for turn in state.get("interview_trace", []):
        st.markdown(f"**Topic:** {turn['topic']}  \n**Q:** {turn['question']}  \n**A:** {turn['answer_text']}\n---")

    st.info("Your interview has been submitted for review.")
    if st.button("⬅️ Back to Status"):
        st.switch_page("pages/user_status.py")