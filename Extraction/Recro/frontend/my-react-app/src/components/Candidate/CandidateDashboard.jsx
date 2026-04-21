import { useState, useEffect } from 'react';
import { RECRO_API } from '../../config/api';
import './CandidateDashboard.css';
import InterviewSession from './InterviewSession';

/**
 * CandidateDashboard — shown to candidates after login.
 *
 * Displays:
 *   - Application status timeline
 *   - Scheduled interview details (date, time, link)
 *   - Document upload status
 */

const STATUS_STEPS = [
  { key: 'applied',              label: 'Applied',              icon: '📝' },
  { key: 'shortlisted',         label: 'Shortlisted',          icon: '⭐' },
  { key: 'interview_scheduled', label: 'Interview Scheduled',  icon: '📅' },
  { key: 'interviewed',         label: 'Interviewed',          icon: '🎙️' },
  { key: 'offered',             label: 'Offered',              icon: '🎉' },
];

function getStepIndex(status) {
  const s = (status || '').toLowerCase().replace(/\s/g, '_');
  const idx = STATUS_STEPS.findIndex(st => st.key === s);
  return idx >= 0 ? idx : 0;
}

export default function CandidateDashboard({ user, onLogout, onGoToCareers }) {
  const [interview, setInterview]   = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeInterviewId, setActiveInterviewId] = useState(null);

  if (activeInterviewId) {
      return (
          <div style={{ marginTop: '30px' }}>
              <InterviewSession 
                interviewId={activeInterviewId} 
                onEnd={() => setActiveInterviewId(null)} 
              />
          </div>
      );
  }

  const candidateId = user?.candidate_id;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = user?.access_token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        // Fetch interview
        const resInt = await fetch(`${RECRO_API}/api/interview/candidate/${candidateId}`, { headers });
        if (resInt.ok) {
          const data = await resInt.json();
          setInterview(data.interview || null);
        }

        // Fetch applications
        const resApp = await fetch(`${RECRO_API}/api/candidate/applications`, { headers });
        if (resApp.ok) {
          const data = await resApp.json();
          setApplications(data.applications || []);
        }

        // Silent patch for older sessions missing the email in local storage
        if (!user.email) {
          const resProf = await fetch(`${RECRO_API}/api/candidate/profile`, { headers });
          if (resProf.ok) {
            const pData = await resProf.json();
            if (pData?.candidate_data?.email) {
              user.email = pData.candidate_data.email;
              localStorage.setItem('candidate_email', pData.candidate_data.email);
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch data:', e);
      }

      setLoading(false);
    };

    if (candidateId) fetchData();
    else setLoading(false);
  }, [candidateId, user]);

  return (
    <div className="cd-root">
      {/* Top Nav */}
      <header className="cd-header">
        <div className="cd-brand">
          <span className="cd-brand-dot" />
          <span className="cd-brand-name">SIGMOID</span>
          <span className="cd-brand-sub">Candidate Portal</span>
        </div>
        <div className="cd-header-right">
          <button className="cd-careers-btn" onClick={onGoToCareers}>Careers</button>
          <div className="cd-user-pill">
            <div className="cd-avatar">{(user?.email || 'C')[0].toUpperCase()}</div>
            <span>{user?.email}</span>
          </div>
          <button className="cd-logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <main className="cd-main">
        {/* Hero greeting */}
        <div className="cd-hero">
          <div>
            <h1 className="cd-greeting">
              Welcome back 👋
            </h1>
            <p className="cd-greeting-sub">Track your application status and interview details below.</p>
          </div>
        </div>

        {loading ? (
          <div className="cd-loading">
            <div className="cd-spinner" />
            <p>Loading your application data...</p>
          </div>
        ) : (
          <div className="cd-grid">

            {/* ── Application Status Timeline ── */}
            <div className="cd-card cd-card-wide" style={{ gridColumn: '1 / -1' }}>
              <div className="cd-card-title">📋 My Applications</div>
              
              {applications.length === 0 ? (
                 <p style={{ color: '#64748b', fontSize: '14px' }}>You haven't applied to any jobs yet.</p>
              ) : (
                applications.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map((app, idx) => {
                  const isRejected  = (app.status || '').toLowerCase() === 'rejected';
                  const appStatus = interview && interview.job_id === app.job_id ? 'interview_scheduled' : app.status;
                  const currentStep = getStepIndex(appStatus);

                  return (
                    <div key={app.application_id} style={{ marginBottom: '32px', borderBottom: idx < applications.length - 1 ? '1px solid #e2e8f0' : 'none', paddingBottom: idx < applications.length - 1 ? '24px' : '0' }}>
                      <div style={{ marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>{app.job_title}</h3>
                        {app.department && <span style={{ fontSize: '12px', color: '#64748b', marginRight: '10px' }}>{app.department}</span>}
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Applied on {new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="cd-timeline">
                        {STATUS_STEPS.map((step, i) => {
                          const isDone    = i <= currentStep && !isRejected;
                          const isCurrent = i === currentStep && !isRejected;
                          return (
                            <div key={step.key} className={`cd-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                              <div className="cd-step-dot">
                                {isDone ? (i === currentStep ? step.icon : '✓') : i + 1}
                              </div>
                              <div className="cd-step-label">{step.label}</div>
                              {i < STATUS_STEPS.length - 1 && (
                                <div className={`cd-step-line ${i < currentStep && !isRejected ? 'done' : ''}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {appStatus === 'interview_scheduled' && app.ai_interview_id && (
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <button
                                onClick={() => setActiveInterviewId(app.ai_interview_id)}
                                style={{
                                    padding: '12px 24px', background: '#3b82f6', color: 'white',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                                }}
                            >
                                🎤 Start AI Video Interview
                            </button>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                                Requires web-camera and microphone permissions.
                            </p>
                        </div>
                      )}

                      {isRejected && (
                        <div className="cd-rejected-note" style={{ marginTop: '16px' }}>
                          We regret to inform you that your application was not selected for this role. Thank you for your interest in Sigmoid.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Interview Card ── */}
            <div className={`cd-card ${interview ? 'cd-interview-active' : ''}`}>
              <div className="cd-card-title">🎙️ Interview Details</div>
              {interview ? (
                <div className="cd-interview-content">
                  <div className="cd-interview-status-badge">Interview Confirmed</div>

                  <div className="cd-interview-detail">
                    <span className="cd-detail-icon">📅</span>
                    <div>
                      <div className="cd-detail-label">Date & Time</div>
                      <div className="cd-detail-value">
                        {new Date(interview.scheduled_at).toLocaleString('en-IN', {
                          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {interview.interview_link && (
                    <div className="cd-interview-detail">
                      <span className="cd-detail-icon">🔗</span>
                      <div>
                        <div className="cd-detail-label">Interview Link</div>
                        <a
                          href={interview.interview_link}
                          target="_blank"
                          rel="noreferrer"
                          className="cd-interview-link"
                        >
                          {interview.interview_link}
                        </a>
                      </div>
                    </div>
                  )}

                  {interview.notes && (
                    <div className="cd-interview-detail">
                      <span className="cd-detail-icon">📝</span>
                      <div>
                        <div className="cd-detail-label">Notes from HR</div>
                        <div className="cd-detail-value cd-notes">{interview.notes}</div>
                      </div>
                    </div>
                  )}

                  <div className="cd-interview-tip">
                    💡 <strong>Tip:</strong> Be ready 5 minutes before the scheduled time. Keep your original documents handy.
                  </div>
                </div>
              ) : (
                <div className="cd-no-interview">
                  <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📭</span>
                  <p>No interview scheduled yet.</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>You'll receive an email and this card will update when HR schedules your interview.</p>
                </div>
              )}
            </div>

            {/* ── Quick Info Card ── */}
            <div className="cd-card">
              <div className="cd-card-title">ℹ️ Candidate Info</div>
              <div className="cd-info-rows">
                <div className="cd-info-row">
                  <span className="cd-info-label">Candidate ID</span>
                  <span className="cd-info-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{candidateId || '—'}</span>
                </div>
                <div className="cd-info-row">
                  <span className="cd-info-label">Email</span>
                  <span className="cd-info-value">{user?.email || '—'}</span>
                </div>
                <div className="cd-info-row">
                  <span className="cd-info-label">Applications</span>
                  <span className="cd-info-value" style={{ fontWeight: 700, color: '#4f46e5' }}>
                    {applications.length} Submitted
                  </span>
                </div>
                <div className="cd-info-row">
                  <span className="cd-info-label">Interview</span>
                  <span className="cd-info-value">{interview ? '✅ Scheduled' : '⏳ Pending'}</span>
                </div>
              </div>
            </div>

            {/* ── Document Status Card ── */}
            <div className="cd-card">
              <div className="cd-card-title">📄 Document Checklist</div>
              <div className="cd-doc-list">
                {[
                  { label: 'Resume / CV',    icon: '📄' },
                  { label: 'Aadhar Card',    icon: '🪪' },
                  { label: 'PAN Card',       icon: '💳' },
                  { label: '10th Marksheet', icon: '🎓' },
                  { label: '12th Marksheet', icon: '🏫' },
                ].map((doc, i) => (
                  <div key={i} className="cd-doc-row">
                    <span>{doc.icon} {doc.label}</span>
                    <span className="cd-doc-hint">Upload via HR portal</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
                Documents are uploaded by HR during onboarding. Contact HR if you need to submit any.
              </p>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
