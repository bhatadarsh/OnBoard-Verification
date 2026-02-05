
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
            # Before auto-submitting, check for an in-flight `st.audio_input` upload
            try:
                ak_chk = int(answer_started)
            except Exception:
                ak_chk = None

            try:
                # keys that may indicate the browser recorder widget exists but hasn't
                # uploaded its blob yet: `live_audio_{ak}` (value None until finalized)
                live_key = f"live_audio_{ak_chk}" if ak_chk else None
                saved_key = f"saved_audio_{ak_chk}" if ak_chk else None
                capture_flag = f"capture_attempted_{ak_chk}" if ak_chk else None

                in_flight = False
                if live_key and live_key in st.session_state and st.session_state.get(live_key) is None:
                    in_flight = True
                # if there is a saved recording already, it's fine to auto-submit
                if saved_key and st.session_state.get(saved_key):
                    in_flight = False

                if in_flight and capture_flag and not st.session_state.get(capture_flag):
                    # Switch into recording_mode to allow finalization and user Submit
                    state["recording_mode"] = True
                    state["recording_started"] = True
                    st.session_state["interview_state"] = state
                    st.session_state[capture_flag] = True
                    try:
                        st.info("Finalizing your recording — please click Submit when the recorder finishes uploading.")
                    except Exception:
                        pass
                    st.rerun()

            except Exception:
                pass

            # If not in-flight, proceed to auto-submit as before
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
            except Exception as e:
                try:
                    st.error("Failed to persist interview trace to Azure blob storage")
                    st.exception(e)
                except Exception:
                    print("Failed to persist interview trace:", e)
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

