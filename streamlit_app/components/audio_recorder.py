import streamlit as st
import streamlit.components.v1 as components
import base64
import tempfile
import os


def audio_recorder_component(max_duration_seconds: int = 45):
    """
    Renders a browser-based audio recorder using JavaScript MediaRecorder API.
    Stores the recorded audio in session state when recording is complete.
    """
    
    # Initialize session state for audio storage
    if "recorded_audio_base64" not in st.session_state:
        st.session_state["recorded_audio_base64"] = None
    
    # HTML + JavaScript for audio recording
    html_code = f"""
    <div style="padding: 20px; background: #f0f2f6; border-radius: 10px; margin: 10px 0;">
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <button id="recordBtn" style="
                padding: 12px 24px;
                font-size: 16px;
                background: #ff4b4b;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            ">🎤 Start Recording</button>
            
            <button id="stopBtn" disabled style="
                padding: 12px 24px;
                font-size: 16px;
                background: #666;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: not-allowed;
                font-weight: 600;
            ">⏹️ Stop</button>
            
            <span id="timer" style="font-size: 18px; font-weight: 600; color: #ff4b4b;">00:00</span>
        </div>
        
        <div id="status" style="padding: 10px; background: white; border-radius: 6px; min-height: 40px; display: flex; align-items: center;">
            <span style="color: #666;">Click "Start Recording" to begin</span>
        </div>
        
        <audio id="audioPlayback" controls style="width: 100%; margin-top: 15px; display: none;"></audio>
    </div>

    <script>
        const recordBtn = document.getElementById('recordBtn');
        const stopBtn = document.getElementById('stopBtn');
        const status = document.getElementById('status');
        const timer = document.getElementById('timer');
        const audioPlayback = document.getElementById('audioPlayback');
        
        let mediaRecorder;
        let audioChunks = [];
        let startTime;
        let timerInterval;
        let stream;
        
        const MAX_DURATION = {max_duration_seconds};
        
        recordBtn.onclick = async () => {{
            try {{
                // Request microphone permission
                stream = await navigator.mediaDevices.getUserMedia({{ audio: true }});
                
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {{
                    audioChunks.push(event.data);
                }};
                
                mediaRecorder.onstop = async () => {{
                    const audioBlob = new Blob(audioChunks, {{ type: 'audio/wav' }});
                    const audioUrl = URL.createObjectURL(audioBlob);
                    
                    // Show playback
                    audioPlayback.src = audioUrl;
                    audioPlayback.style.display = 'block';
                    
                    // Convert to base64 and trigger Streamlit rerun with query param
                    const reader = new FileReader();
                    reader.onloadend = () => {{
                        const base64Audio = reader.result.split(',')[1];
                        
                        // Store in localStorage temporarily
                        localStorage.setItem('streamlit_audio_recording', base64Audio);
                        
                        // Trigger Streamlit rerun by modifying URL
                        const url = new URL(window.location.href);
                        url.searchParams.set('audio_ready', Date.now());
                        window.location.href = url.toString();
                    }};
                    reader.readAsDataURL(audioBlob);
                    
                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                    
                    status.innerHTML = '<span style="color: green;">✅ Recording complete! Reloading...</span>';
                }};
                
                // Start recording
                mediaRecorder.start();
                startTime = Date.now();
                
                recordBtn.disabled = true;
                recordBtn.style.background = '#ccc';
                recordBtn.style.cursor = 'not-allowed';
                
                stopBtn.disabled = false;
                stopBtn.style.background = '#ff4b4b';
                stopBtn.style.cursor = 'pointer';
                
                status.innerHTML = '<span style="color: #ff4b4b;">🔴 Recording in progress...</span>';
                
                // Start timer
                timerInterval = setInterval(() => {{
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);
                    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
                    const secs = (elapsed % 60).toString().padStart(2, '0');
                    timer.textContent = `${{mins}}:${{secs}}`;
                    
                    // Auto-stop at max duration
                    if (elapsed >= MAX_DURATION) {{
                        stopBtn.click();
                    }}
                }}, 1000);
                
            }} catch (err) {{
                status.innerHTML = '<span style="color: red;">❌ Microphone access denied. Please allow microphone permission.</span>';
                console.error('Error accessing microphone:', err);
            }}
        }};
        
        stopBtn.onclick = () => {{
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {{
                mediaRecorder.stop();
                clearInterval(timerInterval);
                
                recordBtn.disabled = false;
                recordBtn.style.background = '#ff4b4b';
                recordBtn.style.cursor = 'pointer';
                
                stopBtn.disabled = true;
                stopBtn.style.background = '#666';
                stopBtn.style.cursor = 'not-allowed';
                
                status.innerHTML = '<span style="color: orange;">⏳ Processing audio...</span>';
            }}
        }};
        
        // Check if there's audio in localStorage on load
        const storedAudio = localStorage.getItem('streamlit_audio_recording');
        if (storedAudio) {{
            console.log('Found stored audio, length:', storedAudio.length);
        }}
    </script>
    """
    
    # Render component (no return value needed)
    components.html(html_code, height=250)
    
    # Check query params for audio_ready flag
    try:
        # Using st._get_query_params() for direct access, as st.query_params is a new feature
        # and might not be available in all Streamlit versions.
        # For newer Streamlit versions (>=1.27), st.query_params is preferred.
        query_params = st.query_params
        if "audio_ready" in query_params:
            # Audio was just recorded, retrieve from localStorage via another component
            retrieve_html = """
            <script>
                const audio = localStorage.getItem('streamlit_audio_recording');
                if (audio) {
                    localStorage.removeItem('streamlit_audio_recording');
                    window.parent.postMessage({
                        type: 'streamlit:setComponentValue',
                        value: audio
                    }, '*');
                }
            </script>
            """
            audio_value = components.html(retrieve_html, height=0)
            
            # Clear the query param
            st.query_params.clear()
            
            return audio_value
    except Exception as e:
        # Handle cases where st.query_params might not be available or other errors
        # print(f"DEBUG: Error accessing query params or clearing: {e}")
        pass
    
    return None


def decode_audio_to_file(audio_base64: str) -> str:
    """
    Decodes base64 audio string to a temporary WAV file.
    Returns the file path.
    """
    if not audio_base64:
        return None
    
    try:
        audio_bytes = base64.b64decode(audio_base64)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            f.write(audio_bytes)
            return f.name
    except Exception as e:
        print(f"DEBUG: Error decoding audio: {e}")
        return None
