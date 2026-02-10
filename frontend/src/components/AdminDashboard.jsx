import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI, blobAPI } from '../api/client';

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allJds, setAllJds] = useState([]);
    const [filterJobId, setFilterJobId] = useState("ALL");
    const navigate = useNavigate();

    const fetchJDs = async () => {
        try {
            const data = await adminAPI.getJD();
            setAllJds(data);
        } catch (err) {
            console.error('Error fetching JDs:', err);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardData, userData] = await Promise.all([
                    adminAPI.getDashboard(),
                    authAPI.getMe()
                ]);
                setData(dashboardData);
                setUser(userData);
                await fetchJDs();
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
            position: 'relative',
        },
        nav: {
            padding: '16px 5%',
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
            transition: 'all 0.3s ease',
        },
        content: {
            padding: '40px 5%',
            flex: 1,
        },
        header: {
            marginBottom: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
        },
        title: {
            fontSize: '32px',
            fontWeight: '900',
            letterSpacing: '-1px',
            margin: 0,
            color: '#0f172a',
        },
        subtitle: {
            color: '#64748b',
            fontSize: '16px',
            marginTop: '8px',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1fr) 2.5fr',
            gap: '32px',
        },
        card: {
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '32px',
            height: 'fit-content',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)',
        },
        refreshBtn: {
            background: '#e0e7ff',
            color: '#4338ca',
            border: '1px solid #c7d2fe',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
        }
    };

    if (loading) return <div style={styles.container}><div style={{ ...styles.content, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
        <div className="pulse" style={{ fontWeight: 'bold', color: '#6366f1' }}>Syncing Intelligence...</div>
    </div></div>;

    return (
        <div style={styles.container}>
            <nav style={styles.nav}>
                <div style={styles.logo} onClick={() => navigate('/')}>AI Hire Pro</div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {user && (
                        <div style={styles.userBadge}>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>Admin:</span>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{user.name}</span>
                        </div>
                    )}
                    <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
                </div>
            </nav>

            <main style={styles.content}>
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.title}>Recruitment Hub</h1>
                        <p style={styles.subtitle}>Manage your job briefs and evaluate candidate performance.</p>
                    </div>
                    <button onClick={() => window.location.reload()} style={styles.refreshBtn}>
                        🔄 Refresh Data
                    </button>
                </div>

                <div style={styles.grid}>
                    <div style={styles.card}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '24px', color: '#4f46e5' }}>Active Briefs</h3>
                        <JDManager jds={allJds} onRefresh={fetchJDs} />
                    </div>

                    <div style={{ ...styles.card, background: '#ffffff' }}>
                        <ResumeList allJds={allJds} filterJobId={filterJobId} setFilterJobId={setFilterJobId} />
                    </div>
                </div>
            </main>
        </div>
    );
}