# WAITING_FOR_ANSWER: show 45s countdown, recorder
elif state.get("interview_status") == "WAITING_FOR_ANSWER":
    st.subheader("🎙️ Your Answer")

    answer_limit = state.get("answer_time_limit", 45)
    if "answering_started_at" not in state or state.get("answering_started_at") is None:
        state["answering_started_at"] = time.time()
        st.session_state["interview_state"] = state

    elapsed = int(time.time() - state["answering_started_at"])
    remaining = max(0, answer_limit - elapsed)

    # Countdown UI
    st_html(
        f"""
        <div style='padding:10px;border-radius:6px;background:#fff3cd;font-weight:600;'>
            ⏱️ Answer time left: <span id="at">{remaining}</span>s
        </div>
        <script>
            let rem = {remaining};
            const el = document.getElementById('at');
            function tick(){{
                if(rem <= 0){{
                    window.parent.postMessage({{type:'streamlit:rerun'}}, '*');
                    return;
                }}
                el.innerText = rem; rem--;
                setTimeout(tick, 1000);
            }}
            tick();
        </script>
        """,
        height=70,
    )

    st.warning("🎙️ Recording will temporarily pause the screen. This is expected — please speak clearly.")

    # -------------------------
    # RECORDING UI
    # -------------------------
    # Trigger recording mode
    if not state.get("recording_mode"):
        if st.button("🎤 Start Recording"):
            state["recording_mode"] = True
            # Mark that recording has started to prevent auto-submit logic
            state["recording_started"] = True
            st.session_state["interview_state"] = state
            st.rerun()

    # Initialize pending answer if needed
    if "pending_answer" not in st.session_state:
        st.session_state["pending_answer"] = None

    if state.get("recording_mode"):
        st.info("🎙️ **Click the microphone button below to record your answer**")
        
        from audiorecorder import audiorecorder
        
        # Use streamlit-audiorecorder package for reliable browser recording
        audio_bytes = audiorecorder(
            start_prompt="🎤 Start Recording",
            stop_prompt="⏹️ Stop Recording",
            pause_prompt="",
            key=f"audiorecorder_{remaining}"
        )
        
        # Check if audio was recorded (audiorecorder returns empty bytes if no recording)
        if len(audio_bytes) > 0:
            print(f"DEBUG: Audio recorded via audiorecorder, size: {len(audio_bytes)} bytes")
            
            try:
                import tempfile
                from interview_orchestration.stt.factory import get_stt_engine
                from streamlit_app.utils.audio_utils import convert_to_wav
                
                # Save audio bytes to temp file
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                    f.write(audio_bytes)
                    audio_path = f.name
                
                print(f"DEBUG: Audio saved to: {audio_path}")
                
                # Convert to WAV
                wav_path = convert_to_wav(audio_path)
                print(f"DEBUG: Converted to WAV: {wav_path}")
                
                # Transcribe
                stt_engine = get_stt_engine()
                transcript = stt_engine.transcribe(wav_path)
                
                if transcript and transcript.strip():
                    st.session_state["pending_answer"] = transcript.strip()
                    print(f"DEBUG: Transcript saved: '{transcript.strip()}'")
                    st.success(f"✅ Transcription complete!")
                    st.rerun()
                else:
                    st.warning("⚠️ No speech detected. Please try again with a clearer recording.")
                    
            except Exception as e:
                print(f"DEBUG: STT Error: {e}")
                import traceback
                traceback.print_exc()
                st.error(f"❌ Transcription failed: {e}")


    # Show transcript preview if available
    if st.session_state.get("pending_answer"):
        st.success(f"📝 Transcript Preview: {st.session_state['pending_answer']}")
    
    st.markdown("---")

    # -------------------------
    # EXPLICIT SUBMIT ACTION
    # -------------------------
    # Submit button is ALWAYS visible to allow manual finish
    if st.button("✅ Submit Answer", type="primary"):
        final_text = st.session_state.get("pending_answer")
        
        if not final_text:
            final_text = "(no response)"
            
        state["simulated_answer"] = final_text
        
        print(f"DEBUG: Explicit Submit - Setting state['simulated_answer'] = '{final_text}'")
        
        # Cleanup
        st.session_state.pop("pending_answer", None)
        state.pop("recording_mode", None)
        state.pop("recording_started", None)
        state.pop("answering_started_at", None)

        # Invoke Graph
        state = stage4_graph.invoke(state, config={"recursion_limit": 200})
        st.session_state["interview_state"] = state
        
        # Persist to Azure
        try:
            from streamlit_app.storage.azure_store import save_interview_trace
            from streamlit_app.storage.candidate_store import update_candidate
            cid = state.get("candidate_id")
            if cid:
                save_interview_trace(cid, state.get("interview_trace", []))
                update_candidate(cid, {"interview_trace": state.get("interview_trace", [])})
        except Exception as e:
            print(f"Persistence error: {e}")

        st.rerun()

    # -------------------------
    # TIMEOUT HANDLING
    # -------------------------
    # Only auto-submit if user NEVER started recording and has no pending answer
    if remaining == 0:
        if state.get("recording_started") or st.session_state.get("pending_answer"):
            st.error("⏳ Time is up! Please click 'Submit Answer' to continue.")
        else:
            # Passive timeout (user did nothing)
            state["simulated_answer"] = "(no response)"
            # Cleanup
            st.session_state.pop("pending_answer", None)
            state.pop("answering_started_at", None)
            
            state = stage4_graph.invoke(state, config={"recursion_limit": 200})
            st.session_state["interview_state"] = state
            
            # Persist
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
# WAITING_FOR_ANSWER: use blocking server-side recording to avoid Streamlit rerun races
# WAITING_FOR_ANSWER: minimal, reliable recording flow (capture → save → transcribe on submit)
elif state.get("interview_status") == "WAITING_FOR_ANSWER":
    st.subheader("🎙️ Your Answer")

    # Simple pattern: capture once, save bytes in session_state, transcribe on Submit
    try:
        audio = None
        audio_input_fn = getattr(st, "audio_input", None)
        if callable(audio_input_fn):
            try:
                audio = audio_input_fn("Click to record your answer")
            except Exception:
                audio = None

        if audio is not None:
            st.success("Audio captured")
            try:
                # Store raw bytes so they survive reruns
                if hasattr(audio, "getbuffer"):
                    st.session_state["audio_bytes"] = bytes(audio.getbuffer())
                else:
                    st.session_state["audio_bytes"] = audio.read()
            except Exception:
                pass

        if st.button("Submit Answer"):
            answer_text = ""

            if "audio_bytes" in st.session_state:
                import tempfile

                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                    f.write(st.session_state["audio_bytes"])
                    audio_path = f.name

                from interview_orchestration.stt.factory import get_stt_engine
                stt = get_stt_engine()
                try:
                    answer_text = stt.transcribe(audio_path)
                except Exception as e:
                    st.error(f"STT error: {e}")

            if not answer_text:
                st.error("No transcription received")
                # keep user on the same page so they can retry
            else:
                # DEBUG: surface final answer before invoking graph
                try:
                    st.write("DEBUG simulated_answer BEFORE graph:", repr(answer_text))
                except Exception:
                    pass

                # inject answer into state and advance graph
                state["simulated_answer"] = answer_text
                # clear saved audio
                st.session_state.pop("audio_bytes", None)

                state = stage4_graph.invoke(state, config={"recursion_limit": 200})
                st.session_state["interview_state"] = state

                # Persist to Azure
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
        st.error("Recording UI not available in this Streamlit build")
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



