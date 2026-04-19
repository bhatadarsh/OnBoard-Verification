import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI, blobAPI } from '../api/client';

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allJds, setAllJds] = useState([]);
    const [filterJobId, setFilterJobId] = useState("ALL");
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

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
            color: '#e8f0fe',
            backgroundColor: '#020811',
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
            background: 'rgba(2,8,17,0.9)',
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
            padding: '40px 5%',
            flex: 1,
            position: 'relative',
            zIndex: 10,
        },
        header: {
            marginBottom: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
        },
        title: {
            fontSize: '28px',
            fontWeight: '900',
            letterSpacing: '-1px',
            margin: 0,
            color: '#ffffff',
        },
        subtitle: {
            color: '#475569',
            fontSize: '14px',
            marginTop: '6px',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 1fr) 2.5fr',
            gap: '28px',
        },
        card: {
            background: 'rgba(10,22,40,0.85)',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '28px',
            height: 'fit-content',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        },
        refreshBtn: {
            background: 'rgba(0,229,255,0.08)',
            color: '#00e5ff',
            border: '1px solid rgba(0,229,255,0.2)',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.2s',
        }
    };

    if (loading) return (
        <div style={styles.container}>
          <div style={{ ...styles.content, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(0,229,255,0.1)', borderTopColor: '#00e5ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#475569', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Syncing intelligence...</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={styles.container}>
            {/* Ambient BG */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,229,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', top: -200, right: -100, filter: 'blur(80px)' }} />
            </div>
            {/* Inline Toast */}
            {toast && (
                <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? 'rgba(244,63,94,0.95)' : 'rgba(16,185,129,0.95)', color: '#fff', padding: '14px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', fontFamily: "'Outfit', sans-serif", maxWidth: 360 }}>
                    {toast.type === 'error' ? '✕ ' : '✓ '}{toast.msg}
                </div>
            )}
            <nav style={styles.nav}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={styles.logo} onClick={() => navigate('/admin-portal')}>⚡ AI HirePro</div>
                    <button onClick={() => navigate('/admin-portal')} style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>← Mission Control</button>
                </div>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    {user && (
                        <div style={styles.userBadge}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>{user.name?.[0]?.toUpperCase()}</div>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#e8f0fe' }}>{user.name}</span>
                            <span style={{ fontSize: 10, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>ADMIN</span>
                        </div>
                    )}
                    <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
                </div>
            </nav>

            <main style={styles.content}>
                <div style={styles.header}>
                    <div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#6366f1', letterSpacing: '0.2em', marginBottom: 8 }}>// TALENT ACQUISITION MODULE</div>
                        <h1 style={styles.title}>Recruitment Hub</h1>
                        <p style={styles.subtitle}>Manage job briefs and evaluate candidate performance.</p>
                    </div>
                    <button onClick={() => window.location.reload()} style={styles.refreshBtn}>
                        ↻ Refresh Data
                    </button>
                </div>

                <div style={styles.grid}>
                    <div style={styles.card}>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '20px', color: '#818cf8', fontFamily: "'Outfit', sans-serif" }}>Active Job Briefs</h3>
                        <JDManager jds={allJds} onRefresh={fetchJDs} showToast={showToast} />
                    </div>

                    <div>
                        {/* Quick Stats Bar */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                            {[
                                { label: 'Total Candidates', value: data?.total_candidates ?? 0, color: '#00e5ff' },
                                { label: 'Shortlisted', value: data?.shortlisted ?? 0, color: '#818cf8' },
                                { label: 'Interviewed', value: data?.interviewed ?? 0, color: '#f59e0b' },
                                { label: 'Hired', value: data?.hired ?? 0, color: '#10b981' },
                            ].map((stat, i) => (
                                <div key={i} style={{ background: 'rgba(10,22,40,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px', backdropFilter: 'blur(20px)' }}>
                                    <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>{stat.label}</div>
                                    <div style={{ fontSize: 24, fontWeight: 900, color: stat.color, fontFamily: "'JetBrains Mono',monospace" }}>{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        <div style={styles.card}>
                            <ResumeList allJds={allJds} filterJobId={filterJobId} setFilterJobId={setFilterJobId} showToast={showToast} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function JDManager({ jds, onRefresh, showToast }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        try {
            await adminAPI.uploadJD(file);
            showToast('JD uploaded successfully!');
            setFile(null);
            onRefresh();
        } catch (err) {
            showToast('Upload failed: ' + (err.response?.data?.detail || err.message), 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (jobId) => {
        // No window.confirm — direct action with toast feedback
        try {
            await adminAPI.deleteJD(jobId);
            showToast('Job Description removed.');
            onRefresh();
        } catch (err) {
            showToast('Delete failed: ' + (err.response?.data?.detail || err.message), 'error');
        }
    };

    const styles = {
        uploadBox: {
            background: 'rgba(0,229,255,0.03)',
            border: '1px dashed rgba(0,229,255,0.2)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center',
        },
        fileInput: {
            display: 'block',
            width: '100%',
            marginBottom: '14px',
            color: '#475569',
            fontSize: '12px',
        },
        uploadBtn: {
            width: '100%',
            padding: '11px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#ffffff',
            fontWeight: '700',
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
        },
        jdItem: {
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '10px',
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

            <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#818cf8', marginBottom: '14px', fontWeight: '800', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>Deployed Briefs</h4>
            {jds.length === 0 ? <p style={{ color: '#475569', fontSize: '13px' }}>No briefs active.</p> : (
                <div>
                    {jds.map(jd => (
                        <div key={jd.job_id} style={styles.jdItem}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#e8f0fe' }}>{jd.jd_name || jd.job_id}</div>
                                <div style={{ fontSize: '11px', color: '#475569' }}>
                                    {new Date(jd.uploaded_at).toLocaleDateString()}
                                    <span style={{ marginLeft: '8px', color: '#334155' }}>• ID: {jd.job_id}</span>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(jd.job_id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Delete</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ResumePreviewModal({ resume, onClose }) {
    if (!resume) return null;
    const isPdf = resume.url.toLowerCase().includes('.pdf');
    const filename = resume.url.split('/').pop().split('?')[0];

    const overlayStyle = {
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
    };
    const modalStyle = {
        background: '#0a1628',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        width: '100%', maxWidth: '900px',
        height: '90vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
    };
    const headerStyle = {
        padding: '18px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
    };
    const bodyStyle = { flex: 1, overflow: 'hidden', position: 'relative' };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={headerStyle}>
                    <div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#6366f1', letterSpacing: '0.15em', marginBottom: 4 }}>// RESUME PREVIEW</div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#e8f0fe' }}>{resume.candidateName}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{filename}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <a
                            href={resume.url}
                            download={filename}
                            style={{ padding: '8px 18px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', fontWeight: 700, fontSize: 13, textDecoration: 'none', fontFamily: "'Outfit',sans-serif", cursor: 'pointer' }}
                        >
                            ↓ Download
                        </a>
                        <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 10, background: 'rgba(244,63,94,0.08)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                            ✕ Close
                        </button>
                    </div>
                </div>
                <div style={bodyStyle}>
                    {isPdf ? (
                        <iframe
                            src={resume.url}
                            title="Resume Preview"
                            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                        />
                    ) : resume.normalizedText ? (
                        <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#94a3b8', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {resume.normalizedText}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: '#475569' }}>
                            <div style={{ fontSize: 40 }}>📄</div>
                            <div style={{ fontSize: 14, color: '#64748b' }}>DOCX preview not available.</div>
                            <a href={resume.url} download={filename} style={{ padding: '10px 24px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', fontWeight: 700, fontSize: 13, textDecoration: 'none', fontFamily: "'Outfit',sans-serif" }}>
                                ↓ Download to View
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ResumeList({ allJds, filterJobId, setFilterJobId, showToast }) {
    const navigate = useNavigate();
    const [resumes, setResumes] = useState([]);
    const [sortBy, setSortBy] = useState('newest');
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [previewResume, setPreviewResume] = useState(null);

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
            showToast(`Candidate ${decision.toLowerCase().replace('_',' ')} successfully.`);
            fetchResumes();
        } catch (err) {
            showToast('Action failed: ' + (err.response?.data?.detail || err.message), 'error');
        }
    };

    const handleDeleteCandidate = async (candidateId) => {
        // No window.confirm — direct delete with toast
        try {
            await adminAPI.deleteCandidate(candidateId);
            setResumes(prev => prev.filter(r => r.candidate_id !== candidateId));
            showToast('Candidate profile removed.');
        } catch (err) {
            showToast('Delete failed: ' + (err.response?.data?.detail || err.message), 'error');
        }
    };

    const handleDownloadReport = (candidateId) => {
        const token = localStorage.getItem('token');
        window.open(`http://localhost:8000/admin/candidates/${candidateId}/report?token=${token}`, '_blank');
    };

    const handleStartInterview = async (candidateId, resumeId) => {
        try {
            const session = await adminAPI.startInterview(candidateId, resumeId);
            navigate(`/interview/${session.interview_id}`);
        } catch (err) {
            showToast('Initialization failed: ' + (err.response?.data?.detail || err.message), 'error');
        }
    };

    const filteredCandidates = resumes.filter(r => filterJobId === "ALL" || r.jd_id === filterJobId);

    const sortedResumes = [...filteredCandidates].sort((a, b) => {
        if (sortBy === 'score') return (b.total_interview_score || 0) - (a.total_interview_score || 0);
        return 0;
    });

    const styles = {
        candidateCard: {
            padding: '24px',
            background: 'rgba(10,22,40,0.85)',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(20px)',
        },
        badge: {
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '800',
            textTransform: 'uppercase',
        },
        scoreBadge: {
            background: 'rgba(99,102,241,0.12)',
            color: '#818cf8',
            padding: '8px 20px',
            borderRadius: '12px',
            fontWeight: '900',
            fontSize: '15px',
            border: '1px solid rgba(99,102,241,0.25)',
        },
        actionBtn: {
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)',
            color: '#94a3b8',
            fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.2s',
        },
        filterSelect: {
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(10,22,40,0.9)',
            fontSize: '13px',
            fontWeight: '600',
            color: '#818cf8',
            outline: 'none',
        }
    };

    return (
        <div>
            <ResumePreviewModal resume={previewResume} onClose={() => setPreviewResume(null)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#e8f0fe' }}>Talent Pipeline</h3>
                    <select
                        value={filterJobId}
                        onChange={(e) => setFilterJobId(e.target.value)}
                        style={styles.filterSelect}
                    >
                        <option value="ALL">All Applicants</option>
                        {allJds.map(j => (
                            <option key={j.job_id} value={j.job_id}>{j.jd_name || j.job_id}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Synced at {lastRefresh.toLocaleTimeString()}</div>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,22,40,0.9)', color: '#94a3b8', fontSize: '13px', fontWeight: 600, outline: 'none' }}>
                        <option value="newest">Sort: Date</option>
                        <option value="score">Sort: Peak Performance</option>
                    </select>
                </div>
            </div>

            {sortedResumes.length === 0 ? <p style={{ color: '#475569' }}>No candidates found for this selection.</p> : (
                <div>
                    {sortedResumes.map(r => (
                        <div key={r.resume_id} style={{
                            ...styles.candidateCard,
                            borderLeft: `6px solid ${r.admin_status === 'SELECTED' ? '#10b981' : r.admin_status === 'REJECTED' ? '#ef4444' : '#6366f1'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: '800', textTransform: 'uppercase' }}>
                                    Applied for: <span style={{ color: '#6366f1' }}>{r.jd_name || r.jd_id || "Unassigned"}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                <div>
                                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#e8f0fe' }}>
                                        {r.candidate_name}
                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', marginLeft: '8px' }}>
                                            ID: {r.candidate_id}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <span style={{
                                            ...styles.badge,
                                            background: r.admin_status === 'SELECTED' ? 'rgba(16,185,129,0.12)' : r.admin_status === 'REJECTED' ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
                                            color: r.admin_status === 'SELECTED' ? '#10b981' : r.admin_status === 'REJECTED' ? '#f43f5e' : '#818cf8',
                                            border: `1px solid ${r.admin_status === 'SELECTED' ? 'rgba(16,185,129,0.25)' : r.admin_status === 'REJECTED' ? 'rgba(239,68,68,0.25)' : 'rgba(99,102,241,0.25)'}`
                                        }}>{r.admin_status.replace('_', ' ')}</span>
                                    </div>
                                </div>
                                {r.total_interview_score > 0 && (
                                    <div style={styles.scoreBadge}>Peak IQ: {r.total_interview_score.toFixed(1)}</div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', fontWeight: '800' }}>Integrity</div>
                                    <div style={{ fontWeight: 'bold', color: r.cheating_severity === 'LOW' ? '#10b981' : '#f43f5e' }}>{r.cheating_severity}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', fontWeight: '800' }}>Tab Shifts</div>
                                    <div style={{ fontWeight: 'bold', color: r.tab_change_count <= 2 ? '#10b981' : '#f59e0b' }}>{r.tab_change_count}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', fontWeight: '800' }}>Brief Match</div>
                                    <div style={{ fontWeight: 'bold', color: r.system_score >= 7 ? '#10b981' : r.system_score >= 4 ? '#f59e0b' : '#f43f5e' }}>{r.system_score.toFixed(1)}/10</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', fontWeight: '800' }}>Resume Rec</div>
                                    <div style={{ fontWeight: 'bold', color: r.system_shortlisted ? '#10b981' : '#f43f5e' }}>{r.system_shortlisted ? '✅ YES' : '❌ NO'}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', fontWeight: '800' }}>Interview Rec</div>
                                    <div style={{ fontWeight: 'bold', color: (r.interview_recommendation === 'HIRE' || r.interview_recommendation === 'STRONG HIRE') ? '#10b981' : r.interview_recommendation === 'PENDING' ? '#94a3b8' : '#f43f5e' }}>{r.interview_recommendation}</div>
                                </div>
                            </div>

                            <div style={{ padding: '20px', background: 'rgba(99,102,241,0.08)', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '24px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '900', color: '#818cf8', marginBottom: '8px' }}>🤖 AI ASSESSMENT</div>
                                <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>{r.system_reason?.summary || "Analysis pending..."}</p>
                            </div>

                            {r.admin_insights && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                    <div style={{ padding: '20px', background: 'rgba(0,229,255,0.06)', borderRadius: '16px', border: '1px solid rgba(0,229,255,0.15)' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#00e5ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>JD–Resume Alignment</div>
                                        <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>{r.admin_insights.matched_skills_summary}</p>
                                    </div>
                                    <div style={{ padding: '20px', background: 'rgba(16,185,129,0.06)', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.2)' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#10b981', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Strengths</div>
                                        <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>{r.admin_insights.candidate_strengths}</p>
                                    </div>
                                </div>
                            )}

                            {r.misconduct_events && r.misconduct_events.length > 0 && (
                                <details style={{ marginBottom: '16px' }}>
                                    <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: '800', color: '#f43f5e', outline: 'none' }}>🚩 Integrity Flag Details ({r.misconduct_events.length})</summary>
                                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {r.misconduct_events.map((evt, i) => (
                                            <div key={i} style={{ padding: '12px', background: 'rgba(244,63,94,0.08)', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)', fontSize: '13px', color: '#f87171' }}>
                                                <strong>{new Date(evt.timestamp * 1000).toLocaleTimeString()}</strong>: {
                                                    evt.cheating_flags ? evt.cheating_flags.map(f => {
                                                        if (f === 'COMBINED_MISCONDUCT_PEOPLE_AND_MOBILE') return '🚨 CRITICAL: Multiple people detected with mobile usage';
                                                        if (f === 'MULTIPLE_PEOPLE_DETECTED') return '👥 Multiple people in frame';
                                                        if (f === 'MOBILE_DETECTED') return '📱 Mobile phone detected';
                                                        if (f === 'CANDIDATE_OUT_OF_FRAME') return '❌ Candidate not in frame';
                                                        if (f === 'SUSPICIOUS_OBJECT_DETECTED') return '💻 Suspicious electronics detected';
                                                        if (f === 'NOT_IN_FRAME') return '❌ Candidate not in frame';  // Legacy support
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
                                    <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: '800', color: '#818cf8', outline: 'none' }}>Detailed Turn Breakdown</summary>
                                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {r.evaluation_results.per_answer_results?.map((ev, i) => (
                                            <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontWeight: '900', color: '#6366f1', fontSize: '11px', textTransform: 'uppercase' }}>Turn {i + 1}</span>
                                                    <span style={{ color: ev.score >= 7 ? '#10b981' : ev.score >= 4 ? '#f59e0b' : '#f43f5e', fontWeight: '900' }}>{ev.score}/10</span>
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>"{ev.reasoning_notes}"</div>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                                <button
                                    onClick={() => setPreviewResume({ url: r.resume_blob_url, candidateName: r.candidate_name, normalizedText: r.normalized_resume || null })}
                                    style={{ ...styles.actionBtn, background: 'rgba(0,229,255,0.08)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.2)', cursor: 'pointer' }}
                                >
                                    👁 Resume
                                </button>
                                {r.admin_status === 'UNDER_REVIEW' && (
                                    <>
                                        <button onClick={() => handleAction(r.candidate_id, "SHORTLISTED")} style={{ ...styles.actionBtn, background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>Shortlist</button>
                                        <button onClick={() => handleAction(r.candidate_id, "REJECTED")} style={{ ...styles.actionBtn, color: '#f43f5e', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>Reject</button>
                                    </>
                                )}
                                {r.admin_status === 'SHORTLISTED' && r.interview_status === 'N/A' && (
                                    <button onClick={() => handleStartInterview(r.candidate_id, r.resume_id)} style={{ ...styles.actionBtn, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>🚀 Start Interview</button>
                                )}
                                {['COMPLETED', 'COMPLETED_EARLY'].includes(r.interview_status) && r.admin_status !== 'SELECTED' && r.admin_status !== 'REJECTED' && (
                                    <>
                                        <button onClick={() => handleAction(r.candidate_id, "SELECTED")} style={{ ...styles.actionBtn, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>Hire Candidate</button>
                                        <button onClick={() => handleAction(r.candidate_id, "REJECTED")} style={{ ...styles.actionBtn, background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)' }}>Reject</button>
                                    </>
                                )}
                                {['COMPLETED', 'COMPLETED_EARLY'].includes(r.interview_status) && (
                                    <button onClick={() => handleDownloadReport(r.candidate_id)} style={{ ...styles.actionBtn, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>Download Report</button>
                                )}
                                <button onClick={() => handleDeleteCandidate(r.candidate_id)} style={{ ...styles.actionBtn, color: '#475569', border: 'none', background: 'transparent', fontSize: '11px' }}>Delete Profile</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}