function JDManager({ jds, onRefresh }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        try {
            await adminAPI.uploadJD(file);
            alert('JD uploaded successfully!');
            setFile(null);
            onRefresh();
        } catch (err) {
            alert('Upload failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (jobId) => {
        if (!window.confirm('Delete this Job Description?')) return;
        try {
            await adminAPI.deleteJD(jobId);
            onRefresh();
        } catch (err) {
            alert('Delete failed: ' + (err.response?.data?.detail || err.message));
        }
    };

    const styles = {
        uploadBox: {
            background: '#f8fafc',
            border: '2px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            textAlign: 'center',
        },
        fileInput: {
            display: 'block',
            width: '100%',
            marginBottom: '16px',
            color: '#64748b',
            fontSize: '13px',
        },
        uploadBtn: {
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: '#6366f1',
            color: '#ffffff',
            fontWeight: '700',
            cursor: 'pointer',
        },
        jdItem: {
            padding: '16px',
            background: '#f1f5f9',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        }
    };

    return (
        <div>
            <form onSubmit={handleUpload} style={styles.uploadBox}>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.docx" style={styles.fileInput} />
                <button type="submit" disabled={uploading || !file} style={{ ...styles.uploadBtn, opacity: (uploading || !file) ? 0.5 : 1 }}>
                    {uploading ? 'Uploading...' : 'Upload New JD'}
                </button>
            </form>

            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#6366f1', marginBottom: '16px', fontWeight: '800' }}>Deployed Assets</h4>
            {jds.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>No briefs active.</p> : (
                <div>
                    {jds.map(jd => (
                        <div key={jd.job_id} style={styles.jdItem}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{jd.job_id}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{new Date(jd.uploaded_at).toLocaleDateString()}</div>
                            </div>
                            <button onClick={() => handleDelete(jd.job_id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Delete</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ResumeList({ allJds, filterJobId, setFilterJobId }) {
    const [resumes, setResumes] = useState([]);
    const [sortBy, setSortBy] = useState('newest');
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchResumes = async () => {
        try {
            const data = await adminAPI.getCandidates();
            setResumes(data);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Error fetching candidates:', err);
        }
    };

    useEffect(() => {
        fetchResumes();
        const intervalId = setInterval(fetchResumes, 10000);
        return () => clearInterval(intervalId);
    }, []);

    const handleAction = async (candidateId, decision) => {
        try {
            await adminAPI.shortlistCandidate(candidateId, decision);
            alert(`Candidate ${decision.toLowerCase()} successfully!`);
            fetchResumes();
        } catch (err) {
            alert('Action failed: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleDeleteCandidate = async (candidateId) => {
        if (!window.confirm('Permanently delete candidate profile?')) return;
        try {
            await adminAPI.deleteCandidate(candidateId);
            setResumes(prev => prev.filter(r => r.candidate_id !== candidateId));
        } catch (err) {
            alert('Delete failed: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleDownloadReport = (candidateId) => {
        const token = localStorage.getItem('token');
        window.open(`http://localhost:8000/admin/candidates/${candidateId}/report?token=${token}`, '_blank');
    };

    const filteredCandidates = resumes.filter(r => filterJobId === "ALL" || r.jd_id === filterJobId);

    const sortedResumes = [...filteredCandidates].sort((a, b) => {
        if (sortBy === 'score') return (b.total_interview_score || 0) - (a.total_interview_score || 0);
        return 0;
    });

    const styles = {
        candidateCard: {
            padding: '24px',
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
        },
        badge: {
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '800',
            textTransform: 'uppercase',
        },
        scoreBadge: {
            background: '#f5f3ff',
            color: '#6d28d9',
            padding: '8px 20px',
            borderRadius: '12px',
            fontWeight: '900',
            fontSize: '15px',
            border: '1px solid #ddd6fe',
        },
        actionBtn: {
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            background: '#f8fafc',
            color: '#1e293b',
        },
        filterSelect: {
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            fontSize: '13px',
            fontWeight: '600',
            color: '#4f46e5',
            outline: 'none',
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#1e293b' }}>Talent Pipeline</h3>
                    <select
                        value={filterJobId}
                        onChange={(e) => setFilterJobId(e.target.value)}
                        style={styles.filterSelect}
                    >
                        <option value="ALL">All Applicants</option>
                        {allJds.map(j => (
                            <option key={j.job_id} value={j.job_id}>{j.job_id}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Synced at {lastRefresh.toLocaleTimeString()}</div>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff' }}>
                        <option value="newest">Sort: Date</option>
                        <option value="score">Sort: Peak Performance</option>
                    </select>
                </div>
            </div>

            {sortedResumes.length === 0 ? <p style={{ color: '#64748b' }}>No candidates found for this selection.</p> : (
                <div>
                    {sortedResumes.map(r => (
                        <div key={r.resume_id} style={{
                            ...styles.candidateCard,
                            borderLeft: `6px solid ${r.admin_status === 'SELECTED' ? '#10b981' : r.admin_status === 'REJECTED' ? '#ef4444' : '#6366f1'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '800', textTransform: 'uppercase' }}>
                                    Applied for: <span style={{ color: '#4338ca' }}>{r.jd_name || r.jd_id || "Unassigned"}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                <div>
                                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>Candidate #{r.candidate_id}</div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <span style={{
                                            ...styles.badge,
                                            background: r.admin_status === 'SELECTED' ? '#ecfdf5' : r.admin_status === 'REJECTED' ? '#fef2f2' : '#f5f3ff',
                                            color: r.admin_status === 'SELECTED' ? '#059669' : r.admin_status === 'REJECTED' ? '#dc2626' : '#4f46e5'
                                        }}>{r.admin_status.replace('_', ' ')}</span>
                                    </div>
                                </div>
                                {r.total_interview_score > 0 && (
                                    <div style={styles.scoreBadge}>Peak IQ: {r.total_interview_score.toFixed(1)}</div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Integrity</div>
                                    <div style={{ fontWeight: 'bold', color: r.cheating_severity === 'LOW' ? '#059669' : '#dc2626' }}>{r.cheating_severity}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Tab Shifts</div>
                                    <div style={{ fontWeight: 'bold', color: r.tab_change_count <= 2 ? '#059669' : '#f59e0b' }}>{r.tab_change_count}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Brief Match</div>
                                    <div style={{ fontWeight: 'bold', color: r.system_score >= 7 ? '#059669' : r.system_score >= 4 ? '#f59e0b' : '#dc2626' }}>{r.system_score.toFixed(1)}/10</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Resume Rec</div>
                                    <div style={{ fontWeight: 'bold', color: r.system_shortlisted ? '#059669' : '#dc2626' }}>{r.system_shortlisted ? '✅ YES' : '❌ NO'}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Interview Rec</div>
                                    <div style={{ fontWeight: 'bold', color: (r.interview_recommendation === 'HIRE' || r.interview_recommendation === 'STRONG HIRE') ? '#059669' : r.interview_recommendation === 'PENDING' ? '#94a3b8' : '#dc2626' }}>{r.interview_recommendation}</div>
                                </div>
                            </div>

                            <div style={{ padding: '20px', background: '#f5f3ff', borderRadius: '16px', border: '1px solid #ddd6fe', marginBottom: '24px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '900', color: '#5b21b6', marginBottom: '8px' }}>🤖 AI ASSESSMENT</div>
                                <p style={{ fontSize: '14px', color: '#4c1d95', lineHeight: '1.6', margin: 0 }}>{r.system_reason?.summary || "Analysis pending..."}</p>
                            </div>

                            {r.admin_insights && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                    <div style={{ padding: '20px', background: '#f0f9ff', borderRadius: '16px', border: '1px solid #bae6fd' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>JD–Resume Alignment</div>
                                        <p style={{ fontSize: '13px', color: '#0c4a6e', lineHeight: '1.6', margin: 0 }}>{r.admin_insights.matched_skills_summary}</p>
                                    </div>
                                    <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#15803d', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Strengths</div>
                                        <p style={{ fontSize: '13px', color: '#064e3b', lineHeight: '1.6', margin: 0 }}>{r.admin_insights.candidate_strengths}</p>
                                    </div>
                                </div>
                            )}

                            {r.misconduct_events && r.misconduct_events.length > 0 && (
                                <details style={{ marginBottom: '16px' }}>
                                    <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: '800', color: '#dc2626', outline: 'none' }}>🚩 Integrity Flag Details ({r.misconduct_events.length})</summary>
                                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {r.misconduct_events.map((evt, i) => (
                                            <div key={i} style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2', fontSize: '13px', color: '#b91c1c' }}>
                                                <strong>{new Date(evt.timestamp * 1000).toLocaleTimeString()}</strong>: {
                                                    evt.cheating_flags ? evt.cheating_flags.map(f => {
                                                        if (f === 'COMBINED_MISCONDUCT_PEOPLE_AND_MOBILE') return '🚨 CRITICAL: Multiple people detected with mobile usage';
                                                        if (f === 'MULTIPLE_PEOPLE_DETECTED') return 'Multiple people in frame';
                                                        if (f === 'MOBILE_DETECTED') return 'Mobile phone detected';
                                                        if (f === 'NOT_IN_FRAME') return 'Candidate not in frame';
                                                        return f.replace(/_/g, ' ');
                                                    }).join(' | ') : (evt.event_type || 'Unknown').replace(/_/g, ' ')
                                                }
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {r.evaluation_results && (
                                <details style={{ marginBottom: '24px' }}>
                                    <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: '800', color: '#7c3aed', outline: 'none' }}>Detailed Turn Breakdown</summary>
                                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {r.evaluation_results.per_answer_results?.map((ev, i) => (
                                            <div key={i} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontWeight: '900', color: '#6366f1', fontSize: '11px', textTransform: 'uppercase' }}>Turn {i + 1}</span>
                                                    <span style={{ color: ev.score >= 7 ? '#059669' : ev.score >= 4 ? '#d97706' : '#dc2626', fontWeight: '900' }}>{ev.score}/10</span>
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>"{ev.reasoning_notes}"</div>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                <a href={r.resume_blob_url} target="_blank" rel="noopener noreferrer" style={{ ...styles.actionBtn }}>Resume</a>
                                {r.admin_status === 'UNDER_REVIEW' && (
                                    <>
                                        <button onClick={() => handleAction(r.candidate_id, "SHORTLISTED")} style={{ ...styles.actionBtn, background: '#6366f1', color: 'white', border: 'none' }}>Shortlist</button>
                                        <button onClick={() => handleAction(r.candidate_id, "REJECTED")} style={{ ...styles.actionBtn, color: '#dc2626' }}>Reject</button>
                                    </>
                                )}
                                {r.admin_status === 'SHORTLISTED' && r.interview_status === 'N/A' && (
                                    <button onClick={() => handleStartInterview(r.candidate_id, r.resume_id)} style={{ ...styles.actionBtn, background: '#7c3aed', color: 'white', border: 'none' }}>🚀 Start Interview</button>
                                )}
                                {['COMPLETED', 'COMPLETED_EARLY'].includes(r.interview_status) && r.admin_status !== 'SELECTED' && r.admin_status !== 'REJECTED' && (
                                    <>
                                        <button onClick={() => handleAction(r.candidate_id, "SELECTED")} style={{ ...styles.actionBtn, background: '#10b981', color: 'white', border: 'none' }}>Hire Candidate</button>
                                        <button onClick={() => handleAction(r.candidate_id, "REJECTED")} style={{ ...styles.actionBtn, background: '#ef4444', color: 'white', border: 'none' }}>Reject</button>
                                    </>
                                )}
                                {['COMPLETED', 'COMPLETED_EARLY'].includes(r.interview_status) && (
                                    <button onClick={() => handleDownloadReport(r.candidate_id)} style={{ ...styles.actionBtn, background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' }}>Download Report</button>
                                )}
                                <button onClick={() => handleDeleteCandidate(r.candidate_id)} style={{ ...styles.actionBtn, color: '#94a3b8', border: 'none', background: 'transparent', fontSize: '11px' }}>Delete Profile</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}

const handleStartInterview = async (candidateId, resumeId) => {
    try {
        await adminAPI.startInterview(candidateId, resumeId);
        alert('Interview Session Initialized!');
        window.location.reload();
    } catch (err) {
        alert('Initialization failed: ' + (err.response?.data?.detail || err.message));
    }
};