# import sys
# import os
# import time
# from streamlit.components.v1 import html as st_html
# import streamlit as st

# # -------------------------
# # FIX IMPORT PATH (MUST BE FIRST)
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

# import time

# state = st.session_state["interview_state"]

# st.title("🎤 AI Interview")
# # Ensure any leftover recording UI state is cleared when not in answer phase
# awaiting_key = "awaiting_answer_upload"
# if st.session_state.get(awaiting_key) and state.get("interview_status") != "WAITING_FOR_ANSWER":
#     st.session_state.pop(awaiting_key, None)
#     st.session_state.pop("upload_started_at", None)
# # -------------------------
# # Server-side timer expiry handling
# # Ensures expired reading/answer windows transition correctly on any rerun
# # -------------------------
# try:
#     if state.get("interview_status") == "ASKING_QUESTION":
#         reading_started = state.get("reading_started_at")
#         read_limit = state.get("read_time_limit", 20)
#         if reading_started and (time.time() - reading_started) >= read_limit:
#             # transition to answer phase
#             state["interview_status"] = "WAITING_FOR_ANSWER"
#             state.pop("reading_started_at", None)   # 🔑 CLEAR OLD TIMER
#             state["answering_started_at"] = time.time()

#             st.session_state["interview_state"] = state
#             st.rerun()
#             # fall through to render waiting-for-answer UI on this same run
     
#     if state.get("interview_status") == "WAITING_FOR_ANSWER":
#         answer_started = state.get("answering_started_at")
#         answer_limit = state.get("answer_time_limit", 45)
#         if answer_started and (time.time() - answer_started) >= answer_limit:
#             # auto-submit no-response and advance graph
#             state["simulated_answer"] = "(no response)"
#             state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#             st.session_state["interview_state"] = state
#             try:
#                 from streamlit_app.storage.azure_store import save_interview_trace
#                 from streamlit_app.storage.candidate_store import update_candidate
#                 cid = state.get("candidate_id")
#                 if cid:
#                     save_interview_trace(cid, state.get("interview_trace", []))
#                     update_candidate(cid, {"interview_trace": state.get("interview_trace", [])})
#             except Exception:
#                 pass
#             st.rerun()
# except Exception:
#     # be tolerant of any transient state shape issues
#     pass

# # =====================================================
# # OPTIONAL MICROPHONE TEST
# # =====================================================
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

# # =====================================================
# # STATUS DISPLAY
# # =====================================================
# st.markdown(f"**Interview Status:** `{state.get('interview_status')}`")

# # =====================================================
# # FIRST QUESTION BOOTSTRAP
# # =====================================================
# if state.get("interview_status") == "NOT_STARTED":
#     state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#     st.session_state["interview_state"] = state
#     # persist (may be empty) and rerun
#     try:
#         from streamlit_app.storage.azure_store import save_interview_trace
#         from streamlit_app.storage.candidate_store import update_candidate
#         cid = state.get("candidate_id")
#         if cid:
#             save_interview_trace(cid, state.get("interview_trace", []))
#             update_candidate(cid, {"interview_trace": state.get("interview_trace", [])})
#     except Exception:
#         pass
#     st.rerun()

# # =====================================================
# # ASKING QUESTION
# # =====================================================
# if state["interview_status"] == "ASKING_QUESTION":
#     st.subheader("Question")

#     question = state.get("current_question")
#     if not question:
#         st.warning("Preparing next question...")
#     else:
#         st.write(question)

#     # -------------------------
#     # Reading timer (SAFE)
#     # -------------------------
#     reading_started = state.get("reading_started_at")
#     read_limit = state.get("read_time_limit", 20)

