import React, { useState, useEffect } from 'react';
import { ONBOARD_API } from '../../config/api';
import './OnboardGuard.css';

/**
 * OnboardDashboard — fetches real candidate & validation stats
 * from the OnBoard-Verification backend (port 8002).
 */
const OnboardDashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${ONBOARD_API}/api/v1/candidates`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('form_file', file);
      
      const res = await fetch(`${ONBOARD_API}/api/v1/onboarding/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Upload failed');
      }
      
      await fetchCandidates();
    } catch (err) {
      alert('Error uploading CSV: ' + err.message);
      setLoading(false);
    } finally {
      e.target.value = null;
    }
  };

  // Compute real stats
  const total         = candidates.length;
  const withDocs      = candidates.filter(c => c.has_documents).length;
  const validated     = candidates.filter(c => c.is_validated).length;
  const avgScore      = validated > 0
    ? Math.round(candidates.filter(c => c.is_validated).reduce((s, c) => s + (c.validation_score || 0), 0) / validated)
    : 0;

  const stats = [
    { label: 'Total Candidates', value: total,      accent: '#4f46e5' },
    { label: 'Docs Uploaded',    value: withDocs,   accent: '#06b6d4' },
    { label: 'Validation Done',  value: validated,  accent: '#8b5cf6' },
    { label: 'Avg Match Score',  value: validated ? `${avgScore}%` : 'N/A', accent: '#10b981' },
  ];

  // Pipeline stages per candidate
  const getPipelineStep = c => {
    if (c.is_validated) return 3;
    if (c.has_documents) return 2;
    return 1;
  };

  if (loading) {
    return (
      <div className="onboard-container">
        <div className="view-title"><h1>Onboarding Overview</h1></div>
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <div className="ob-spinner" />
          <p style={{ marginTop: 16 }}>Loading candidates from OnboardGuard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="onboard-container">
        <div className="view-title"><h1>Onboarding Overview</h1></div>
        <div style={{ padding: '24px', background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca', color: '#dc2626' }}>
          ⚠️ Could not reach OnBoard backend: {error}
          <br /><small>Make sure the backend server is running on port 8000.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="onboard-container">
      <div className="view-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Onboarding Overview</h1>
          <p>Real-time verification status from OnboardGuard.</p>
        </div>
        <div>
          <input type="file" id="csv-upload" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={handleImportCsv} />
          <button className="tbl-btn" style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '8px 16px', fontWeight: 600 }} onClick={() => document.getElementById('csv-upload').click()}>
            + Import Candidates (CSV)
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="ob-stat-grid">
        {stats.map((s, i) => (
          <div key={i} className="ob-stat-card" style={{ '--accent': s.accent }}>
            <div className="ob-stat-value">{s.value}</div>
            <div className="ob-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Candidate pipeline table */}
      <div style={{ marginTop: 24, background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Candidate Pipeline</h3>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{total} total</span>
        </div>
        {candidates.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No candidates in the OnBoard system yet.
          </div>
        ) : (
          <table className="jobs-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Candidate</th><th>Email</th><th>Pipeline Stage</th><th>Score</th>
              </tr>
            </thead>
            <tbody>
              {candidates.slice(0, 10).map(c => {
                const step = getPipelineStep(c);
                const STAGES = ['Registered', 'Docs Uploaded', 'Extracted', 'Validated'];
                return (
                  <tr key={c.id}>
                    <td><div className="table-job-title">{c.full_name}</div></td>
                    <td className="table-muted">{c.email}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {STAGES.map((label, i) => (
                          <span
                            key={i}
                            title={label}
                            style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: i <= step ? '#CC1B1B' : '#e2e8f0',
                              display: 'inline-block',
                            }}
                          />
                        ))}
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>{STAGES[step]}</span>
                      </div>
                    </td>
                    <td>
                      {c.is_validated
                        ? <span style={{ fontWeight: 700, color: c.validation_score >= 80 ? '#16a34a' : '#d97706' }}>{c.validation_score}%</span>
                        : <span style={{ color: '#94a3b8', fontSize: 12 }}>Pending</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default OnboardDashboard;
