import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI } from '../api/client';

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

    return (
        <div>
            <form onSubmit={handleUpload} style={{ marginBottom: '20px' }}>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.docx" />
                <button type="submit" disabled={uploading || !file} style={{ marginLeft: '10px', padding: '5px 15px' }}>
                    {uploading ? 'Uploading...' : 'Upload JD'}
                </button>
            </form>

            <h4>Active JDs</h4>
            {jds.length === 0 ? <p>No JDs uploaded yet.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {jds.map(jd => (
                        <li key={jd.job_id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                            {jd.job_id} - {jd.status} ({new Date(jd.uploaded_at).toLocaleDateString()})
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ResumeList() {
    const [resumes, setResumes] = useState([]);

    useEffect(() => {
        const fetchResumes = async () => {
            try {
                const data = await adminAPI.getResumes();
                setResumes(data);
            } catch (err) {
                console.error('Error fetching resumes:', err);
            }
        };
        fetchResumes();
    }, []);

    const handleDownload = async (resume) => {
        try {
            const { url } = await blobAPI.getUrl('resumes', resume.resume_blob_path);
            window.open(url, '_blank');
        } catch (err) {
            alert('Failed to get download URL');
        }
    };

    return (
        <div>
            {resumes.length === 0 ? <p>No resumes uploaded yet.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {resumes.map(r => (
                        <li key={r.resume_id} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Candidate #{r.candidate_id} - {r.status}</span>
                            <button onClick={() => handleDownload(r)} style={{ padding: '2px 10px', fontSize: '12px' }}>
                                Download
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
