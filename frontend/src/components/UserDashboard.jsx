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

    if (loading) return <div style={{ padding: '50px' }}>Loading...</div>;

    return (
        <div style={{ padding: '50px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>User Dashboard</h1>
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
                    <h3>Job Description</h3>
                    <JDPreview />
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                    <h3>Resume Upload</h3>
                    <ResumeUploader />
                </div>
            </div>
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
            const msg = err.response
                ? `Status: ${err.response.status}, Detail: ${err.response.data?.detail}`
                : err.message;
            alert('Failed to get download URL: ' + msg);
        }
    };

    if (loading) return <p>Loading JD...</p>;
    if (!jd) return <p style={{ color: '#dc3545' }}>Job description not uploaded yet.</p>;

    return (
        <div>
            <p><strong>Job ID:</strong> {jd.job_id}</p>
            <p><strong>Status:</strong> {jd.status}</p>
            <button onClick={handleDownload} style={{ padding: '5px 15px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
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
            <div style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px' }}>
                <p style={{ margin: 0, color: '#856404' }}>
                    Resume upload disabled – Job description not uploaded yet
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
            <div style={{
                padding: '20px',
                background: isSelected ? '#f0fff4' : isShortlisted ? '#f0fff4' : isRejected ? '#fff5f5' : '#f8f9fa',
                border: `1px solid ${isSelected ? '#38a169' : isShortlisted ? '#c6f6d5' : isRejected ? '#fed7d7' : '#e2e8f0'}`,
                borderRadius: '8px'
            }}>
                <h4 style={{ margin: '0 0 10px 0', color: isSelected ? '#2f855a' : isShortlisted ? '#2f855a' : isRejected ? '#c53030' : '#4a5568' }}>
                    Status: {status.status.replace('_', ' ')}
                </h4>

                {/* SELECTED STATUS - Congratulations Message */}
                {isSelected && (
                    <div style={{
                        padding: '20px',
                        background: 'linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)',
                        border: '2px solid #38a169',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
                        <h2 style={{ color: '#2f855a', margin: '0 0 10px 0' }}>Congratulations!</h2>
                        <p style={{ fontSize: '16px', color: '#276749', margin: 0 }}>
                            You have been selected for the position!
                        </p>
                    </div>
                )}

                {/* REJECTED STATUS - Rejection Message */}
                {isRejected && (
                    <div style={{
                        padding: '15px',
                        background: '#fff5f5',
                        border: '1px solid #fc8181',
                        borderRadius: '6px'
                    }}>
                        <p style={{ color: '#c53030', margin: 0 }}>
                            Thank you for your interest. Unfortunately, we have decided to move forward with other candidates at this time.
                        </p>
                    </div>
                )}

                {isShortlisted && isUnlocked ? (
                    <div>
                        <p style={{ marginBottom: '15px' }}>Congratulations! You have been shortlisted for the interview.</p>

                        {interviewSession ? (
                            <div style={{ padding: '15px', background: 'white', border: '1px solid #c6f6d5', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#2f855a' }}>Interview scheduled!</span>
                                    <span style={{ fontSize: '11px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>ID: {interviewSession.interview_id.split('-')[0]}</span>
                                </div>

                                <p style={{ fontSize: '13px', margin: '5px 0' }}><strong>Status:</strong> {interviewSession.status}</p>

                                <button
                                    onClick={() => navigate(`/user/interview/${interviewSession.interview_id}`)}
                                    style={{
                                        marginTop: '10px',
                                        padding: '10px 20px',
                                        background: '#38a169',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}>
                                    Start Interview 🚀
                                </button>
                                {interviewSession.current_question && (
                                    <p style={{ fontSize: '12px', color: '#4a5568', marginTop: '10px', padding: '10px', background: '#f7fafc', borderLeft: '3px solid #38a169' }}>
                                        <strong>Ready when you are!</strong> Your first question is prepared.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div style={{ padding: '10px', background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '4px' }}>
                                <p style={{ margin: 0, fontSize: '14px', color: '#2b6cb0' }}>
                                    Waiting for admin to initialize your interview session...
                                </p>
                            </div>
                        )}
                    </div>
                ) : isRejected ? (
                    <p style={{ color: '#c53030' }}>We regret to inform you that we are not moving forward with your application at this time.</p>
                ) : !isSelected ? (
                    <p>Your application is currently under review. Please check back later.</p>
                ) : null}

                <p style={{ marginTop: '15px', fontSize: '12px', color: '#718096' }}>
                    Last update: {new Date(status.uploaded_at).toLocaleString()}
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleUpload}>
            <p style={{ fontSize: '14px', color: '#666' }}>Upload your resume (PDF/DOCX) to apply.</p>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.docx" />
            <div style={{ marginTop: '15px' }}>
                <button type="submit" disabled={uploading || !file} style={{ padding: '8px 20px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                    {uploading ? 'Uploading...' : 'Upload Resume'}
                </button>
            </div>
        </form>
    );
}
