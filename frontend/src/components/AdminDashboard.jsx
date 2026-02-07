import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI, blobAPI } from '../api/client';

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardData, userData] = await Promise.all([
                    adminAPI.getDashboard(),
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

    if (loading) return <div style={{ padding: '50px' }}>Loading...</div>;

    return (
        <div style={{ padding: '50px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Admin Dashboard</h1>
                <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Logout
                </button>
            </div>

            {user && (
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                    <h3>User Info</h3>
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Role:</strong> {user.role}</p>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                    <h3>Job Description Management</h3>
                    <JDManager />
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                    <h3>Candidate Resumes</h3>
                    <ResumeList />
                </div>
            </div>
        </div>
    );
}

function JDManager() {
    const [jds, setJds] = useState([]);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const fetchJDs = async () => {
        try {
            const data = await adminAPI.getJD();
            setJds(data);
        } catch (err) {
            console.error('Error fetching JDs:', err);
        }
    };

    useEffect(() => {
        fetchJDs();
    }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        try {
            await adminAPI.uploadJD(file);
            alert('JD uploaded successfully!');
            setFile(null);
            fetchJDs();
        } catch (err) {
            alert('Upload failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this Job Description? This action cannot be undone and it will be hidden from all users.')) {
            return;
        }

        try {
            await adminAPI.deleteJD(jobId);
            setJds(prev => prev.filter(jd => jd.job_id !== jobId));
        } catch (err) {
            alert('Delete failed: ' + (err.response?.data?.detail || err.message));
        }
    };

    return (
        <div>
            <form onSubmit={handleUpload} style={{ marginBottom: '20px' }}>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.docx" />
                <button type="submit" disabled={uploading || !file} style={{ marginLeft: '10px', padding: '5px 15px', cursor: 'pointer' }}>
                    {uploading ? 'Uploading...' : 'Upload JD'}
                </button>
            </form>

            <h4>Active JDs</h4>
            {jds.length === 0 ? <p>No JDs uploaded yet.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {jds.map(jd => (
                        <li key={jd.job_id} style={{
                            padding: '12px',
                            borderBottom: '1px solid #eee',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>{jd.job_id}</span> - {jd.status}
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    Uploaded: {new Date(jd.uploaded_at).toLocaleDateString()}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(jd.job_id)}
                                style={{
                                    padding: '4px 8px',
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fecaca',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ResumeList() {
    const [resumes, setResumes] = useState([]);

    const fetchResumes = async () => {
        try {
            const data = await adminAPI.getCandidates();
            setResumes(data);
        } catch (err) {
            console.error('Error fetching candidates:', err);
        }
    };

    useEffect(() => {
        fetchResumes();
    }, []);

    const handleAction = async (candidateId, decision) => {
        try {
            await adminAPI.shortlistCandidate(candidateId, decision);
            alert(`Candidate ${decision.toLowerCase()} successfully!`);
            fetchResumes();
        } catch (err) {
            alert('Action failed: ' + err.message);
        }
    };

    const handleDeleteCandidate = async (candidateId) => {
        if (!window.confirm('This action permanently removes the candidate and their account. Are you sure?')) {
            return;
        }
        try {
            await adminAPI.deleteCandidate(candidateId);
            setResumes(prev => prev.filter(r => r.candidate_id !== candidateId));
        } catch (err) {
            alert('Delete failed: ' + (err.response?.data?.detail || err.message));
        }
    };

    return (
        <div>
            {resumes.length === 0 ? <p>No resumes uploaded yet.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {resumes.map(r => (
                        <div key={r.resume_id} style={{
                            padding: '15px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            background: r.admin_status === 'SHORTLISTED' ? '#f0fff4' : r.admin_status === 'REJECTED' ? '#fff5f5' : 'white'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <strong>Candidate #{r.candidate_id}</strong>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {r.tab_change_count > 0 && (
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                            backgroundColor: '#ed64a6',
                                            color: 'white'
                                        }}>
                                            🔄 Tab Changes: {r.tab_change_count}
                                        </span>
                                    )}
                                    {r.cheating_score > 0 && (
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                            backgroundColor: r.cheating_score > 1.0 ? '#c53030' : '#ecc94b',
                                            color: 'white'
                                        }}>
                                            ⚠️ Misconduct: {r.cheating_score.toFixed(1)}
                                        </span>
                                    )}
                                    {r.interview_status !== 'N/A' && (
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                                            backgroundColor: r.interview_status === 'COMPLETED' ? '#2c7a7b' : '#3182ce',
                                            color: 'white'
                                        }}>
                                            Interview: {r.interview_status.replace('_', ' ')}
                                        </span>
                                    )}
                                    {r.misconduct_events?.some(ev => ev.cheating_flags.some(f => f.includes('HUMAN') || f.includes('MOBILE') || f.includes('OBJECT'))) && (
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                            backgroundColor: '#e53e3e',
                                            color: 'white',
                                            animation: 'pulse 2s infinite'
                                        }}>
                                            📸 Visual Alert
                                        </span>
                                    )}
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                        backgroundColor: r.admin_status === 'SHORTLISTED' ? '#48bb78' : r.admin_status === 'REJECTED' ? '#f56565' : '#ecc94b',
                                        color: 'white'
                                    }}>
                                        {r.admin_status}
                                    </span>
                                </div>
                            </div>

                            <div style={{ fontSize: '14px', marginBottom: '10px', color: '#555' }}>
                                <p style={{ margin: '5px 0' }}><strong>System Score:</strong> {(r.system_score * 100).toFixed(1)}%</p>
                                <p style={{ margin: '5px 0' }}><strong>System Decision:</strong> {r.system_shortlisted ? 'Recommended ✅' : 'Not Recommended ❌'}</p>
                                <p style={{ margin: '5px 0', fontStyle: 'italic' }}>"{r.system_reason?.summary}"</p>
                            </div>

                            {r.misconduct_events && r.misconduct_events.length > 0 && (
                                <div style={{ marginTop: '15px', background: '#fff5f5', padding: '12px', borderRadius: '8px', fontSize: '13px', border: '1px solid #feb2b2' }}>
                                    <div style={{ fontWeight: 'bold', color: '#c53030', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        🚨 Intelligence Alerts ({r.misconduct_events.length})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {r.misconduct_events.map((ev, i) => (
                                            <div key={i} style={{ padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '6px', borderLeft: '4px solid #f56565' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#718096', marginBottom: '4px' }}>
                                                    <strong>{ev.answer_id.toUpperCase().replace('_', ' ')}</strong>
                                                    <span>{new Date(ev.timestamp * 1000).toLocaleTimeString()}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                    {ev.cheating_flags.map((flag, fi) => (
                                                        <span key={fi} style={{
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            fontWeight: 'bold',
                                                            background: flag.includes('HUMAN') || flag.includes('MOBILE') || flag.includes('OBJECT') ? '#7b341e' : '#e53e3e',
                                                            color: 'white'
                                                        }}>
                                                            {flag.replace(/_/g, ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div style={{ marginTop: '5px', fontSize: '12px', color: '#2d3748' }}>
                                                    Severity Impact: <strong>+{ev.cheating_score.toFixed(2)}</strong>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {r.interview_trace && r.interview_trace.length > 0 && (
                                <div style={{ marginTop: '15px', background: '#f0f4f8', padding: '10px', borderRadius: '6px', fontSize: '13px', border: '1px solid #d1d5db' }}>
                                    <details>
                                        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>View Interview Log ({r.interview_trace.length} turns)</summary>
                                        <div style={{ marginTop: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                                            {r.interview_trace.map((t, i) => (
                                                <div key={i} style={{ marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#4a5568', fontSize: '11px' }}>Q: {t.question}</div>
                                                    <div style={{ color: '#2d3748', marginTop: '4px' }}>A: {t.answer_text}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </div>
                            )}

                            {r.evaluation_results && (
                                <div style={{ marginTop: '15px', background: '#e6fffa', padding: '12px', borderRadius: '8px', border: '1px solid #81e6d9' }}>
                                    <div style={{ fontWeight: 'bold', color: '#2c7a7b', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            🎓 Intelligence Evaluation
                                            <span style={{ fontSize: '10px', background: '#2c7a7b', color: 'white', padding: '1px 5px', borderRadius: '4px' }}>
                                                {r.evaluation_results.evaluator_ver}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '16px', color: '#234e52' }}>
                                            Overall Score: <strong>{r.evaluation_results.overall_score}/10</strong>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {r.evaluation_results.per_answer_results?.map((evData, i) => (
                                            <div key={i} style={{ padding: '10px', background: 'white', borderRadius: '6px', border: '1px solid #b2f5ea' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '11px', color: '#4a5568' }}>{evData.answer_id.toUpperCase().replace('_', ' ')}</span>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold',
                                                        backgroundColor: evData.score >= 7 ? '#48bb78' : evData.score >= 4 ? '#ecc94b' : '#f56565',
                                                        color: 'white'
                                                    }}>Score: {evData.score}/10</span>
                                                </div>

                                                <div style={{ fontSize: '12px', marginBottom: '8px', lineHeight: '1.4' }}>
                                                    <strong>Reasoning:</strong> {evData.reasoning_notes}
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '11px', marginBottom: '10px' }}>
                                                    <div>
                                                        <div style={{ color: '#2f855a', fontWeight: 'bold', marginBottom: '4px' }}>Strengths:</div>
                                                        <ul style={{ paddingLeft: '18px', margin: '0' }}>
                                                            {evData.strengths?.map((s, si) => <li key={si} style={{ marginBottom: '2px' }}>{s}</li>)}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: '#c53030', fontWeight: 'bold', marginBottom: '4px' }}>Weaknesses:</div>
                                                        <ul style={{ paddingLeft: '18px', margin: '0' }}>
                                                            {evData.weaknesses?.map((w, wi) => <li key={wi} style={{ marginBottom: '2px' }}>{w}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>

                                                {evData.expected_vs_actual && (
                                                    <div style={{ marginTop: '8px', fontSize: '11px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                                                        <div style={{ fontWeight: 'bold', color: '#2b6cb0', marginBottom: '6px' }}>Expected vs Actual:</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                            {evData.expected_vs_actual.covered?.map((c, ci) => (
                                                                <span key={ci} style={{ background: '#f0fff4', color: '#276749', padding: '2px 8px', borderRadius: '12px', border: '1px solid #c6f6d5', fontSize: '9px' }}>✓ {c}</span>
                                                            ))}
                                                            {evData.expected_vs_actual.missed?.map((m, mi) => (
                                                                <span key={mi} style={{ background: '#fff5f5', color: '#9b2c2c', padding: '2px 8px', borderRadius: '12px', border: '1px solid #fed7d7', fontSize: '9px' }}>✗ {m}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
                                <a href={r.resume_blob_url} target="_blank" rel="noopener noreferrer"
                                    style={{ padding: '5px 10px', background: '#4a5568', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '13px' }}>
                                    View Resume
                                </a>

                                {r.admin_status === 'UNDER_REVIEW' && (
                                    <>
                                        <button onClick={() => handleAction(r.candidate_id, "SHORTLISTED")}
                                            style={{ padding: '5px 10px', background: '#38a169', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                            Shortlist
                                        </button>
                                        <button onClick={() => handleAction(r.candidate_id, "REJECTED")}
                                            style={{ padding: '5px 10px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                            Reject
                                        </button>
                                    </>
                                )}

                                {r.admin_status === 'SHORTLISTED' && r.interview_status === 'N/A' && (
                                    <button onClick={() => handleStartInterview(r.candidate_id)}
                                        style={{ padding: '5px 10px', background: '#805ad5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                        Schedule Interview
                                    </button>
                                )}

                                {r.admin_status === 'REJECTED' && (
                                    <button onClick={() => handleDeleteCandidate(r.candidate_id)}
                                        style={{ padding: '5px 10px', background: '#fed7d7', color: '#c53030', border: '1px solid #feb2b2', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                        Delete Candidate
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const handleStartInterview = async (candidateId) => {
    try {
        await adminAPI.startInterview(candidateId);
        alert('Interview Session Initialized! Focus areas selected and first question generated.');
        window.location.reload();
    } catch (err) {
        alert('Initialization failed: ' + (err.response?.data?.detail || err.message));
    }
};
