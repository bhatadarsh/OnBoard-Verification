import React, { useState } from 'react';

const API_BASE = 'http://localhost:8000/api/v1';

const Dashboard = () => {
    const [candidateId, setCandidateId] = useState('candidate_1');
    const [includeErrors, setIncludeErrors] = useState(true);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [groundTruth, setGroundTruth] = useState(null);
    const [activeTab, setActiveTab] = useState('demo');

    // File upload states
    const [files, setFiles] = useState({
        resume: null,
        hr_call: null,
        aadhar: null,
        marksheet_10th: null,
        marksheet_12th: null
    });
    const [uploadStatus, setUploadStatus] = useState(null);

    const handleValidate = async () => {
        setLoading(true);
        setResult(null);
        try {
            const response = await fetch(`${API_BASE}/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidate_id: candidateId,
                    use_sample_data: true,
                    include_errors: includeErrors
                })
            });
            const data = await response.json();
            setResult(data);
            setGroundTruth(data.ground_truth_summary);
        } catch (error) {
            console.error('Validation failed:', error);
            alert('Validation failed. Is the backend running?');
        }
        setLoading(false);
    };

    const handleFileChange = (field, file) => {
        setFiles(prev => ({ ...prev, [field]: file }));
    };

    const handleUpload = async () => {
        const formData = new FormData();
        formData.append('candidate_name', 'New Candidate');

        Object.entries(files).forEach(([key, file]) => {
            if (file) formData.append(key, file);
        });

        try {
            const response = await fetch(`${API_BASE}/upload/documents`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            setUploadStatus(data);
        } catch (error) {
            console.error('Upload failed:', error);
        }
    };

    const getIssueStyles = (type) => {
        switch (type) {
            case 'correct': return { bg: '#10b981', border: '#059669', text: '#ffffff' };
            case 'ambiguous': return { bg: '#f59e0b', border: '#d97706', text: '#ffffff' };
            case 'incorrect': return { bg: '#ef4444', border: '#dc2626', text: '#ffffff' };
            default: return { bg: '#6b7280', border: '#4b5563', text: '#ffffff' };
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'correct': return '✅';
            case 'ambiguous': return '⚠️';
            case 'incorrect': return '❌';
            default: return '❓';
        }
    };

    const styles = {
        container: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#fff'
        },
        header: {
            marginBottom: '2rem'
        },
        title: {
            fontSize: '2.5rem',
            fontWeight: '800',
            background: 'linear-gradient(90deg, #06b6d4, #8b5cf6, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
        },
        subtitle: {
            color: '#94a3b8',
            fontSize: '1.1rem'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2rem'
        },
        card: {
            background: 'rgba(30, 27, 75, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: '1rem',
            padding: '1.5rem',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        },
        cardTitle: {
            fontSize: '1.25rem',
            fontWeight: '700',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        dot: {
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#06b6d4',
            animation: 'pulse 2s infinite'
        },
        select: {
            width: '100%',
            padding: '0.75rem',
            background: '#374151',
            border: '1px solid #4b5563',
            borderRadius: '0.5rem',
            color: '#fff',
            fontSize: '1rem',
            marginBottom: '1rem'
        },
        checkbox: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            color: '#d1d5db'
        },
        button: {
            width: '100%',
            padding: '1rem',
            background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
            border: 'none',
            borderRadius: '0.75rem',
            color: '#fff',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
        },
        buttonDisabled: {
            background: '#4b5563',
            cursor: 'not-allowed'
        },
        tabs: {
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem'
        },
        tab: {
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s'
        },
        tabActive: {
            background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
            color: '#fff'
        },
        tabInactive: {
            background: 'rgba(55, 65, 81, 0.5)',
            color: '#9ca3af'
        },
        gtSection: {
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(139, 92, 246, 0.3)'
        },
        gtItem: {
            background: 'rgba(55, 65, 81, 0.5)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            marginBottom: '0.75rem'
        },
        gtLabel: {
            fontWeight: '600',
            marginBottom: '0.25rem'
        },
        gtValue: {
            fontSize: '0.875rem',
            color: '#d1d5db'
        },
        metrics: {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: '1.5rem'
        },
        metricCard: {
            padding: '1rem',
            borderRadius: '0.75rem',
            textAlign: 'center'
        },
        metricValue: {
            fontSize: '2rem',
            fontWeight: '800'
        },
        metricLabel: {
            fontSize: '0.75rem',
            opacity: '0.7',
            marginTop: '0.25rem'
        },
        issueCard: {
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '0.75rem',
            transition: 'transform 0.2s'
        },
        issueHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.5rem'
        },
        issueBadge: {
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            textTransform: 'uppercase'
        },
        issueDesc: {
            fontSize: '0.875rem',
            opacity: '0.9',
            marginBottom: '0.5rem'
        },
        issueMeta: {
            fontSize: '0.75rem',
            opacity: '0.7'
        },
        fileInput: {
            width: '100%',
            padding: '0.75rem',
            background: '#374151',
            border: '1px solid #4b5563',
            borderRadius: '0.5rem',
            color: '#fff',
            marginBottom: '0.75rem'
        },
        fileLabel: {
            display: 'block',
            marginBottom: '0.5rem',
            color: '#d1d5db',
            fontSize: '0.875rem'
        },
        score: {
            padding: '0.5rem 1.5rem',
            borderRadius: '9999px',
            fontWeight: '700',
            fontSize: '1.1rem'
        },
        noResult: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '300px',
            color: '#6b7280'
        },
        issuesList: {
            maxHeight: '400px',
            overflowY: 'auto'
        }
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>🚀 Onboarding Validator</h1>
                <p style={styles.subtitle}>Multi-Modal AI-Powered Verification System</p>
            </header>

            <div style={styles.grid}>
                {/* Control Panel */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>
                        <span style={styles.dot}></span>
                        Control Panel
                    </h3>

                    {/* Tabs */}
                    <div style={styles.tabs}>
                        <button
                            style={{ ...styles.tab, ...(activeTab === 'demo' ? styles.tabActive : styles.tabInactive) }}
                            onClick={() => setActiveTab('demo')}
                        >
                            🎮 Demo Data
                        </button>
                        <button
                            style={{ ...styles.tab, ...(activeTab === 'upload' ? styles.tabActive : styles.tabInactive) }}
                            onClick={() => setActiveTab('upload')}
                        >
                            📤 Upload Files
                        </button>
                    </div>

                    {activeTab === 'demo' ? (
                        <>
                            <label style={styles.fileLabel}>Select Candidate</label>
                            <select
                                style={styles.select}
                                value={candidateId}
                                onChange={(e) => setCandidateId(e.target.value)}
                            >
                                <option value="candidate_1">👨‍💻 Rahul Sharma - Software Engineer</option>
                                <option value="candidate_2">👩‍💼 Priya Patel - Finance Manager</option>
                            </select>

                            <div style={styles.checkbox}>
                                <input
                                    type="checkbox"
                                    id="errors"
                                    checked={includeErrors}
                                    onChange={(e) => setIncludeErrors(e.target.checked)}
                                    style={{ width: '20px', height: '20px' }}
                                />
                                <label htmlFor="errors">Include deliberate errors (for testing)</label>
                            </div>

                            <button
                                style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
                                onClick={handleValidate}
                                disabled={loading}
                            >
                                {loading ? '⏳ Validating...' : '🚀 Run Validation'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div>
                                <label style={styles.fileLabel}>📄 Resume (PDF/DOCX)</label>
                                <input
                                    type="file"
                                    accept=".pdf,.docx"
                                    style={styles.fileInput}
                                    onChange={(e) => handleFileChange('resume', e.target.files[0])}
                                />
                            </div>
                            <div>
                                <label style={styles.fileLabel}>🎙️ HR Call Recording (MP3/WAV)</label>
                                <input
                                    type="file"
                                    accept=".mp3,.wav,.m4a"
                                    style={styles.fileInput}
                                    onChange={(e) => handleFileChange('hr_call', e.target.files[0])}
                                />
                            </div>
                            <div>
                                <label style={styles.fileLabel}>🪪 Aadhar Card (PDF/Image)</label>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    style={styles.fileInput}
                                    onChange={(e) => handleFileChange('aadhar', e.target.files[0])}
                                />
                            </div>
                            <div>
                                <label style={styles.fileLabel}>📜 10th Marksheet</label>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    style={styles.fileInput}
                                    onChange={(e) => handleFileChange('marksheet_10th', e.target.files[0])}
                                />
                            </div>
                            <div>
                                <label style={styles.fileLabel}>📜 12th Marksheet</label>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    style={styles.fileInput}
                                    onChange={(e) => handleFileChange('marksheet_12th', e.target.files[0])}
                                />
                            </div>
                            <button style={styles.button} onClick={handleUpload}>
                                📤 Upload Documents
                            </button>
                            {uploadStatus && (
                                <div style={{ ...styles.gtItem, marginTop: '1rem', background: '#10b981' }}>
                                    ✅ {uploadStatus.message}
                                </div>
                            )}
                        </>
                    )}

                    {/* Ground Truth Summary */}
                    {groundTruth && (
                        <div style={styles.gtSection}>
                            <h4 style={{ ...styles.cardTitle, fontSize: '1rem' }}>📚 Ground Truth Sources</h4>
                            <div style={{ ...styles.gtItem, borderLeft: '3px solid #06b6d4' }}>
                                <p style={{ ...styles.gtLabel, color: '#06b6d4' }}>Resume</p>
                                <p style={styles.gtValue}>Name: {groundTruth.resume?.name}</p>
                                <p style={{ ...styles.gtValue, fontSize: '0.75rem' }}>📍 {groundTruth.resume?.current_address}</p>
                            </div>
                            <div style={{ ...styles.gtItem, borderLeft: '3px solid #ec4899' }}>
                                <p style={{ ...styles.gtLabel, color: '#ec4899' }}>Aadhar Card</p>
                                <p style={styles.gtValue}>DOB: {groundTruth.aadhar?.dob}</p>
                                <p style={{ ...styles.gtValue, fontSize: '0.75rem' }}>🏠 {groundTruth.aadhar?.permanent_address}</p>
                            </div>
                            <div style={{ ...styles.gtItem, borderLeft: '3px solid #8b5cf6' }}>
                                <p style={{ ...styles.gtLabel, color: '#8b5cf6' }}>HR Transcript</p>
                                <p style={styles.gtValue}>Expected: {groundTruth.hr_transcript?.expected_ctc}</p>
                                <p style={styles.gtValue}>Last CTC: {groundTruth.hr_transcript?.last_ctc}</p>
                            </div>
                            <div style={{ ...styles.gtItem, borderLeft: '3px solid #10b981' }}>
                                <p style={{ ...styles.gtLabel, color: '#10b981' }}>10th Marksheet</p>
                                <p style={styles.gtValue}>Father: {groundTruth.education_10th?.father_name}</p>
                                <p style={{ ...styles.gtValue, fontSize: '0.75rem' }}>🏫 {groundTruth.education_10th?.school}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Panel */}
                <div style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>📊 Validation Report</h3>
                        {result && (
                            <span style={{
                                ...styles.score,
                                background: result.score >= 80 ? 'rgba(16, 185, 129, 0.2)' :
                                    result.score >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: result.score >= 80 ? '#10b981' : result.score >= 50 ? '#f59e0b' : '#ef4444'
                            }}>
                                Score: {result.score}%
                            </span>
                        )}
                    </div>

                    {!result ? (
                        <div style={styles.noResult}>
                            <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</span>
                            <p style={{ fontSize: '1.25rem' }}>No validation results yet</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Select a candidate and run validation</p>
                        </div>
                    ) : (
                        <>
                            {/* Metrics */}
                            <div style={styles.metrics}>
                                <div style={{ ...styles.metricCard, background: 'rgba(55, 65, 81, 0.5)' }}>
                                    <div style={styles.metricValue}>{result.metrics?.total_fields}</div>
                                    <div style={styles.metricLabel}>Total Fields</div>
                                </div>
                                <div style={{ ...styles.metricCard, background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                    <div style={{ ...styles.metricValue, color: '#10b981' }}>{result.metrics?.correct}</div>
                                    <div style={{ ...styles.metricLabel, color: '#10b981' }}>Correct</div>
                                </div>
                                <div style={{ ...styles.metricCard, background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                    <div style={{ ...styles.metricValue, color: '#f59e0b' }}>{result.metrics?.ambiguous}</div>
                                    <div style={{ ...styles.metricLabel, color: '#f59e0b' }}>Ambiguous</div>
                                </div>
                                <div style={{ ...styles.metricCard, background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                    <div style={{ ...styles.metricValue, color: '#ef4444' }}>{result.metrics?.incorrect}</div>
                                    <div style={{ ...styles.metricLabel, color: '#ef4444' }}>Incorrect</div>
                                </div>
                            </div>

                            {/* Issues List */}
                            <div style={styles.issuesList}>
                                {result.report?.map((issue, idx) => {
                                    const issueStyle = getIssueStyles(issue.issue_type);
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                ...styles.issueCard,
                                                background: `${issueStyle.bg}22`,
                                                border: `1px solid ${issueStyle.border}55`
                                            }}
                                        >
                                            <div style={styles.issueHeader}>
                                                <span style={{ fontSize: '1.25rem' }}>{getIcon(issue.issue_type)}</span>
                                                <span style={{ fontWeight: '700', textTransform: 'capitalize' }}>
                                                    {issue.field?.replace(/_/g, ' ')}
                                                </span>
                                                <span style={{
                                                    ...styles.issueBadge,
                                                    background: issueStyle.bg,
                                                    color: issueStyle.text
                                                }}>
                                                    {issue.issue_type}
                                                </span>
                                            </div>
                                            <p style={styles.issueDesc}>{issue.description}</p>
                                            <div style={styles.issueMeta}>
                                                📄 Source: <strong>{issue.source_reference}</strong>
                                                {issue.ground_truth_value && (
                                                    <span style={{ marginLeft: '1rem' }}>
                                                        📌 Expected: <strong>{issue.ground_truth_value}</strong>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
