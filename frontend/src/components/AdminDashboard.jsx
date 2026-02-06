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
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {r.interview_status !== 'N/A' && (
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                                            backgroundColor: r.interview_status === 'COMPLETED' ? '#2c7a7b' : '#3182ce',
                                            color: 'white'
                                        }}>
                                            Interview: {r.interview_status.replace('_', ' ')}
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

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
