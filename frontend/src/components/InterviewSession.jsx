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

    const timerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Constants
    const READING_TIME = 20;
    const ANSWER_TIME = 45;

    useEffect(() => {
        loadQuestion();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            stopRecording();
        };
    }, []);

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
        setStatus('reading');
        setTimeLeft(READING_TIME);

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    startAnsweringPhase();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startAnsweringPhase = async () => {
        setStatus('answering');
        setTimeLeft(ANSWER_TIME);

        // Start Recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Try to find a supported mimeType
            const types = ['audio/webm', 'audio/ogg', 'audio/mp4'];
            const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.start();
        } catch (err) {
            console.error('Recording start failed:', err);
            // Don't block the interview, but allow text progression if possible
            // For now, we show error as requested, but we could fallback to "no audio" mode
            setError('Microphone access denied or recording failed. Please enable it to continue.');
            return;
        }

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleSubmit('TIMEOUT');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            try {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            } catch (e) {
                console.error('Error stopping recorder:', e);
            }
        }
    };

    const handleSubmit = async (submissionType) => {
        if (status === 'submitting') return;

        setStatus('submitting');
        if (timerRef.current) clearInterval(timerRef.current);

        const processSubmission = async (blob) => {
            try {
                const res = await interviewAPI.submitAnswer(interviewId, blob || new Blob(), submissionType);
                setTranscript(res.transcript);

                if (res.status === 'COMPLETED') {
                    setStatus('completed');
                } else if (res.next_question) {
                    setQuestion(res.next_question);
                    startReadingPhase();
                } else {
                    loadQuestion(); // Final fallback
                }
            } catch (err) {
                setError('Submission failed: ' + (err.response?.data?.detail || err.message));
                setStatus('error');
            }
        };

        // stop recording and get blob
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType });
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                processSubmission(audioBlob);
            };
            mediaRecorderRef.current.stop();
        } else {
            // No active recording (maybe it errored during start)
            processSubmission(null);
        }
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
            </div>

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
