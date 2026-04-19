import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewAPI } from '../api/client';

/* ─── Circular Timer Component ─── */
const CircularTimer = ({ timeLeft, maxTime, phase }) => {
    const radius = 58;
    const stroke = 5;
    const circumference = 2 * Math.PI * radius;
    const progress = maxTime > 0 ? timeLeft / maxTime : 0;
    const offset = circumference * (1 - progress);
    const isUrgent = phase === 'answering' && timeLeft <= 10;
    const color = phase === 'reading' ? '#00e5ff' : isUrgent ? '#f43f5e' : '#818cf8';

    return (
        <div style={{ position: 'relative', width: 140, height: 140 }}>
            <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
                <circle cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth={stroke}
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease', filter: `drop-shadow(0 0 8px ${color}40)` }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 36, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", color, letterSpacing: '-2px',
                    animation: isUrgent ? 'timerPulse 0.6s ease-in-out infinite' : 'none' }}>
                    {timeLeft}
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                    SECONDS
                </span>
            </div>
        </div>
    );
};

/* ─── Progress Dots (Question Board) ─── */
const QuestionBoard = ({ current, total }) => {
    const dots = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total]);
    return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {dots.map(n => {
                const done = n < current;
                const active = n === current;
                return (
                    <div key={n} style={{
                        width: active ? 32 : 10, height: 10, borderRadius: 5,
                        background: done ? '#10b981' : active ? '#00e5ff' : 'rgba(255,255,255,0.08)',
                        border: active ? '1px solid rgba(0,229,255,0.4)' : '1px solid transparent',
                        boxShadow: active ? '0 0 12px rgba(0,229,255,0.3)' : done ? '0 0 6px rgba(16,185,129,0.2)' : 'none',
                        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                );
            })}
        </div>
    );
};

/* ─── Audio Waveform Animation ─── */
const AudioWaveform = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 20 }}>
        {[1,2,3,4,5,6,7].map(i => (
            <div key={i} style={{
                width: 3, borderRadius: 2, background: 'linear-gradient(180deg, #818cf8, #6366f1)',
                animation: `waveBar 0.8s ease-in-out ${i * 0.08}s infinite alternate`,
            }} />
        ))}
    </div>
);

/* ─── Phase Badge ─── */
const PhaseBadge = ({ phase }) => {
    const config = {
        reading: { label: 'READING', color: '#00e5ff', bg: 'rgba(0,229,255,0.08)', border: 'rgba(0,229,255,0.2)', icon: '📖' },
        answering: { label: 'RECORDING', color: '#818cf8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)', icon: '🎤' },
        submitting: { label: 'PROCESSING', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: '⏳' },
    };
    const c = config[phase] || config.reading;
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: 100,
            fontSize: 11, fontWeight: 800, color: c.color, letterSpacing: '0.12em',
            fontFamily: "'JetBrains Mono',monospace", animation: 'enterScale 0.35s ease forwards',
        }}>
            <span>{c.icon}</span>{c.label}
            {phase === 'answering' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e', animation: 'pulse 1.2s infinite' }} />}
        </div>
    );
};

