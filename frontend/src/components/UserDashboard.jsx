import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, authAPI } from '../api/client';

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
            alert('Failed to get download URL');
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
    const [status, setStatus] = useState(null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [hasJD, setHasJD] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const [jdData, resumeData] = await Promise.all([
                    userAPI.getActiveJD(),
                    userAPI.getResumeStatus()
                ]);
                setHasJD(!!jdData);
                setStatus(resumeData);
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
        return (
            <div style={{ padding: '10px', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#155724' }}>Resume under review</h4>
                <p style={{ margin: 0, fontSize: '14px' }}>
                    Uploaded on: {new Date(status.uploaded_at).toLocaleString()}
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
