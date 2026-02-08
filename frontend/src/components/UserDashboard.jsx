import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, authAPI, blobAPI } from '../api/client';

export default function UserDashboard() {
    const [data, setData] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardData, userData] = await Promise.all([
                    userAPI.getDashboard(),
                    authAPI.getMe()
                ]);
                setData(dashboardData);
                setUser(userData);
            } catch (err) {
                console.error('Error fetching data:', err);
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
                    <h1 style={styles.title}>
                        Hello, <span style={styles.highlight}>{user?.name?.split(' ')[0] || 'there'}!</span>
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '18px', marginTop: '12px' }}>Welcome to your personal career command center.</p>
                </div>

                <div style={styles.grid}>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}><span>📁</span> Active Job Brief</h3>
                        <JDPreview />
                    </div>

                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}><span>🚀</span> Your Application</h3>
                        <ResumeUploader />
                    </div>
                </div>
            </main>
        </div>
    );
}

function JDPreview() {
    const [jd, setJd] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJD = async () => {
            try {
                const data = await userAPI.getActiveJD();
                setJd(data);
            } catch (err) {
                console.error('Error fetching JD:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchJD();
    }, []);

    const handleDownload = async () => {
        try {
            const { url } = await blobAPI.getUrl('job-descriptions', jd.jd_blob_path);
            window.open(url, '_blank');
        } catch (err) {
            console.error(err);
            alert('Failed to get download URL');
        }
    };

    if (loading) return <p style={{ color: '#64748b' }}>Locating briefly...</p>;
    if (!jd) return (
        <div style={{ padding: '24px', background: '#fef2f2', borderRadius: '16px', border: '1px solid #fecaca' }}>
            <p style={{ margin: 0, color: '#dc2626', fontSize: '14px', fontWeight: '600' }}>No active job descriptions published yet.</p>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Brief ID</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{jd.job_id}</div>
            </div>

            <div style={{ marginBottom: '32px' }}>
                <span style={{ padding: '4px 12px', background: '#ecfdf5', color: '#059669', borderRadius: '100px', fontSize: '12px', fontWeight: '800' }}>ACTIVE MISSION</span>
            </div>

            <button onClick={handleDownload} style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#1e293b',
                fontWeight: '700',
                cursor: 'pointer',
            }}>
                View / Download JD
            </button>
        </div>
    );
}

function ResumeUploader() {
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [interviewSession, setInterviewSession] = useState(null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [hasJD, setHasJD] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const [jdData, resumeData, interviewData] = await Promise.all([
                    userAPI.getActiveJD(),
                    userAPI.getResumeStatus(),
                    userAPI.getInterviewStatus()
                ]);
                setHasJD(!!jdData);
                setStatus(resumeData);
                setInterviewSession(interviewData);
            } catch (err) {
                console.error('Error checking status:', err);
            }
        };
        checkStatus();
    }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        try {
            const data = await userAPI.uploadResume(file);
            setStatus(data);
            alert('Resume uploaded successfully!');
        } catch (err) {
            alert('Upload failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setUploading(false);
        }
    };

    if (!hasJD) {
        return (
            <div style={{ padding: '24px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '16px' }}>
                <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
                    <strong>Hold Tight!</strong> Job descriptions are being finalized before applications open.
                </p>
            </div>
        );
    }

    if (status) {
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
                                        Start Interview 🚀
                                    </button>
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: '#6366f1', fontSize: '14px' }}>Preparing your interview link... Please wait.</p>
                            )}
                        </div>
                    ) : !isSelected && !isRejected ? (
                        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Our team is currently reviewing your profile. We'll update you soon!</p>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleUpload}>
            <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px' }}>Upload your latest resume to begin the AI matching sequence.</p>
            <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '20px', padding: '30px', textAlign: 'center' }}>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.docx" style={{ display: 'block', width: '100%', marginBottom: '20px' }} />
                <button type="submit" disabled={uploading || !file} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: '#6366f1', color: '#ffffff', fontWeight: '800', opacity: (uploading || !file) ? 0.5 : 1 }}>
                    {uploading ? 'Uploading...' : 'Deploy Resume'}
                </button>
            </div>
        </form>
    );
}