#     if reading_started:
#         elapsed = int(time.time() - reading_started)
#         remaining = max(0, read_limit - elapsed)
#         st.info(f"🕒 Reading time left: **{remaining}s**")
#         # Client-side countdown + auto-reload to keep timers responsive
#         try:
#             js = """
#             <div id='countdown'>Reading time left: <strong>{REM}s</strong></div>
#             <script>
#             var rem = {REM};
#             var el = document.getElementById('countdown');
#             function tick(){
#                 if(rem<=0){
#                     // ask Streamlit to rerun (preferred) with reload fallback
#                     try{
#                         window.parent.postMessage({type: 'streamlit:rerun'}, '*');
#                     }catch(e){
#                         window.location.reload();
#                     }
#                     return;
#                 }
#                 el.innerHTML = 'Reading time left: <strong>' + rem + 's</strong>';
#                 rem -= 1;
#                 setTimeout(tick, 1000);
#             }
#             tick();
#             </script>
#             """
#             js = js.replace("{REM}", str(remaining))
#             # ensure we reload the same page URL on fallback
#             js = js.replace("window.location.reload()", "window.location.href = window.location.href")
#             st_html(js, height=40)
#         except Exception:
#             pass

#         # Server-side tick fallback: ensure a rerun each second so remaining updates reliably
#         # if remaining > 0:
#         #     time.sleep(1)
#         #     try:
#         #         st.experimental_rerun()
#         #     except Exception:
#         #         st.rerun()
#         st.info(f"⏱️ Time left: {remaining}s")


#     st.info("Click **Start Answer** when ready")

#     if st.button("▶️ Start Answer"):
#         state["interview_status"] = "WAITING_FOR_ANSWER"
#         state["answering_started_at"] = time.time()
#         st.session_state["interview_state"] = state
#         st.rerun()
#     # else:
#     #     # Auto-transition when reading window expires (UI-controlled)
#     #     if reading_started and (time.time() - reading_started) >= read_limit:
#     #         state["interview_status"] = "WAITING_FOR_ANSWER"
#     #         state["answering_started_at"] = time.time()
#     #         st.session_state["interview_state"] = state
#     #         st.rerun()

# elif state["interview_status"] == "WAITING_FOR_ANSWER":
#     st.subheader("🎙️ Your Answer")

#     st.info(
#         f"You have **{state.get('answer_time_limit', 45)} seconds**.\n"
#         "Recording will pause the screen — this is expected."
#     )

#     if st.button("🎤 Start Recording"):
#         with st.spinner("Recording... speak now"):
#             answer_text = record_and_transcribe(
#                 state.get("answer_time_limit", 45)
#             )
    
#         if not answer_text:
#             answer_text = "(no audio captured)"

#         state["simulated_answer"] = answer_text
#         state["early_finish"] = True

#         # ✅ Only now advance graph
#         state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#         st.session_state["interview_state"] = state
#         st.rerun()


#     # Auto-submit on answer timeout
#     if answer_started and (time.time() - answer_started) >= answer_limit:
#         # mark no response and invoke graph
#         state["simulated_answer"] = "(no response)"
#         # Advance graph due to timeout
#         state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#         st.session_state["interview_state"] = state
#         try:
#             from streamlit_app.storage.azure_store import save_interview_trace
#             from streamlit_app.storage.candidate_store import update_candidate
#             cid = state.get("candidate_id")
#             if cid:
#                 save_interview_trace(cid, state.get("interview_trace", []))
#                 update_candidate(cid, {"interview_trace": state.get("interview_trace", [])})
#         except Exception:
#             pass
#     st.warning(
#         "🎙️ Recording will temporarily pause the screen.\n"
#         "This is expected — please speak clearly."
#     )

#     # Single recording UI: define `audio` up-front so it's always available
#     # in the submit logic below (prevents NameError). Prefer native
#     # `st.audio_input` when present; otherwise show an HTML5 recorder
#     # fallback and instruct the user to upload the downloaded file.
#     audio = None
#     audio_input_fn = getattr(st, "audio_input", None)
#     if callable(audio_input_fn):
#         try:
#             audio = audio_input_fn("Click to record (browser permitting)", key="live_audio")
#         except Exception:
#             audio = None
#     else:
#         try:
#             recorder_html = """
# <div>
#     <p><strong>Browser recorder:</strong> click Start, speak, then Stop. Click Download to save and then upload below.</p>
#     <button id="start">Start</button>
#     <button id="stop" disabled>Stop</button>
#     <a id="downloadLink" style="display:none">Download recording</a>
#     <script>
#         let mediaRecorder;
#         let recordedChunks = [];
#         const startBtn = document.getElementById('start');
#         const stopBtn = document.getElementById('stop');
#         const downloadLink = document.getElementById('downloadLink');

