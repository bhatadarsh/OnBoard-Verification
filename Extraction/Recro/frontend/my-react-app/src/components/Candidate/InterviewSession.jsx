import React, { useState, useEffect, useRef } from 'react';
import { interviewAPI } from '../../api/interviewApi';

const InterviewSession = ({ interviewId, onEnd }) => {
    const [question, setQuestion] = useState(null);
    const [status, setStatus] = useState('loading'); // loading, reading, answering, submitting, completed
    const [timeLeft, setTimeLeft] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const [latestWarning, setLatestWarning] = useState(null);
    const [cheatingScore, setCheatingScore] = useState(0);
    const [showEndModal, setShowEndModal] = useState(false);

    const isSubmittingRef = useRef(false);
    const isInitializingRef = useRef(false);

    const timerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const frameIntervalRef = useRef(null);
    const videoRecorderRef = useRef(null);
    const chunkIndexRef = useRef(0);
    const pendingUploadsRef = useRef(0);

    // Constants
    const READING_TIME = 20;
    const ANSWER_TIME = 45;

    useEffect(() => {
        initializeMonitoring();
        loadQuestion();

        // 1. Detect Tab Changes / Visibility
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                console.warn('Tab change detected!');
                setLatestWarning("Warning: Switching tabs is recorded as a misconduct event.");
                // Report to backend
                interviewAPI.reportEvent(interviewId, 'TAB_CHANGE').catch(e => { });

                // Clear warning after 5s
                setTimeout(() => setLatestWarning(prev => prev?.includes("Switching tabs") ? null : prev), 5000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearAnyTimer();
            stopRecording(true);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const clearAnyTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const loadQuestion = async () => {
        try {
            setStatus('loading');
            const data = await interviewAPI.getQuestion(interviewId);

            if (['COMPLETED', 'COMPLETED_EARLY'].includes(data.status)) {
                stopRecording(true);
                setStatus('completed');
                return;
            }

            setQuestion(data);
            startReadingPhase();
        } catch (err) {
            setError('Failed to load question: ' + (err.response?.data?.detail || err.message));
            setStatus('error');
        }
    };

    const startReadingPhase = () => {
        clearAnyTimer();
        setStatus('reading');
        setTimeLeft(READING_TIME);

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearAnyTimer();
                    startAnsweringPhase();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        if (status === 'completed' || status === 'error') {
            console.log(`Interview phase finished (${status}): Automatically releasing camera and microphone.`);
            stopRecording(true);
        }
    }, [status]);

    const activeAudioStream = useRef(null);
    const activeVideoStream = useRef(null);

    const initializeMonitoring = async () => {
        if (activeVideoStream.current || isInitializingRef.current) return;
        isInitializingRef.current = true;

        try {
            console.log('Initializing continuous camera monitoring...');
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            activeVideoStream.current = videoStream;
            if (videoRef.current) {
                videoRef.current.srcObject = videoStream;
            }

            // Start YOLO-based frame capture immediately (1 frame per second for real-time detection)
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = setInterval(captureAndSendFrame, 1000);

            isInitializingRef.current = false;
            console.log('Camera monitoring active (No full recording).');

        } catch (vErr) {
            console.error('Initial camera setup failed:', vErr);
            setError('Camera access is required for this interview. Please enable it.');
            setStatus('error');
        } finally {
            isInitializingRef.current = false;
        }
    };

    const captureAndSendFrame = () => {
        if (!videoRef.current || !canvasRef.current || !activeVideoStream.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Only capture if video is actually playing and has data
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            // Force 640x480 for better YOLO accuracy without being massive
            canvas.width = 640;
            canvas.height = 480;
            context.drawImage(video, 0, 0, 640, 480);

            // Export to base64 (JPEG 0.3 quality for minimal size)
            const frameB64 = canvas.toDataURL('image/jpeg', 0.3);

            // Log size if it seems unusually large
            if (frameB64.length > 500000) {
                console.warn(`Frame B64 size warning: ${Math.round(frameB64.length / 1024)} KB`);
            }

            // Heartbeat for debugging
            if (Math.random() > 0.8) {
                console.log(`[YOLO] Transmitting frame to backend (${Math.round(frameB64.length / 1024)} KB)`);
            }

            interviewAPI.sendVideoFrame(interviewId, frameB64).catch(err => {
                console.warn('YOLO frame transmit failed:', err);
            });
        }
    };

    const handleSubmit = async (submissionType) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        setStatus('submitting');
        clearAnyTimer();

        const recorder = mediaRecorderRef.current;
        // Capture the chunks ref content at this exact moment
        const capturedChunks = [...audioChunksRef.current];

        const finishSubmission = async (blob) => {
            try {
                // Determine if this is the FINAL question
                const isLastQuestion = question?.question_index === question?.total_questions;

                if (isLastQuestion) {
                    console.log("Last question detected. Finalizing video recording...");
                    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
                        // Stop recorder, which triggers the final ondataavailable
                        await new Promise(resolve => {
                            videoRecorderRef.current.onstop = resolve;
                            videoRecorderRef.current.stop();
                        });
                    }
                    // Wait for all chunk uploads to finish
                    while (pendingUploadsRef.current > 0) {
                        await new Promise(r => setTimeout(r, 200));
                    }
                }

                if (!blob || blob.size === 0) {
                    console.warn('Empty audio blob captured for submission:', submissionType);
                } else {
                    console.log(`Audio blob ready for submission: ${blob.size} bytes (${blob.type})`);
                }

                // Determine extension based on mimeType
                const mimeType = recorder?.mimeType || blob?.type || 'audio/webm';
                const extension = mimeType.includes('wav') ? 'wav' :
                    mimeType.includes('ogg') ? 'ogg' :
                        mimeType.includes('mp4') ? 'mp4' : 'webm';

                console.log(`Submitting as answer.${extension} with type ${mimeType}`);
                const file = new File([blob || new Blob()], `answer.${extension}`, { type: mimeType });

                const res = await interviewAPI.submitAnswer(interviewId, file, submissionType);
                setTranscript(res.transcript);
                if (res.warning) {
                    setLatestWarning(res.warning);
                    setTimeout(() => setLatestWarning(null), 5000);
                }
                setCheatingScore(res.cheating_score || 0);

                if (res.status === 'COMPLETED') {
                    stopRecording(true);
                    setStatus('completed');
                } else if (res.next_question) {
                    setQuestion(res.next_question);
                    startReadingPhase();
                } else {
                    loadQuestion();
                }
            } catch (err) {
                console.error('Submission error:', err);
                setError('Submission failed: ' + (err.response?.data?.detail || err.message));
                setStatus('error');
            } finally {
                isSubmittingRef.current = false;
            }
        };

        if (recorder && recorder.state === 'recording') {
            recorder.onstop = () => {
                // Use the chunks captured at the moment submission was triggered
                const audioBlob = new Blob(capturedChunks, { type: recorder.mimeType });

                // Stop only audio, keep video monitoring ACTIVE
                stopRecording(false);

                finishSubmission(audioBlob);
            };
            recorder.stop();
        } else {
            stopRecording(false);
            finishSubmission(null);
        }
    };

    const stopRecording = (fullStop = false) => {
        console.log(`[Hardware] Turning OFF. FullStop: ${fullStop}`);

        // 1. Always stop audio recorder when phase ends
        if (mediaRecorderRef.current) {
            const recorder = mediaRecorderRef.current;
            if (recorder.state !== 'inactive') {
                try { recorder.stop(); } catch (e) { }
            }
            mediaRecorderRef.current = null;
        }

        // 2. Stop ALL Audio tracks
        if (activeAudioStream.current) {
            activeAudioStream.current.getTracks().forEach(track => {
                try {
                    track.enabled = false;
                    track.stop();
                    console.log(`Stopped audio track: ${track.label}`);
                } catch (e) { }
            });
            activeAudioStream.current = null;
        }

        // 3. ONLY stop video and YOLO if fullStop is requested (interview end)
        if (fullStop) {
            if (videoRecorderRef.current) {
                if (videoRecorderRef.current.state !== 'inactive') {
                    try { videoRecorderRef.current.stop(); } catch (e) { }
                }
                videoRecorderRef.current = null;
            }

            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
                frameIntervalRef.current = null;
            }

            if (activeVideoStream.current) {
                activeVideoStream.current.getTracks().forEach(track => {
                    try {
                        track.enabled = false;
                        track.stop();
                        console.log(`Stopped video track: ${track.label}`);
                    } catch (e) { }
                });
                activeVideoStream.current = null;
            }

            if (videoRef.current) {
                if (videoRef.current.srcObject) {
                    const tracks = videoRef.current.srcObject.getTracks();
                    tracks.forEach(t => {
                        try {
                            t.enabled = false;
                            t.stop();
                        } catch (e) { }
                    });
                }
                videoRef.current.srcObject = null;
                videoRef.current.load(); // Force release of hardware decoder
            }

            // Release YOLO references
            if (canvasRef.current) {
                const context = canvasRef.current.getContext('2d');
                if (context) context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
    };

    const startAnsweringPhase = async () => {
        // Stop only audio from previous question if any
        clearAnyTimer();
        stopRecording(false);

        setStatus('answering');
        setTimeLeft(ANSWER_TIME);

        audioChunksRef.current = [];
        isSubmittingRef.current = false;

        // Ensure camera is still up (idempotent)
        if (!activeVideoStream.current) {
            await initializeMonitoring();
        }

        // Start Audio Recording
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            activeAudioStream.current = audioStream;

            const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/wav'];
            const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
            console.log(`Selected Audio MimeType: ${mimeType}`);

            const recorder = new MediaRecorder(audioStream, {
                mimeType,
                audioBitsPerSecond: 16000 // Ultra low bitrate to stay under 2.1MB limit
            });
            mediaRecorderRef.current = recorder;

            const turnChunks = [];
            audioChunksRef.current = turnChunks;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    turnChunks.push(event.data);
                }
            };

            recorder.start(1000);
            console.log('Audio recording started for answer phase.');
        } catch (aErr) {
            console.error('Audio access denied:', aErr);
            setError('Microphone access denied. Please enable it to record your answer.');
        }

        // START ANSWER TIMER
        clearAnyTimer();
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearAnyTimer();
                    handleSubmit('TIMEOUT');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleEndInterview = async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        setStatus('submitting');
        clearAnyTimer();

        const recorder = mediaRecorderRef.current;
        const capturedChunks = [...audioChunksRef.current];

        try {
            // Stop video recorder and wait for last chunks
            if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
                await new Promise(resolve => {
                    videoRecorderRef.current.onstop = resolve;
                    videoRecorderRef.current.stop();
                });
            }
            while (pendingUploadsRef.current > 0) {
                await new Promise(r => setTimeout(r, 200));
            }

            let audioFile = null;
            if (recorder && recorder.state === 'recording') {
                const audioBlob = new Blob(capturedChunks, { type: recorder.mimeType || 'audio/webm' });
                const mimeType = recorder.mimeType || 'audio/webm';
                const extension = mimeType.includes('wav') ? 'wav' : 'webm';
                audioFile = new File([audioBlob], `final_answer.${extension}`, { type: mimeType });
            }

            await interviewAPI.endInterview(interviewId, audioFile);
            stopRecording(true);
            setStatus('completed');
        } catch (err) {
            console.error('Failed to end interview:', err);
            setError('Failed to end interview: ' + (err.response?.data?.detail || err.message));
            setStatus('error');
        } finally {
            isSubmittingRef.current = false;
            setShowEndModal(false);
        }
    };

    if (status === 'completed') {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <h1 style={{ color: '#2f855a' }}>Interview Completed! 🎊</h1>
                    <p>Thank you for your time. Your responses have been recorded for review.</p>
                    <button onClick={() => { if (onEnd) onEnd(); }} style={buttonStyle}>
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <h2 style={{ color: '#c53030' }}>Oops! Something went wrong</h2>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} style={buttonStyle}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!question || status === 'loading') {
        return <div style={containerStyle}><div className="loader">Loading your interview...</div></div>;
    }

    const progress = status === 'reading'
        ? (timeLeft / READING_TIME) * 100
        : (timeLeft / ANSWER_TIME) * 100;

    return (
        <div style={containerStyle}>
            {/* Header with progress */}
            <div style={headerStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#4a5568' }}>
                        {question.question_index}
                    </span>
                    <span style={{
                        color: status === 'reading' ? '#3182ce' : '#e53e3e',
                        fontWeight: 'bold'
                    }}>
                        {status === 'reading' ? '📖 Reading Phase' : '🎤 Answering Phase'}
                    </span>
                </div>
                <div style={progressContainerStyle}>
                    <div style={{
                        ...progressBarStyle,
                        width: `${progress}%`,
                        backgroundColor: status === 'reading' ? '#3182ce' : '#e53e3e'
                    }} />
                </div>
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '24px', fontWeight: 'bold' }}>
                    {timeLeft}s
                </div>
            </div>

            {/* Question Card */}
            <div style={{ ...cardStyle, animation: 'fadeIn 0.5s' }}>
                <p style={{
                    fontSize: '14px',
                    color: '#718096',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '10px'
                }}>
                    Technical Interview
                </p>
                <h2 style={{ fontSize: '22px', lineHeight: '1.5', margin: '0 0 30px 0', color: '#2d3748' }}>
                    {question.question_text}
                </h2>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    {status === 'answering' && (
                        <button
                            onClick={() => handleSubmit('MANUAL')}
                            style={{ ...buttonStyle, background: '#38a169' }}>
                            Finish & Submit
                        </button>
                    )}
                    {status === 'reading' && (
                        <p style={{ color: '#718096', fontStyle: 'italic' }}>
                            You will be able to answer in a few seconds...
                        </p>
                    )}
                    {status === 'submitting' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="spinner-small"></div>
                            <span>Processing your request...</span>
                        </div>
                    )}
                </div>

                {/* Optional early termination button */}
                {!['loading', 'submitting', 'error', 'completed'].includes(status) && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid #edf2f7', paddingTop: '20px' }}>
                        <button
                            onClick={() => setShowEndModal(true)}
                            style={{
                                background: 'transparent',
                                color: '#a0aec0',
                                border: '1px solid #e2e8f0',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.target.style.color = '#e53e3e'; e.target.style.borderColor = '#feb2b2'; }}
                            onMouseOut={(e) => { e.target.style.color = '#a0aec0'; e.target.style.borderColor = '#e2e8f0'; }}
                        >
                            End Interview Early
                        </button>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {showEndModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '30px',
                        borderRadius: '16px',
                        maxWidth: '400px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>End Interview?</h3>
                        <p style={{ color: '#718096', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                            Are you sure you want to end the interview now?
                            <strong> Remaining questions will be skipped</strong> and your current progress will be submitted.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowEndModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Keep Going
                            </button>
                            <button
                                onClick={handleEndInterview}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#e53e3e',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                End & Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Monitor */}
            <div style={{ marginTop: '20px', borderRadius: '12px', overflow: 'hidden', background: '#000', height: '180px', width: '320px', margin: '20px auto', position: 'relative' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={{ position: 'absolute', top: '10px', right: '10px', color: 'red', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', background: 'red', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                    LIVE MONITORING
                </div>
            </div>

            {/* Misconduct Warnings */}
            {latestWarning && (
                <div style={{
                    marginTop: '20px',
                    padding: '12px',
                    background: '#fff5f5',
                    border: '1px solid #feb2b2',
                    color: '#c53030',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    animation: 'shake 0.5s'
                }}>
                    ⚠️ {latestWarning}
                </div>
            )}

            {/* Transcribed Answer Display */}
            {transcript && (
                <div style={{
                    marginTop: '20px',
                    width: '100%',
                    maxWidth: '600px',
                    padding: '20px',
                    background: '#ebf8ff',
                    border: '1px solid #bee3f8',
                    borderRadius: '12px',
                    color: '#2b6cb0',
                    fontSize: '14px',
                    animation: 'fadeIn 0.5s'
                }}>
                    <strong>Your Last Answer (Transcribed):</strong>
                    <p style={{ margin: '10px 0 0 0', fontStyle: 'italic', lineHeight: '1.6' }}>
                        "{transcript}"
                    </p>
                </div>
            )}

            {/* Hint / Instructions */}
            <div style={{ marginTop: '30px', color: '#a0aec0', fontSize: '12px', textAlign: 'center' }}>
                Please ensure you are in a quiet environment. Your video and audio are being recorded.
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .spinner-small {
                    width: 20px;
                    height: 20px;
                    border: 2px solid #e2e8f0;
                    border-top-color: #3182ce;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `}</style>
        </div>
    );
};

// Styles
const containerStyle = {
    minHeight: '100vh',
    background: '#f7fafc',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '"Inter", sans-serif'
};

const headerStyle = {
    width: '100%',
    maxWidth: '600px',
    marginBottom: '30px'
};

const progressContainerStyle = {
    height: '8px',
    background: '#edf2f7',
    borderRadius: '4px',
    overflow: 'hidden'
};

const progressBarStyle = {
    height: '100%',
    transition: 'width 1s linear, background-color 0.3s'
};

const cardStyle = {
    width: '100%',
    maxWidth: '600px',
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    textAlign: 'center'
};

const buttonStyle = {
    padding: '12px 30px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    background: '#4a5568',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none'
};

export default InterviewSession;
