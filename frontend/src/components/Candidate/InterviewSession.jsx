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
            <div className="interview-container-pro">
                <div className="pro-card text-center" style={{ padding: '60px', maxWidth: '500px', margin: 'auto', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', color: '#10b981', marginBottom: '20px' }}>✓</div>
                    <h1 style={{ color: '#1e293b', fontSize: '28px', marginBottom: '15px', fontWeight: 600 }}>Interview Completed</h1>
                    <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '30px', lineHeight: '1.6' }}>
                        Your interview has been successfully submitted.<br />
                        Our team will evaluate your responses and contact you shortly.
                    </p>
                    <button onClick={() => { if (onEnd) onEnd(); }} className="btn-primary-pro">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="interview-container-pro">
                <div className="pro-card text-center" style={{ padding: '60px', maxWidth: '500px', margin: 'auto', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', color: '#ef4444', marginBottom: '20px' }}>⚠️</div>
                    <h2 style={{ color: '#1e293b', marginBottom: '15px', fontWeight: 600 }}>Connection Error</h2>
                    <p style={{ color: '#64748b', marginBottom: '30px' }}>{error}</p>
                    <button onClick={() => window.location.reload()} className="btn-primary-pro" style={{ background: '#ef4444' }}>
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    if (!question || status === 'loading') {
        return (
            <div className="interview-container-pro">
                <div style={{ textAlign: 'center', margin: 'auto' }}>
                    <div className="spinner-pro"></div>
                    <div style={{ marginTop: '20px', color: '#64748b', fontSize: '15px', fontWeight: 500 }}>
                        Loading Interview Module...
                    </div>
                </div>
                <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                .interview-container-pro {
                    min-height: 100vh; background: #f8fafc;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 40px; font-family: 'Inter', sans-serif; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    overflow-y: auto; z-index: 9999;
                }
                .spinner-pro {
                    width: 48px; height: 48px; border: 3px solid #e2e8f0; border-top-color: #3b82f6;
                    border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    const progress = status === 'reading'
        ? (timeLeft / READING_TIME) * 100
        : (timeLeft / ANSWER_TIME) * 100;

    return (
        <div className="interview-container-pro">
            <div className="pro-layout-grid">
                
                {/* Left Column: Camera */}
                <div className="pro-left-col">
                    <div className="pro-video-wrapper">
                        <video ref={videoRef} autoPlay playsInline muted className="pro-video" />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <div className="pro-rec-indicator">
                            <span className="pro-rec-dot" /> REC
                        </div>
                        <div className="pro-timer-overlay">
                            00:{timeLeft.toString().padStart(2, '0')}
                        </div>
                    </div>

                    {/* Warnings below video */}
                    {latestWarning && (
                        <div className="pro-warning-banner">
                            ⚠️ {latestWarning}
                        </div>
                    )}
                </div>

                {/* Right Column: Question & Controls */}
                <div className="pro-right-col">
                    <div className="pro-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div className="pro-q-header">
                            <span className="pro-q-badge">Question {question.question_index} of {question.total_questions || '?'}</span>
                            <span className={`pro-status-tag ${status === 'reading' ? 'tag-reading' : 'tag-answering'}`}>
                                {status === 'reading' ? 'Reading Phase' : 'Recording Answer'}
                            </span>
                        </div>

                        <div className="pro-progress-bar">
                            <div className="pro-progress-fill" style={{
                                width: `${progress}%`,
                                backgroundColor: status === 'reading' ? '#3b82f6' : '#ef4444'
                            }} />
                        </div>

                        <h2 className="pro-question-text">
                            {question.question_text}
                        </h2>

                        <div className="pro-actions-area">
                            {status === 'answering' && (
                                <button onClick={() => handleSubmit('MANUAL')} className="btn-primary-pro">
                                    Submit Answer
                                </button>
                            )}
                            {status === 'reading' && (
                                <p className="pro-hint-text">
                                    Recording starts in {timeLeft} seconds...
                                </p>
                            )}
                            {status === 'submitting' && (
                                <div className="pro-submitting">
                                    <div className="spinner-pro-small"></div>
                                    <span>Saving Response...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom part: Transcript */}
                    {transcript && (
                        <div className="pro-card" style={{ marginTop: '20px', padding: '20px' }}>
                            <div className="pro-transcript-title">Previous Answer Transcript:</div>
                            <p className="pro-transcript-text">"{transcript}"</p>
                        </div>
                    )}
                </div>

            </div>

            {/* End Interview / Abort */}
            {!['loading', 'submitting', 'error', 'completed'].includes(status) && (
                <div className="pro-footer">
                    <button onClick={() => setShowEndModal(true)} className="btn-outline-pro">
                        End Interview
                    </button>
                </div>
            )}

            {showEndModal && (
                <div className="pro-modal-overlay">
                    <div className="pro-modal-box">
                        <h3 className="pro-modal-title">End Interview?</h3>
                        <p className="pro-modal-desc">
                            Are you sure you want to end the interview early? 
                            <strong> Remaining questions will be skipped</strong> and your current progress will be submitted.
                        </p>
                        <div className="pro-modal-actions">
                            <button onClick={() => setShowEndModal(false)} className="btn-outline-pro" style={{ flex: 1 }}>
                                Cancel
                            </button>
                            <button onClick={handleEndInterview} className="btn-primary-pro" style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}>
                                Confirm End
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                
                .interview-container-pro {
                    min-height: 100vh; background: #f8fafc; color: #334155;
                    font-family: 'Inter', sans-serif; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    overflow-y: auto; z-index: 9999; display: flex; flex-direction: column; padding: 40px;
                }
                .pro-layout-grid {
                    display: grid; grid-template-columns: 450px 1fr; gap: 30px; max-width: 1200px; width: 100%; margin: 0 auto; flex: 1;
                }
                .pro-left-col { display: flex; flex-direction: column; gap: 20px; }
                .pro-right-col { display: flex; flex-direction: column; }
                
                .pro-card {
                    background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                }
                
                .pro-video-wrapper {
                    position: relative; width: 100%; aspect-ratio: 4/3; background: #0f172a; border-radius: 12px; overflow: hidden;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 4px solid white;
                }
                .pro-video { width: 100%; height: 100%; object-fit: cover; }
                
                .pro-rec-indicator {
                    position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.6); color: white;
                    padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(4px);
                }
                .pro-rec-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 1.5s infinite; }
                
                .pro-timer-overlay {
                    position: absolute; bottom: 16px; left: 16px; background: rgba(0,0,0,0.6); color: white;
                    padding: 6px 12px; border-radius: 6px; font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; backdrop-filter: blur(4px);
                }
                
                .pro-q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .pro-q-badge { background: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; }
                
                .pro-status-tag { padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; }
                .tag-reading { background: #eff6ff; color: #2563eb; }
                .tag-answering { background: #fef2f2; color: #dc2626; animation: subtlePulse 2s infinite; }
                
                .pro-progress-bar { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; margin-bottom: 30px; }
                .pro-progress-fill { height: 100%; transition: width 1s linear; }
                
                .pro-question-text { font-size: 24px; font-weight: 600; color: #0f172a; line-height: 1.5; margin: 0 0 40px 0; }
                
                .pro-actions-area { margin-top: auto; display: flex; justify-content: center; min-height: 50px; align-items: center; }
                .btn-primary-pro {
                    background: #2563eb; color: white; border: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;
                    cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); font-family: 'Inter', sans-serif;
                }
                .btn-primary-pro:hover { background: #1d4ed8; transform: translateY(-1px); }
                
                .pro-hint-text { color: #64748b; font-size: 15px; font-weight: 500; }
                
                .pro-submitting { display: flex; align-items: center; gap: 12px; color: #2563eb; font-weight: 500; }
                .spinner-pro-small { width: 20px; height: 20px; border: 2px solid #bfdbfe; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite; }
                
                .pro-transcript-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
                .pro-transcript-text { font-size: 14px; color: #334155; line-height: 1.6; font-style: italic; margin: 0; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #cbd5e1; }
                
                .pro-footer { max-width: 1200px; width: 100%; margin: 30px auto 0; text-align: right; }
                .btn-outline-pro {
                    background: white; color: #64748b; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;
                    cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
                }
                .btn-outline-pro:hover { border-color: #94a3b8; color: #334155; background: #f8fafc; }
                
                .pro-warning-banner { background: #fffbeb; border: 1px solid #fde68a; color: #d97706; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; }
                
                .pro-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px); }
                .pro-modal-box { background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
                .pro-modal-title { margin: 0 0 10px 0; font-size: 20px; color: #0f172a; font-weight: 600; }
                .pro-modal-desc { margin: 0 0 24px 0; color: #64748b; font-size: 14px; line-height: 1.6; }
                .pro-modal-actions { display: flex; gap: 12px; }
                
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                @keyframes subtlePulse { 0% { background: #fef2f2; } 50% { background: #fee2e2; } 100% { background: #fef2f2; } }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default InterviewSession;