#         startBtn.onclick = async () => {
#             recordedChunks = [];
#             try {
#                 const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
#                 mediaRecorder = new MediaRecorder(stream);
#                 mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
#                 mediaRecorder.onstop = () => {
#                     const blob = new Blob(recordedChunks, { type: 'audio/wav' });
#                     const url = URL.createObjectURL(blob);
#                     downloadLink.href = url;
#                     downloadLink.download = 'recording.wav';
#                     downloadLink.style.display = 'inline';
#                     downloadLink.textContent = 'Download recording';
#                 };
#                 mediaRecorder.start();
#                 startBtn.disabled = true;
#                 stopBtn.disabled = false;
#             } catch (err) {
#                 alert('Microphone access denied or not available. Use file upload instead.');
#             }
#         };

#         stopBtn.onclick = () => {
#             if (mediaRecorder && mediaRecorder.state !== 'inactive') {
#                 mediaRecorder.stop();
#                 startBtn.disabled = false;
#                 stopBtn.disabled = true;
#             }
#         };
#     </script>
# </div>
# """
#             st_html(recorder_html, height=120)
#         except Exception:
#             pass

#     uploaded = st.file_uploader("Or upload audio (wav/mp3) or type below", type=["wav", "mp3", "m4a", "ogg"], key="upload_audio")

#     typed = st.text_area("Or type your answer (fallback)")

#     if st.button("Submit Answer"):
#         answer_text = ""

#         if audio is not None:
#             try:
#                 import tempfile
#                 with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
#                     if hasattr(audio, "getbuffer"):
#                         f.write(audio.getbuffer())
#                     else:
#                         f.write(audio.read())
#                     audio_path = f.name
#                 from interview_orchestration.stt.factory import get_stt_engine
#                 stt = get_stt_engine()
#                 answer_text = stt.transcribe(audio_path)
#             except Exception:
#                 answer_text = ""

#         if not answer_text and uploaded is not None:
#             try:
#                 import tempfile
#                 with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
#                     f.write(uploaded.getbuffer())
#                     audio_path = f.name
#                 from interview_orchestration.stt.factory import get_stt_engine
#                 stt = get_stt_engine()
#                 answer_text = stt.transcribe(audio_path)
#             except Exception:
#                 answer_text = ""

#         if not answer_text and typed and typed.strip():
#             answer_text = typed.strip()

#         if not answer_text:
#             answer_text = "(No audio captured)"

#         # Inject answer and advance
#         state["simulated_answer"] = answer_text
#         state["early_finish"] = True
#         # clear upload state
#         st.session_state.pop(awaiting_key, None)
#         st.session_state.pop("upload_started_at", None)

#         state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#         st.session_state["interview_state"] = state
#         try:
#             from streamlit_app.storage.azure_store import save_interview_trace
#             from streamlit_app.storage.candidate_store import update_candidate
#             cid = state.get("candidate_id")
#             if cid:
#                 save_interview_trace(cid, state.get("interview_trace", []))
#                 update_candidate(cid, {"interview_trace": state.get("interview_trace", [])})
#         except Exception:
#             pass
#         st.rerun()

# # =====================================================
# # PROCESSING ANSWER
# # =====================================================
# elif state["interview_status"] == "PROCESSING_ANSWER":
#     st.info("Processing your answer...")

#     state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#     st.session_state["interview_state"] = state
#     try:
#         from streamlit_app.storage.azure_store import save_interview_trace
#         from streamlit_app.storage.candidate_store import update_candidate
#         cid = state.get("candidate_id")
#         if cid:
#             save_interview_trace(cid, state.get("interview_trace", []))
#             update_candidate(cid, {"interview_trace": state.get("interview_trace", [])})
#     except Exception:
#         pass
#     st.rerun()

# # =====================================================
# # COMPLETED
# # =====================================================
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
# from streamlit.components.v1 import html as st_html

# # -------------------------------------------------
# # FIX IMPORT PATH
# # -------------------------------------------------
# ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
# if ROOT_DIR not in sys.path:
#     sys.path.insert(0, ROOT_DIR)

# from interview_orchestration.graph import stage4_graph
# from streamlit_app.components.mic_answer import record_and_transcribe

# # -------------------------------------------------
# # ROLE + STATE GUARDS
# # -------------------------------------------------
# if st.session_state.get("role") != "user":
#     st.error("Unauthorized access")
#     st.switch_page("app.py")

# if "interview_state" not in st.session_state:
#     st.error("No active interview.")
#     st.switch_page("pages/user_status.py")

# state = st.session_state["interview_state"]
# st.title("🎤 AI Interview")