const InterviewSession = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();

    const [question, setQuestion] = useState(null);
    const [status, setStatus] = useState('loading');
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

    /* ─── Completed Screen ─── */
    if (status === 'completed') {
        return (
            <div style={S.page}>
                <div style={S.ambientGrid} />
                <div style={{ ...S.blobCyan, top: -150, right: -80 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: 24 }}>
                    <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 24, animation: 'enterScale 0.5s ease forwards', boxShadow: '0 0 40px rgba(16,185,129,0.15)' }}>
                        🎊
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 900, color: '#10b981', margin: 0, letterSpacing: '-1px' }}>Assessment Complete</h1>
                    <p style={{ color: '#64748b', fontSize: 15, marginTop: 12, maxWidth: 400, lineHeight: 1.6 }}>Your responses have been securely recorded and are now under review. You'll hear back from us shortly.</p>
                    <button onClick={() => navigate('/user/dashboard')} style={{ ...S.btnPrimary, marginTop: 32 }}>
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    /* ─── Error Screen ─── */
    if (status === 'error') {
        return (
            <div style={S.page}>
                <div style={S.ambientGrid} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: 24 }}>
                    <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(244,63,94,0.08)', border: '2px solid rgba(244,63,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 24 }}>
                        ⚠️
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fb7185', margin: 0 }}>Something went wrong</h2>
                    <p style={{ color: '#64748b', fontSize: 14, marginTop: 12, maxWidth: 420, lineHeight: 1.6 }}>{error}</p>
                    <button onClick={() => window.location.reload()} style={{ ...S.btnPrimary, marginTop: 28, background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    /* ─── Loading Screen ─── */
    if (!question || status === 'loading') {
        return (
            <div style={S.page}>
                <div style={S.ambientGrid} />
                <div style={{ ...S.blobCyan, top: -200, right: -100 }} />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 20 }}>
                    <div style={{ width: 52, height: 52, border: '3px solid rgba(0,229,255,0.08)', borderTopColor: '#00e5ff', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
                    <span style={{ color: '#475569', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '0.1em' }}>INITIALIZING ASSESSMENT...</span>
                </div>
            </div>
        );
    }

    const maxTime = status === 'reading' ? READING_TIME : ANSWER_TIME;

    return (
        <div style={S.page}>
            {/* Ambient Background */}
            <div style={S.ambientGrid} />
            <div style={{ ...S.blobCyan, top: -200, right: -100 }} />
            <div style={{ ...S.blobIndigo, bottom: -200, left: -100 }} />

            {/* ─── Top Navigation Bar ─── */}
            <header style={S.topBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, background: 'linear-gradient(90deg,#00e5ff,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⚡ AI HirePro</span>
                    <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#475569', letterSpacing: '0.15em' }}>LIVE ASSESSMENT</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <QuestionBoard current={question.question_index} total={question.total_questions} />
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                        Q{question.question_index}/{question.total_questions}
                    </div>
                </div>
            </header>

            {/* ─── Main Content Area ─── */}
            <main style={S.main}>
                {/* ─── Left: Timer + Video Panel ─── */}
                <aside style={S.sidebar}>
                    {/* Timer Card */}
                    <div style={S.card}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                            <PhaseBadge phase={status} />
                            <CircularTimer timeLeft={timeLeft} maxTime={maxTime} phase={status} />
                            {status === 'reading' && (
                                <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', lineHeight: 1.5 }}>
                                    Read the question carefully.<br />Recording starts automatically.
                                </p>
                            )}
                            {status === 'answering' && <AudioWaveform />}
                        </div>
                    </div>

                    {/* Video Feed Card */}
                    <div style={{ ...S.card, padding: 0, overflow: 'hidden', position: 'relative' }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: 6 }}>
                            <div style={{ width: 7, height: 7, background: '#f43f5e', borderRadius: '50%', animation: 'pulse 1.2s infinite', boxShadow: '0 0 8px rgba(244,63,94,0.5)' }} />
                            <span style={{ fontSize: 9, fontWeight: 800, color: '#f43f5e', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono',monospace" }}>LIVE</span>
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', display: 'flex', alignItems: 'flex-end', padding: '0 12px 8px', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono',monospace" }}>AI PROCTORING ACTIVE</span>
                        </div>
                    </div>
                </aside>

                {/* ─── Right: Question Panel ─── */}
                <section style={S.questionPanel}>
                    {/* Question Card */}
                    <div style={{ ...S.card, flex: 1, animation: 'enterUp 0.5s ease forwards' }}>
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 16, height: 1, background: '#475569' }} />
                                QUESTION {question.question_index} OF {question.total_questions}
                            </div>
                            <h2 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.65, margin: 0, color: '#e8f0fe', fontFamily: "'Inter',sans-serif" }}>
                                {question.question_text}
                            </h2>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 2,
                                    width: `${(timeLeft / maxTime) * 100}%`,
                                    background: status === 'reading' ? 'linear-gradient(90deg,#00e5ff,#0ea5e9)' : timeLeft <= 10 ? 'linear-gradient(90deg,#f43f5e,#e11d48)' : 'linear-gradient(90deg,#818cf8,#6366f1)',
                                    transition: 'width 1s linear',
                                    boxShadow: status === 'reading' ? '0 0 10px rgba(0,229,255,0.3)' : timeLeft <= 10 ? '0 0 10px rgba(244,63,94,0.3)' : '0 0 10px rgba(99,102,241,0.3)',
                                }} />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                            {status === 'answering' && (
                                <button onClick={() => handleSubmit('MANUAL')} style={S.btnSubmit}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    Submit Answer
                                </button>
                            )}
                            {status === 'reading' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: 12 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e5ff', animation: 'pulse 1.5s infinite' }} />
                                    <span style={{ fontSize: 13, color: '#00e5ff', fontWeight: 600 }}>Recording begins in {timeLeft}s...</span>
                                </div>
                            )}
                            {status === 'submitting' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12 }}>
                                    <div style={{ width: 18, height: 18, border: '2px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
                                    <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>Analyzing response...</span>
                                </div>
                            )}
                        </div>

                        {/* End Interview Button */}
                        {!['loading', 'submitting', 'error', 'completed'].includes(status) && (
                            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'center' }}>
                                <button onClick={() => setShowEndModal(true)} style={S.btnGhost}
                                    onMouseOver={(e) => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.25)'; e.currentTarget.style.background = 'rgba(244,63,94,0.04)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'transparent'; }}>
                                    End Interview Early
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Transcript Card */}
                    {transcript && (
                        <div style={{ ...S.card, animation: 'enterUp 0.4s ease forwards', borderColor: 'rgba(0,229,255,0.12)' }}>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#00e5ff', letterSpacing: '0.12em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 16, height: 1, background: '#00e5ff' }} />
                                LAST TRANSCRIBED RESPONSE
                            </div>
                            <p style={{ fontSize: 14, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>"{transcript}"</p>
                        </div>
                    )}
                </section>
            </main>

            {/* ─── Warning Toast ─── */}
            {latestWarning && (
                <div style={{
                    position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
                    padding: '14px 28px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)',
                    color: '#fb7185', borderRadius: 14, fontSize: 13, fontWeight: 700,
                    backdropFilter: 'blur(16px)', zIndex: 999, display: 'flex', alignItems: 'center', gap: 10,
                    animation: 'shake 0.4s ease, enterUp 0.3s ease', boxShadow: '0 8px 32px rgba(244,63,94,0.15)',
                }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e', animation: 'pulse 1s infinite' }} />
                    {latestWarning}
                </div>
            )}

            {/* ─── End Interview Modal ─── */}
            {showEndModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,17,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'rgba(10,22,40,0.97)', border: '1px solid rgba(255,255,255,0.08)', padding: 36, borderRadius: 24, maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', animation: 'enterScale 0.3s ease forwards' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 8px', color: '#e8f0fe', fontSize: 20, fontWeight: 800 }}>End Interview?</h3>
                        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
                            Remaining questions will be skipped and your current progress will be submitted.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setShowEndModal(false)} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 14, transition: 'all 0.2s' }}>
                                Continue
                            </button>
                            <button onClick={handleEndInterview} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid rgba(225,29,72,0.3)', background: 'rgba(225,29,72,0.15)', color: '#fb7185', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 14, transition: 'all 0.2s' }}>
                                End & Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Bottom Status Bar ─── */}
            <footer style={S.bottomBar}>
                <span style={{ fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>SESSION {interviewId?.slice(0, 8)}</span>
                <span style={{ fontSize: 10, color: '#334155' }}>•</span>
                <span style={{ fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>AI PROCTORING ENABLED</span>
                <span style={{ fontSize: 10, color: '#334155' }}>•</span>
                <span style={{ fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>ENCRYPTED</span>
            </footer>

            <style>{`
                @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
                @keyframes shake { 0%,100% { transform:translateX(-50%); } 25% { transform:translateX(calc(-50% - 4px)); } 75% { transform:translateX(calc(-50% + 4px)); } }
                @keyframes timerPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.08); } }
                @keyframes waveBar {
                    0% { height: 4px; }
                    100% { height: 18px; }
                }
                @keyframes enterUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
                @keyframes enterScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
                @keyframes spin-slow { to { transform:rotate(360deg); } }
            `}</style>
        </div>
    );
};

/* ─── Style Constants ─── */
const S = {
    page: {
        minHeight: '100vh', background: '#020811', fontFamily: "'Outfit',sans-serif", color: '#e8f0fe',
        display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
    },
    ambientGrid: {
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,229,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.02) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
    },
    blobCyan: {
        position: 'fixed', width: 500, height: 500, borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)', filter: 'blur(80px)',
    },
    blobIndigo: {
        position: 'fixed', width: 400, height: 400, borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', filter: 'blur(80px)',
    },
    topBar: {
        padding: '12px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(2,8,17,0.9)', borderBottom: '1px solid rgba(255,255,255,0.04)',
        position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)',
    },
    main: {
        flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, padding: '24px 28px',
        position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', width: '100%',
    },
    sidebar: {
        display: 'flex', flexDirection: 'column', gap: 16,
    },
    questionPanel: {
        display: 'flex', flexDirection: 'column', gap: 16,
    },
    card: {
        background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20,
        padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    },
    btnPrimary: {
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px',
        background: 'linear-gradient(135deg, #00e5ff, #0ea5e9)', color: '#020811',
        fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 14, border: 'none',
        borderRadius: 12, cursor: 'pointer', transition: 'all 0.3s',
        boxShadow: '0 8px 24px rgba(0,229,255,0.25)',
    },
    btnSubmit: {
        display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px',
        background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff',
        fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 14, border: 'none',
        borderRadius: 12, cursor: 'pointer', transition: 'all 0.3s',
        boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
    },
    btnGhost: {
        background: 'transparent', color: '#475569', border: '1px solid rgba(255,255,255,0.06)',
        padding: '9px 20px', borderRadius: 10, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Outfit',sans-serif",
    },
    bottomBar: {
        padding: '10px 28px', display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.03)', position: 'relative', zIndex: 10,
    },
};

export default InterviewSession;
