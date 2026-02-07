import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewAPI } from '../api/client';

const InterviewSession = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();

    const [question, setQuestion] = useState(null);
    const [status, setStatus] = useState('loading'); // loading, reading, answering, submitting, completed
    const [timeLeft, setTimeLeft] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const [latestWarning, setLatestWarning] = useState(null);
    const [cheatingScore, setCheatingScore] = useState(0);

    const isSubmittingRef = useRef(false);

    const timerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const frameIntervalRef = useRef(null);

    // Constants
    const READING_TIME = 20;
    const ANSWER_TIME = 45;

    useEffect(() => {
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
            stopRecording();
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

            if (data.status === 'COMPLETED') {
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

    const activeAudioStream = useRef(null);
    const activeVideoStream = useRef(null);



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

                // Stop tracks fully
                stopRecording(true);

                finishSubmission(audioBlob);
            };
            recorder.stop();
        } else {
            stopRecording();
            finishSubmission(null);
        }
    };

    const stopRecording = (keepRecorderActive = false) => {
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }

        // 1. Handle Recorder
        if (mediaRecorderRef.current) {
            const recorder = mediaRecorderRef.current;

            // If we're fully stopping, remove handlers so no ghost calls back
            if (!keepRecorderActive) {
                recorder.ondataavailable = null;
                recorder.onstop = null;
                if (recorder.state !== 'inactive') {
                    try { recorder.stop(); } catch (e) { }
                }
            }
        }

        // 2. Stop ALL Audio tracks
        if (activeAudioStream.current) {
            activeAudioStream.current.getTracks().forEach(track => {
                try { track.stop(); } catch (e) { }
            });
            activeAudioStream.current = null;
        }

        // 3. Stop ALL Video tracks
        if (activeVideoStream.current) {
            activeVideoStream.current.getTracks().forEach(track => {
                try { track.stop(); } catch (e) { }
            });
            activeVideoStream.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const startAnsweringPhase = async () => {
        // Ensure ALL previous resources are cleared
        clearAnyTimer();
        stopRecording();

        setStatus('answering');
        setTimeLeft(ANSWER_TIME);

        // Reset state for new recording
        audioChunksRef.current = [];
        isSubmittingRef.current = false;

        // Start Recording
        try {
            console.log('Requesting media devices...');

            // 1. Get Video
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
                activeVideoStream.current = videoStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = videoStream;
                }
            } catch (vErr) {
                console.warn('Camera failed:', vErr);
            }

            // 2. Get Audio
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
                activeAudioStream.current = audioStream;

                const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav'];
                const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';

                const recorder = new MediaRecorder(audioStream, { mimeType });
                mediaRecorderRef.current = recorder;

                // Closure-safe chunk handling: This array belongs ONLY to this recorder
                const turnChunks = [];
                // Store in ref so handleSubmit can access it
                audioChunksRef.current = turnChunks;

                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        turnChunks.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    console.log(`Recorder onstop. Accumulated chunks: ${turnChunks.length}`);
                };

                recorder.start(1000);
                console.log('MediaRecorder started with mimeType:', mimeType);
            } catch (aErr) {
                console.error('Audio access denied:', aErr);
                setError('Microphone access denied. Please enable it to record.');
            }

            if (activeVideoStream.current) {
                if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
                frameIntervalRef.current = setInterval(captureAndSendFrame, 8000);
            }

        } catch (err) {
            console.error('Media init failed:', err);
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

    if (status === 'completed') {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <h1 style={{ color: '#2f855a' }}>Interview Completed! 🎊</h1>
                    <p>Thank you for your time. Your responses have been recorded for review.</p>
                    <button onClick={() => navigate('/user/dashboard')} style={buttonStyle}>
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
                        Question {question.question_index} of {question.total_questions}
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
                            <span>Processing your response...</span>
                        </div>
                    )}
                </div>

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
            </div>

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