# # =================================================
# # FIRST BOOTSTRAP
# # =================================================
# if state["interview_status"] == "NOT_STARTED":
#     state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#     st.session_state["interview_state"] = state
#     st.rerun()

# # =================================================
# # ASKING QUESTION (20s READING)
# # =================================================
# if state["interview_status"] == "ASKING_QUESTION":
#     st.subheader("Question")
#     st.write(state.get("current_question", "Preparing question..."))

#     if "reading_started_at" not in state:
#         state["reading_started_at"] = time.time()
#         st.session_state["interview_state"] = state

#     read_limit = state.get("read_time_limit", 20)
#     elapsed = int(time.time() - state["reading_started_at"])
#     remaining = max(0, read_limit - elapsed)

#     st_html(
#         f"""
#         <div style="padding:10px;border-radius:6px;background:#e8f4ff;font-weight:600;">
#             🕒 Reading time left: <span id="rt">{remaining}</span>s
#         </div>

#         <script>
#             let rem = {remaining};
#             const el = document.getElementById("rt");
#             function tick(){{
#                 if(rem <= 0){{
#                     window.parent.postMessage({{type:'streamlit:rerun'}}, '*');
#                     return;
#                 }}
#                 rem--;
#                 el.innerText = rem;
#                 setTimeout(tick, 1000);
#             }}
#             tick();
#         </script>
#         """,
#         height=60
#     )

#     if remaining == 0:
#         state["interview_status"] = "WAITING_FOR_ANSWER"
#         state.pop("reading_started_at", None)
#         state["answering_started_at"] = time.time()
#         state["recording_started"] = False
#         st.session_state["interview_state"] = state
#         st.rerun()

#     if st.button("▶️ Start Answer"):
#         state["interview_status"] = "WAITING_FOR_ANSWER"
#         state.pop("reading_started_at", None)
#         state["answering_started_at"] = time.time()
#         state["recording_started"] = False
#         st.session_state["interview_state"] = state
#         st.rerun()

# # =================================================
# # WAITING FOR ANSWER (45s RECORDING)
# # =================================================
# elif state["interview_status"] == "WAITING_FOR_ANSWER":
#     st.subheader("🎙️ Your Answer")

#     answer_limit = state.get("answer_time_limit", 45)
#     elapsed = int(time.time() - state["answering_started_at"])
#     remaining = max(0, answer_limit - elapsed)

#     st_html(
#         f"""
#         <div style="padding:10px;border-radius:6px;background:#fff3cd;font-weight:600;">
#             ⏱️ Answer time left: <span id="at">{remaining}</span>s
#         </div>

#         <script>
#             window.recordingStarted = false;
#             let rem = {remaining};
#             const el = document.getElementById("at");

#             function tick(){{
#                 if(rem <= 0 && !window.recordingStarted){{
#                     window.parent.postMessage({{type:'streamlit:rerun'}}, '*');
#                     return;
#                 }}
#                 if(!window.recordingStarted){{
#                     rem--;
#                     el.innerText = rem;
#                 }}
#                 setTimeout(tick, 1000);
#             }}
#             tick();
#         </script>
#         """,
#         height=60
#     )

#     # ⏰ Timeout (only if not recording)
#     if remaining == 0 and not state.get("recording_started"):
#         state["simulated_answer"] = "(no response)"
#         state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#         st.session_state["interview_state"] = state
#         st.rerun()

#     # 🎤 Recording
#     if st.button("🎤 Start Recording"):
#         state["recording_started"] = True
#         st.session_state["interview_state"] = state

#         st_html(
#             "<script>window.recordingStarted = true;</script>",
#             height=0
#         )

#         with st.spinner("Recording... speak now"):
#             answer_text = record_and_transcribe(answer_limit)

#         if not answer_text:
#             answer_text = "(no audio captured)"

#         state["simulated_answer"] = answer_text
#         state = stage4_graph.invoke(state, config={"recursion_limit": 200})
#         st.session_state["interview_state"] = state
#         st.rerun()

# # =================================================
# # COMPLETED
# # =================================================
# elif state["interview_status"] == "COMPLETED":
#     st.success("✅ Interview Completed")

#     for turn in state.get("interview_trace", []):
#         st.markdown(
#             f"""
# **Topic:** {turn['topic']}  
# **Q:** {turn['question']}  
# **A:** {turn['answer_text']}
# ---
# """
#         )

#     if st.button("⬅️ Back to Status"):
#         st.switch_page("pages/user_status.py")








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


