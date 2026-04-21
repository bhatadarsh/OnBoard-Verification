import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, authAPI, blobAPI } from '../api/client';

export default function UserDashboard() {
    const [data, setData] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allJds, setAllJds] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userData, jdsData] = await Promise.all([
                    authAPI.getMe(),
                    userAPI.getJDs()
                ]);
                setUser(userData);
                setAllJds(jdsData);
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
            color: '#1e293b',
            backgroundColor: '#f8fafc',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
        },
        nav: {
            padding: '16px 8%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        },
        logo: {
            fontSize: '24px',
            fontWeight: '900',
            letterSpacing: '-1px',
            background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            cursor: 'pointer',
        },
        userBadge: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#f1f5f9',
            padding: '6px 16px',
            borderRadius: '100px',
            border: '1px solid #e2e8f0',
        },
        logoutBtn: {
            background: '#fee2e2',
            color: '#ef4444',
            border: '1px solid #fecaca',
            padding: '8px 16px',
            borderRadius: '100px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
        },
        content: {
            padding: '60px 8%',
            flex: 1,
        },
        header: {
            marginBottom: '50px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        title: {
            fontSize: 'clamp(32px, 5vw, 42px)',
            fontWeight: '900',
            lineHeight: '1.2',
            letterSpacing: '-1.5px',
            margin: 0,
            color: '#0f172a',
        },
        highlight: {
            color: '#6366f1',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '32px',
        },
        card: {
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '40px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)',
        },
        cardTitle: {
            fontSize: '20px',
            fontWeight: '800',
            marginBottom: '24px',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },
        jdSelector: {
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            fontSize: '15px',
            fontWeight: '600',
            color: '#1e293b',
            outline: 'none',
            minWidth: '250px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }
    };

    if (loading) return <div style={styles.container}><div style={{ ...styles.content, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
        <div className="pulse" style={{ fontWeight: 'bold', color: '#6366f1' }}>Preparing Your Dashboard...</div>
    </div></div>;

    return (
        <div style={styles.container}>
            <nav style={styles.nav}>
                <div style={styles.logo} onClick={() => navigate('/')}>AI Hire Pro</div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={styles.userBadge}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Candidate:</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{user?.name}</span>
                    </div>
                    <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
                </div>
            </nav>

            <main style={styles.content}>
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.title}>
                            Hello, <span style={styles.highlight}>{user?.name?.split(' ')[0] || 'there'}!</span>
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '18px', marginTop: '12px' }}>Welcome to your personal career command center.</p>
                    </div>

                    {allJds.length > 0 && (
                        <div>
                            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '8px', textAlign: 'right' }}>Target Opening</p>
                            <select
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                style={styles.jdSelector}
                            >
                                {allJds.map(j => (
                                    <option key={j.job_id} value={j.job_id}>{j.job_id}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

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
        <div style={{ padding: '24px', background: '#fef2f2', borderRadius: '16px', border: '1px solid #fecaca' }}>
            <p style={{ margin: 0, color: '#dc2626', fontSize: '14px', fontWeight: '600' }}>No active job descriptions published yet.</p>
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
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{roleContext.primary_role || jd.jd_name || jd.job_id}</div>
                {(roleContext.department || roleContext.team_name) && (
                    <div style={{ fontSize: '14px', color: '#475569', marginTop: '2px' }}>
                        {roleContext.department} {roleContext.team_name ? `• ${roleContext.team_name}` : ''}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <span style={{ padding: '4px 12px', background: '#ecfdf5', color: '#059669', borderRadius: '100px', fontSize: '12px', fontWeight: '800' }}>ACTIVE MISSION</span>
                {competency.experience_level && (
                    <span style={{ padding: '4px 12px', background: '#f1f5f9', color: '#475569', borderRadius: '100px', fontSize: '12px', fontWeight: '600' }}>{competency.experience_level}</span>
                )}
            </div>

            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job Snapshot</h4>
                <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
                    {intel.normalized_jd
                        ? (intel.normalized_jd.slice(0, 400).split('. ').slice(0, -1).join('. ') + '.')
                        : `We are seeking a ${roleContext.seniority || ''} ${roleContext.primary_role || 'Candidate'} to drive innovation in ${roleContext.primary_domain || 'technical engineering'}. This role involves hands-on execution and strategic contribution to our core missions.`
                    }
                </p>
            </div>

            {roleContext.key_responsibilities && roleContext.key_responsibilities.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>Key Responsibilities</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                        {roleContext.key_responsibilities.slice(0, 3).map((res, i) => (
                            <li key={i}>{res}</li>
                        ))}
                    </ul>
                </div>
            )}

            {skills.required_technical_skills && skills.required_technical_skills.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>Required Skills</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {skills.required_technical_skills.slice(0, 5).map((skill, i) => (
                            <span key={i} style={{ padding: '4px 10px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>{skill}</span>
                        ))}
                        {skills.required_technical_skills.length > 5 && (
                            <span style={{ padding: '4px 10px', background: '#f1f5f9', color: '#64748b', borderRadius: '6px', fontSize: '12px' }}>+{skills.required_technical_skills.length - 5} more</span>
                        )}
                    </div>
                </div>
            )}

            <button onClick={handleDownload} style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#1e293b',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
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

    // NEW: Start interview on demand
    const handleStartAssessment = async () => {
        setStartingInterview(true);
        try {
            const session = await userAPI.startInterview();
            // ✅ FIX: Add '/user' prefix
            navigate(`/user/interview/${session.interview_id}`);
        } catch (err) {
            alert('Failed to start interview: ' + (err.response?.data?.detail || err.message));
        } finally {
            setStartingInterview(false);
        }
    };

    if (!selectedJobId) {
        return (
            <div style={{ padding: '24px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '16px' }}>
                <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
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
                    background: isSelected ? '#ecfdf5' : isRejected ? '#fef2f2' : '#f8fafc',
                    border: `1px solid ${isSelected ? '#10b981' : isRejected ? '#ef4444' : '#e2e8f0'}`,
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
                            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#059669', margin: 0 }}>You're Hired!</h2>
                            <p style={{ color: '#064e3b', fontSize: '15px', marginTop: '8px' }}>Congratulations! We can't wait to have you on the team.</p>
                        </div>
                    )}

                    {isRejected && (
                        <div>
                            <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#dc2626', margin: 0 }}>Application Update</h4>
                            <p style={{ color: '#991b1b', fontSize: '14px', marginTop: '8px', lineHeight: '1.6' }}>
                                Thank you for your interest. Unfortunately, we've decided to move forward with other candidates at this time.
                            </p>
                        </div>
                    )}

                    {isShortlisted && isUnlocked ? (
                        <div>
                            <p style={{ fontSize: '15px', color: '#334155', marginBottom: '24px' }}>
                                <strong>Success!</strong> You've been invited to complete our AI-based technical assessment.
                            </p>

                            {interviewSession ? (
                                ['COMPLETED', 'COMPLETED_EARLY'].includes(interviewSession.status) ? (
                                    <div style={{ padding: '24px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                                        <p style={{ color: '#15803d', fontWeight: 'bold', margin: 0 }}>✅ Interview Completed</p>
                                        <p style={{ color: '#166534', fontSize: '13px', marginTop: '4px' }}>Your responses are currently being evaluated. Thank you!</p>
                                    </div>
                                ) : (
                                    <div style={{ padding: '24px', background: '#f5f3ff', borderRadius: '16px', border: '1px solid #ddd6fe' }}>
                                        <button
                                            onClick={() => navigate(`/user/interview/${interviewSession.interview_id}`)}
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
                                <div style={{ padding: '24px', background: '#f5f3ff', borderRadius: '16px', border: '1px solid #ddd6fe', textAlign: 'center' }}>
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
            <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px' }}>Upload your latest resume to apply for <span style={{ fontWeight: '700', color: '#6366f1' }}>{selectedJobId}</span>.</p>
            <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '20px', padding: '30px', textAlign: 'center' }}>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.docx" style={{ display: 'block', width: '100%', marginBottom: '20px' }} />
                <button type="submit" disabled={uploading || !file} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: '#6366f1', color: '#ffffff', fontWeight: '800', opacity: (uploading || !file) ? 0.5 : 1 }}>
                    {uploading ? 'Transmitting...' : 'Upload for ' + selectedJobId}
                </button>
            </div>
        </form>
    );
}