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
                <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 20px',
                            background: '#f8f9fa',
                            color: '#4299e1',
                            border: '1px solid #4299e1',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        🔄 Refresh View
                    </button>
                    <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                        Logout
                    </button>
                </div>
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
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'score'
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchResumes = async (showRefreshIndicator = false) => {
        if (showRefreshIndicator) setIsRefreshing(true);
        try {
            const data = await adminAPI.getCandidates();
            setResumes(data);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Error fetching candidates:', err);
        } finally {
            if (showRefreshIndicator) setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchResumes();

        // Auto-refresh every 10 seconds to ensure latest data
        const intervalId = setInterval(() => {
            fetchResumes(false); // Silent refresh
        }, 10000);

        return () => clearInterval(intervalId);
    }, []);

    const handleAction = async (candidateId, decision) => {
        try {
            await adminAPI.shortlistCandidate(candidateId, decision);
            alert(`Candidate ${decision.toLowerCase()} successfully!`);
            fetchResumes(true); // Immediate refresh with indicator
        } catch (err) {
            alert('Action failed: ' + (err.response?.data?.detail || err.message));
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

    const handleDownloadReport = (candidateId) => {
        const token = localStorage.getItem('token');
        window.open(`http://localhost:8000/admin/candidates/${candidateId}/report?token=${token}`, '_blank');
    };

    const sortedResumes = [...resumes].sort((a, b) => {
        if (sortBy === 'score') return b.total_interview_score - a.total_interview_score;
        return 0; // default order from backend
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Candidate Management</h3>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#718096' }}>
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </div>
                    <button
                        onClick={() => fetchResumes(true)}
                        disabled={isRefreshing}
                        style={{
                            padding: '5px 12px',
                            background: isRefreshing ? '#cbd5e0' : '#4299e1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isRefreshing ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
                    </button>
                    <div style={{ fontSize: '12px' }}>
                        Sort by:
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ marginLeft: '5px', padding: '2px' }}>
                            <option value="newest">Newest</option>
                            <option value="score">Total Score</option>
                        </select>
                    </div>
                </div>
            </div>

            {resumes.length === 0 ? <p>No resumes uploaded yet.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {sortedResumes.map(r => (
                        <div key={r.resume_id} style={{
                            padding: '15px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            background: r.admin_status === 'SELECTED' ? '#f0fff4' : r.admin_status === 'REJECTED' ? '#fff5f5' : 'white',
                            position: 'relative'
                        }}>
                            {r.total_interview_score > 0 && (
                                <div style={{
                                    position: 'absolute', top: '-10px', right: '15px',
                                    background: '#4299e1', color: 'white', padding: '4px 12px', borderRadius: '20px',
                                    fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    Score: {r.total_interview_score}/10
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <strong>Candidate #{r.candidate_id}</strong>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                        backgroundColor: r.admin_status === 'SELECTED' ? '#2f855a' : r.admin_status === 'REJECTED' ? '#c53030' : '#ecc94b',
                                        color: 'white'
                                    }}>
                                        {r.admin_status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginBottom: '10px' }}>
                                <div>
                                    <p style={{ margin: '2px 0' }}><strong>Interview Status:</strong> {r.interview_status}</p>
                                    <p style={{ margin: '2px 0' }}><strong>Tab Changes:</strong>
                                        <span style={{
                                            color: r.tab_change_count === 0 ? '#38a169' : r.tab_change_count <= 2 ? '#d69e2e' : '#e53e3e',
                                            marginLeft: '5px',
                                            fontWeight: r.tab_change_count > 2 ? 'bold' : 'normal'
                                        }}>
                                            {r.tab_change_count}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <p style={{ margin: '2px 0' }}><strong>Cheating Severity:</strong>
                                        <span style={{ color: r.cheating_severity === 'LOW' ? '#38a169' : '#e53e3e', marginLeft: '5px' }}>
                                            {r.cheating_severity}
                                        </span>
                                    </p>
                                    <p style={{ margin: '2px 0' }}><strong>System Rec:</strong> {r.system_shortlisted ? 'Yes' : 'No'}</p>
                                </div>
                            </div>

                            {/* JD/RESUME MATCHING SECTION - Always Visible */}
                            <div style={{
                                marginTop: '15px',
                                background: r.system_shortlisted ? '#f0fff4' : '#fff5f5',
                                padding: '12px',
                                borderRadius: '8px',
                                border: `2px solid ${r.system_shortlisted ? '#48bb78' : '#fc8181'}`,
                                fontSize: '13px'
                            }}>
                                <div style={{
                                    fontWeight: 'bold',
                                    color: r.system_shortlisted ? '#2f855a' : '#c53030',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {r.system_shortlisted ? '✅' : '❌'} JD/Resume Matching
                                        <span style={{
                                            fontSize: '11px',
                                            background: r.system_shortlisted ? '#2f855a' : '#c53030',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontWeight: 'bold'
                                        }}>
                                            {r.system_shortlisted ? 'RECOMMENDED' : 'NOT RECOMMENDED'}
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: '18px',
                                        color: r.system_shortlisted ? '#276749' : '#9b2c2c',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}>
                                        <span style={{ fontSize: '14px', fontWeight: 'normal' }}>Match Score:</span>
                                        <strong>{r.system_score.toFixed(1)}/10</strong>
                                    </div>
                                </div>

                                {r.system_reason?.summary && (
                                    <div style={{
                                        padding: '10px',
                                        background: 'rgba(255,255,255,0.7)',
                                        borderRadius: '6px',
                                        marginTop: '8px',
                                        fontSize: '12px',
                                        color: '#2d3748',
                                        borderLeft: `3px solid ${r.system_shortlisted ? '#48bb78' : '#fc8181'}`
                                    }}>
                                        <strong>AI Assessment:</strong>
                                        <div style={{
                                            marginTop: '5px',
                                            display: '-webkit-box',
                                            WebkitLineClamp: '2',
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            lineHeight: '1.4'
                                        }}>
                                            {r.system_reason.summary}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* INTERVIEW RESULT SECTION - Always Visible */}
                            {(() => {
                                const hasEvaluation = !!r.evaluation_results;
                                const isCompleted = r.interview_status === 'COMPLETED';
                                const isInProgress = r.interview_status === 'IN_PROGRESS';
                                const notStarted = r.interview_status === 'NOT_STARTED' || r.interview_status === 'N/A';

                                // Logic for Recommendation (only if evaluation exists)
                                const interviewScore = r.total_interview_score || 0;
                                const scoreGood = interviewScore >= 6;
                                const cheatingLow = r.cheating_severity === 'LOW';
                                const tabChangesOk = r.tab_change_count <= 3;
                                const interviewRecommended = hasEvaluation && scoreGood;

                                // Styling based on status
                                const bg = !hasEvaluation ? '#f7fafc' : (interviewRecommended ? '#f0fff4' : '#fff5f5');
                                const borderCol = !hasEvaluation ? '#e2e8f0' : (interviewRecommended ? '#48bb78' : '#fc8181');
                                const textCol = !hasEvaluation ? '#718096' : (interviewRecommended ? '#2f855a' : '#c53030');
                                const scoreCol = !hasEvaluation ? '#a0aec0' : (interviewRecommended ? '#276749' : '#9b2c2c');

                                return (
                                    <div style={{
                                        marginTop: '15px',
                                        background: bg,
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: `2px solid ${borderCol}`,
                                        fontSize: '13px'
                                    }}>
                                        <div style={{
                                            fontWeight: 'bold',
                                            color: textCol,
                                            marginBottom: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {hasEvaluation ? (interviewRecommended ? '✅' : '❌') : '⏳'} Interview Result
                                                {hasEvaluation && (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        background: interviewRecommended ? '#2f855a' : '#c53030',
                                                        color: 'white',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {interviewRecommended ? 'RECOMMENDED' : 'NOT RECOMMENDED'}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{
                                                fontSize: '18px',
                                                color: scoreCol,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}>
                                                <span style={{ fontSize: '14px', fontWeight: 'normal' }}>Interview Score:</span>
                                                <strong>{hasEvaluation ? `${interviewScore.toFixed(1)}/10` : 'PND'}</strong>
                                            </div>
                                        </div>

                                        <div style={{
                                            padding: '10px',
                                            background: 'rgba(255,255,255,0.7)',
                                            borderRadius: '6px',
                                            marginTop: '8px',
                                            fontSize: '12px',
                                            color: '#2d3748',
                                            borderLeft: `3px solid ${borderCol}`
                                        }}>
                                            <strong>Performance Assessment:</strong>
                                            <div style={{
                                                marginTop: '5px',
                                                display: '-webkit-box',
                                                WebkitLineClamp: '2',
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                lineHeight: '1.4'
                                            }}>
                                                {
                                                    hasEvaluation ? (
                                                        interviewRecommended ?
                                                            `Strong interview performance (${interviewScore.toFixed(1)}/10). No significant integrity concerns.` :
                                                            `Interview score: ${interviewScore.toFixed(1)}/10. Concerns identified in performance or behavior.`
                                                    ) : (
                                                        notStarted ? "Interview not yet started." :
                                                            isInProgress ? "Interview in progress... Evaluation will appear after completion." :
                                                                "Evaluation in progress... Please refresh in a moment."
                                                    )
                                                }
                                            </div>
                                        </div>

                                        {hasEvaluation && (
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr 1fr',
                                                gap: '8px',
                                                marginTop: '10px',
                                                fontSize: '11px'
                                            }}>
                                                <div style={{ padding: '6px', background: 'rgba(255,255,255,0.5)', borderRadius: '4px', textAlign: 'center' }}>
                                                    <div style={{ color: '#718096', marginBottom: '2px' }}>Score</div>
                                                    <div style={{ fontWeight: 'bold', color: scoreGood ? '#2f855a' : '#c53030' }}>{interviewScore.toFixed(1)}/10</div>
                                                </div>
                                                <div style={{ padding: '6px', background: 'rgba(255,255,255,0.5)', borderRadius: '4px', textAlign: 'center' }}>
                                                    <div style={{ color: '#718096', marginBottom: '2px' }}>Cheating</div>
                                                    <div style={{ fontWeight: 'bold', color: cheatingLow ? '#2f855a' : '#c53030' }}>{r.cheating_severity}</div>
                                                </div>
                                                <div style={{ padding: '6px', background: 'rgba(255,255,255,0.5)', borderRadius: '4px', textAlign: 'center' }}>
                                                    <div style={{ color: '#718096', marginBottom: '2px' }}>Tab Changes</div>
                                                    <div style={{ fontWeight: 'bold', color: tabChangesOk ? '#2f855a' : '#c53030' }}>{r.tab_change_count}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

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
                                                    <div style={{
                                                        color: '#2d3748',
                                                        marginTop: '4px',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: '2',
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}>A: {t.answer_text}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </div>
                            )}


                            {/* EVALUATION RESULTS - Always Visible */}
                            <div style={{ marginTop: '15px', background: r.evaluation_results ? '#e6fffa' : '#f7fafc', padding: '12px', borderRadius: '8px', border: `1px solid ${r.evaluation_results ? '#81e6d9' : '#e2e8f0'}` }}>
                                <div style={{ fontWeight: 'bold', color: r.evaluation_results ? '#2c7a7b' : '#718096', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        🎓 Intelligence Evaluation
                                        {r.evaluation_results && (
                                            <span style={{ fontSize: '10px', background: '#2c7a7b', color: 'white', padding: '1px 5px', borderRadius: '4px' }}>
                                                {r.evaluation_results.evaluator_ver}
                                            </span>
                                        )}
                                    </div>
                                    {r.evaluation_results ? (
                                        <div style={{ fontSize: '16px', color: '#234e52' }}>
                                            Overall Score: <strong>{r.evaluation_results.overall_score}/10</strong>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '13px', color: '#a0aec0', fontStyle: 'italic' }}>
                                            {r.interview_status === 'COMPLETED' ? 'Processing...' : 'Not yet evaluated'}
                                        </div>
                                    )}
                                </div>

                                {r.evaluation_results ? (
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

                                                <div style={{
                                                    fontSize: '12px',
                                                    marginBottom: '8px',
                                                    lineHeight: '1.4',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: '2',
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}>
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
                                ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#a0aec0', fontSize: '13px' }}>
                                        {r.interview_status === 'COMPLETED'
                                            ? '⏳ Evaluation in progress... Please refresh in a moment.'
                                            : r.interview_status === 'IN_PROGRESS'
                                                ? '⏳ Interview in progress... Evaluation will appear after completion.'
                                                : '📋 Interview not yet started.'}
                                    </div>
                                )}
                            </div>

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

                                {r.interview_status === 'COMPLETED' && r.admin_status !== 'SELECTED' && r.admin_status !== 'REJECTED' && (
                                    <>
                                        <button onClick={() => handleAction(r.candidate_id, "SELECTED")}
                                            style={{ padding: '5px 10px', background: '#38a169', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                            Select Candidate
                                        </button>
                                        <button onClick={() => handleAction(r.candidate_id, "REJECTED")}
                                            style={{ padding: '5px 10px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                            Reject Candidate
                                        </button>
                                    </>
                                )}

                                {r.interview_status === 'COMPLETED' && (
                                    <button onClick={() => handleDownloadReport(r.candidate_id)}
                                        style={{ padding: '5px 10px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                        Download Report
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
