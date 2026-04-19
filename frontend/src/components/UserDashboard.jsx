import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, authAPI, blobAPI } from '../api/client';

const STEPS = [
  { n: 1, label: 'Apply', icon: '📄' },
  { n: 2, label: 'Under Review', icon: '🔍' },
  { n: 3, label: 'Interview', icon: '🎙️' },
  { n: 4, label: 'Decision', icon: '🏆' },
];

function getStepFromStatus(status, interviewStatus) {
  if (!status) return 1;
  if (status === 'UNDER_REVIEW') return 2;
  if (status === 'SHORTLISTED') return interviewStatus && ['COMPLETED','COMPLETED_EARLY'].includes(interviewStatus) ? 4 : 3;
  if (status === 'SELECTED' || status === 'REJECTED') return 4;
  return 1;
}

export default function UserDashboard() {
    const [data, setData] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allJds, setAllJds] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState("");
    const [resumeStatus, setResumeStatus] = useState(null);
    const [interviewSession, setInterviewSession] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userData, jdsData, rStatus, iStatus] = await Promise.all([
                    authAPI.getMe(),
                    userAPI.getJDs(),
                    userAPI.getResumeStatus().catch(() => null),
                    userAPI.getInterviewStatus().catch(() => null),
                ]);
                setUser(userData);
                setAllJds(jdsData);
                setResumeStatus(rStatus);
                setInterviewSession(iStatus);
                if (jdsData.length > 0) {
                    setSelectedJobId(jdsData[0].job_id);
                }
            } catch (err) {
                console.error('Error fetching dashboard base data:', err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    localStorage.clear();
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const selectedJD = allJds.find(j => j.job_id === selectedJobId);

    const styles = {
        container: {
            fontFamily: "'Outfit', sans-serif",
            color: '#e8f0fe',
            backgroundColor: '#020811',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
        },
        nav: {
            padding: '16px 8%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(2,8,17,0.85)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backdropFilter: 'blur(20px)',
        },
        logo: {
            fontSize: '20px',
            fontWeight: '900',
            letterSpacing: '-0.5px',
            background: 'linear-gradient(90deg, #00e5ff, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            cursor: 'pointer',
        },
        userBadge: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255,255,255,0.04)',
            padding: '6px 14px 6px 8px',
            borderRadius: '100px',
            border: '1px solid rgba(255,255,255,0.08)',
        },
        logoutBtn: {
            background: 'rgba(244,63,94,0.08)',
            color: '#f43f5e',
            border: '1px solid rgba(244,63,94,0.2)',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.2s',
        },
        content: {
            padding: '50px 8%',
            flex: 1,
        },
        header: {
            marginBottom: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        title: {
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: '900',
            lineHeight: '1.2',
            letterSpacing: '-1.5px',
            margin: 0,
            color: '#ffffff',
        },
        highlight: { color: '#00e5ff' },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '28px',
        },
        card: {
            background: 'rgba(10,22,40,0.85)',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '36px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        },
        cardTitle: {
            fontSize: '18px',
            fontWeight: '800',
            marginBottom: '24px',
            color: '#e8f0fe',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },
        jdSelector: {
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            fontSize: '14px',
            fontWeight: '600',
            color: '#e8f0fe',
            outline: 'none',
            minWidth: '220px',
            cursor: 'pointer',
        }
    };
    // Determine step for the step indicator

    if (loading) return (
        <div style={styles.container}>
          <div style={{ ...styles.content, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(0,229,255,0.1)', borderTopColor: '#00e5ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#475569', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Initializing dashboard...</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={styles.container}>
            {/* Ambient BG */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,229,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)', top: -200, right: -100, filter: 'blur(80px)' }} />
            </div>
            <nav style={styles.nav}>
                <div style={styles.logo} onClick={() => navigate('/')}>⚡ AI HirePro</div>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={styles.userBadge}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #00e5ff, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#020811' }}>{user?.name?.[0]?.toUpperCase() || 'C'}</div>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#e8f0fe' }}>{user?.name}</span>
                        <span style={{ fontSize: 10, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>CANDIDATE</span>
                    </div>
                    <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
                </div>
            </nav>

            <main style={{ ...styles.content, position: 'relative', zIndex: 10 }}>
                <div style={styles.header}>
                    <div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#00e5ff', letterSpacing: '0.2em', marginBottom: 12 }}>// CANDIDATE PORTAL</div>
                        <h1 style={styles.title}>
                            Hello, <span style={styles.highlight}>{user?.name?.split(' ')[0] || 'there'}!</span>
                        </h1>
                        <p style={{ color: '#475569', fontSize: '16px', marginTop: '10px' }}>Your personal career command center.</p>
                    </div>

                    {allJds.length > 0 && (
                        <div>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Target Opening</p>
                            <select
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                style={styles.jdSelector}
                            >
                                {allJds.map(j => (
                                    <option key={j.job_id} value={j.job_id}>{j.jd_name || j.job_id}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Step Progress Indicator */}
                <StepIndicator status={resumeStatus} interviewSession={interviewSession} />


                <div style={styles.grid}>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}><span>📁</span> Job Brief Details</h3>
                        <JDPreview jd={selectedJD} />
                    </div>

                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}><span>🚀</span> Your Application</h3>
                        <ResumeUploader selectedJobId={selectedJobId} />
                    </div>
                </div>
            </main>
        </div>
    );
}

function StepIndicator({ status, interviewSession }) {
    const currentStep = getStepFromStatus(status?.status, interviewSession?.status);
    return (
        <div style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '20px 28px', marginBottom: 36, backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Application Journey</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {STEPS.map((step, i) => {
                    const done = step.n < currentStep;
                    const active = step.n === currentStep;
                    return (
                        <React.Fragment key={step.n}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                                    background: done ? 'rgba(16,185,129,0.15)' : active ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)',
                                    border: done ? '1px solid rgba(16,185,129,0.3)' : active ? '1px solid rgba(0,229,255,0.35)' : '1px solid rgba(255,255,255,0.06)',
                                    boxShadow: active ? '0 0 16px rgba(0,229,255,0.15)' : 'none',
                                    transition: 'all 0.4s ease',
                                }}>
                                    {done ? <span style={{ fontSize: 14 }}>✓</span> : step.icon}
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', color: done ? '#10b981' : active ? '#00e5ff' : '#475569', transition: 'color 0.3s' }}>{step.label}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{ width: 40, height: 2, margin: '0 4px', marginBottom: 20, borderRadius: 1, background: done ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)', transition: 'background 0.4s' }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

function JDPreview({ jd }) {
    const handleDownload = async () => {
        try {
            const { url } = await blobAPI.getUrl('job-descriptions', jd.jd_blob_path);
            window.open(url, '_blank');
        } catch (err) {
            console.error(err);
            alert('Failed to get download URL');
        }
    };

    if (!jd) return (
        <div style={{ padding: '24px', background: 'rgba(244,63,94,0.06)', borderRadius: '16px', border: '1px solid rgba(244,63,94,0.2)' }}>
            <p style={{ margin: 0, color: '#fb7185', fontSize: '14px', fontWeight: '600' }}>No active job descriptions published yet.</p>
        </div>
    );

    const intel = jd.intelligence || {};
    const roleContext = intel.role_context || {};
    const skills = intel.skill_intelligence || {};
    const competency = intel.competency_profile || {};

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Target Role</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#e8f0fe' }}>{roleContext.primary_role || jd.jd_name || jd.job_id}</div>
                {(roleContext.department || roleContext.team_name) && (
                    <div style={{ fontSize: '14px', color: '#475569', marginTop: '2px' }}>
                        {roleContext.department} {roleContext.team_name ? `• ${roleContext.team_name}` : ''}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <span style={{ padding: '4px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '100px', fontSize: '12px', fontWeight: '800', border: '1px solid rgba(16,185,129,0.2)' }}>ACTIVE MISSION</span>
                {competency.experience_level && (
                    <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.04)', color: '#64748b', borderRadius: '100px', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(255,255,255,0.08)' }}>{competency.experience_level}</span>
                )}
            </div>

            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job Snapshot</h4>
                <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                    {intel.normalized_jd
                        ? (intel.normalized_jd.slice(0, 400).split('. ').slice(0, -1).join('. ') + '.')
                        : `We are seeking a ${roleContext.seniority || ''} ${roleContext.primary_role || 'Candidate'} to drive innovation in ${roleContext.primary_domain || 'technical engineering'}. This role involves hands-on execution and strategic contribution to our core missions.`
                    }
                </p>
            </div>

            {roleContext.key_responsibilities && roleContext.key_responsibilities.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#e8f0fe', marginBottom: '10px' }}>Key Responsibilities</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: '#94a3b8', lineHeight: '1.6' }}>
                        {roleContext.key_responsibilities.slice(0, 3).map((res, i) => (
                            <li key={i}>{res}</li>
                        ))}
                    </ul>
                </div>
            )}

            {skills.required_technical_skills && skills.required_technical_skills.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#e8f0fe', marginBottom: '10px' }}>Required Skills</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {skills.required_technical_skills.slice(0, 5).map((skill, i) => (
                            <span key={i} style={{ padding: '4px 10px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(99,102,241,0.2)' }}>{skill}</span>
                        ))}
                        {skills.required_technical_skills.length > 5 && (
                            <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.04)', color: '#64748b', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>+{skills.required_technical_skills.length - 5} more</span>
                        )}
                    </div>
                </div>
            )}

            <button onClick={handleDownload} style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(0,229,255,0.2)',
                background: 'rgba(0,229,255,0.06)',
                color: '#00e5ff',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
                fontFamily: "'Outfit',sans-serif",
            }}>
                View Full Brief PDF
            </button>
        </div>
    );
}

function ResumeUploader({ selectedJobId }) {
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [interviewSession, setInterviewSession] = useState(null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [startingInterview, setStartingInterview] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const [resumeData, interviewData] = await Promise.all([
                    userAPI.getResumeStatus(),
                    userAPI.getInterviewStatus()
                ]);
                setStatus(resumeData);
                setInterviewSession(interviewData);
            } catch (err) {
                console.error('Error checking status:', err);
            }
        };
        checkStatus();
    }, [selectedJobId]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !selectedJobId) return;
        setUploading(true);
        try {
            const data = await userAPI.uploadResume(file, selectedJobId);
            setStatus(data);
            alert('Resume uploaded successfully for ' + selectedJobId + '!');
        } catch (err) {
            alert('Upload failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setUploading(false);
        }
    };

    // Start interview on demand — route fixed: /interview/:id (no /user prefix)
    const handleStartAssessment = async () => {
        setStartingInterview(true);
        try {
            const session = await userAPI.startInterview();
            navigate(`/interview/${session.interview_id}`);
        } catch (err) {
            alert('Failed to start interview: ' + (err.response?.data?.detail || err.message));
        } finally {
            setStartingInterview(false);
        }
    };

    if (!selectedJobId) {
        return (
            <div style={{ padding: '24px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px' }}>
                <p style={{ margin: 0, color: '#f59e0b', fontSize: '14px' }}>
                    <strong>Hold Tight!</strong> Select a job brief to begin your application.
                </p>
            </div>
        );
    }

    if (status && status.job_id === selectedJobId) {
        const isSelected = status.status === 'SELECTED';
        const isShortlisted = status.status === 'SHORTLISTED';
        const isRejected = status.status === 'REJECTED';
        const isUnlocked = status.interview_unlocked;

        return (
            <div>
                <div style={{
                    padding: '24px',
                    borderRadius: '24px',
                    background: isSelected ? 'rgba(16,185,129,0.06)' : isRejected ? 'rgba(244,63,94,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? 'rgba(16,185,129,0.25)' : isRejected ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.06)'}`,
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Phase Status</span>
                        <span style={{
                            padding: '4px 12px',
                            background: isSelected ? '#059669' : isRejected ? '#dc2626' : '#6366f1',
                            color: '#ffffff',
                            borderRadius: '100px',
                            fontSize: '11px',
                            fontWeight: '900'
                        }}>
                            {status.status.replace('_', ' ')}
                        </span>
                    </div>

                    {isSelected && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '42px', marginBottom: '16px' }}>🎉</div>
                            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#10b981', margin: 0 }}>You're Hired!</h2>
                            <p style={{ color: '#6ee7b7', fontSize: '15px', marginTop: '8px' }}>Congratulations! We can't wait to have you on the team.</p>
                        </div>
                    )}

                    {isRejected && (
                        <div>
                            <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#fb7185', margin: 0 }}>Application Update</h4>
                            <p style={{ color: '#fda4af', fontSize: '14px', marginTop: '8px', lineHeight: '1.6' }}>
                                Thank you for your interest. Unfortunately, we've decided to move forward with other candidates at this time.
                            </p>
                        </div>
                    )}

                    {isShortlisted && isUnlocked ? (
                        <div>
                            <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '24px' }}>
                                <strong>Success!</strong> You've been invited to complete our AI-based technical assessment.
                            </p>

                            {interviewSession ? (
                                ['COMPLETED', 'COMPLETED_EARLY'].includes(interviewSession.status) ? (
                                    <div style={{ padding: '24px', background: 'rgba(16,185,129,0.08)', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.25)', textAlign: 'center' }}>
                                        <p style={{ color: '#10b981', fontWeight: 'bold', margin: 0 }}>✅ Interview Completed</p>
                                        <p style={{ color: '#6ee7b7', fontSize: '13px', marginTop: '4px' }}>Your responses are being evaluated. Thank you!</p>
                                    </div>
                                ) : (
                                    <div style={{ padding: '24px', background: 'rgba(99,102,241,0.06)', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                        <button
                                            onClick={() => navigate(`/interview/${interviewSession.interview_id}`)}
                                            style={{
                                                width: '100%',
                                                padding: '16px',
                                                background: '#6366f1',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                fontWeight: '800',
                                                fontSize: '16px',
                                                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                                            }}>
                                            Resume Interview 🚀
                                        </button>
                                    </div>
                                )
                            ) : (
                                // Replace the waiting message with a Start Assessment button
                                <div style={{ padding: '24px', background: 'rgba(99,102,241,0.06)', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
                                    <button
                                        onClick={handleStartAssessment}
                                        disabled={startingInterview}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            background: '#6366f1',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            cursor: startingInterview ? 'not-allowed' : 'pointer',
                                            fontWeight: '800',
                                            fontSize: '16px',
                                            opacity: startingInterview ? 0.6 : 1,
                                            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                                        }}>
                                        {startingInterview ? 'Starting Assessment...' : 'Start Assessment 🚀'}
                                    </button>
                                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px' }}>
                                        This will begin your AI-powered technical interview. Ensure you have a stable internet connection and a quiet environment.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : !isSelected && !isRejected ? (
                        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Our team is currently reviewing your profile for <strong>{selectedJobId}</strong>. We'll update you soon!</p>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleUpload}>
            <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px' }}>Upload your latest resume to apply for <span style={{ fontWeight: '700', color: '#818cf8' }}>{selectedJobId}</span>.</p>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px', padding: '30px', textAlign: 'center' }}>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.docx" style={{ display: 'block', width: '100%', marginBottom: '20px', color: '#94a3b8' }} />
                <button type="submit" disabled={uploading || !file} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: '#6366f1', color: '#ffffff', fontWeight: '800', opacity: (uploading || !file) ? 0.5 : 1, cursor: (uploading || !file) ? 'not-allowed' : 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                    {uploading ? 'Transmitting...' : 'Upload for ' + selectedJobId}
                </button>
            </div>
        </form>
    );
}