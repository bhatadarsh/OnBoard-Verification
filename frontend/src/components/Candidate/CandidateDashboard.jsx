import { useState, useEffect } from 'react';
import { RECRO_API, ONBOARD_API } from '../../config/api';
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
  const [interview, setInterview]     = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeInterviewId, setActiveInterviewId] = useState(null);
  const [interviewLoading, setInterviewLoading]   = useState(false);
  const [interviewError, setInterviewError]       = useState(null);
  const [onboardStatus, setOnboardStatus]         = useState(null);

  const candidateId = user?.candidate_id;

  // Create (or resume) a LangGraph session then open the interview UI
  const startInterview = async (app) => {
    setInterviewError(null);
    setInterviewLoading(true);
    try {
      // Always create a fresh session — this runs initialize_interview + stage4_graph
      const res = await fetch(`${RECRO_API}/admin/interview/start/${candidateId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Session creation failed (${res.status})`);
      }
      const data = await res.json();
      const interviewId = data.interview_id;
      if (!interviewId) throw new Error('No interview_id returned from server');
      setActiveInterviewId(interviewId);
    } catch (err) {
      console.error('[startInterview]', err);
      setInterviewError(err.message);
    } finally {
      setInterviewLoading(false);
    }
  };

  // ── All hooks must be called before any return ──────────────────────────────
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
        let currentEmail = user.email;
        if (!currentEmail) {
          const resProf = await fetch(`${RECRO_API}/api/candidate/profile`, { headers });
          if (resProf.ok) {
            const pData = await resProf.json();
            if (pData?.candidate_data?.email) {
              currentEmail = pData.candidate_data.email;
              user.email = currentEmail;
              localStorage.setItem('candidate_email', currentEmail);
            }
          }
        }

        // Fetch live OnboardGuard document status via the bridge
        if (currentEmail) {
          try {
            const resOnb = await fetch(`${ONBOARD_API}/api/v1/candidate/by-email/${encodeURIComponent(currentEmail)}`);
            if (resOnb.ok) {
              const onbData = await resOnb.json();
              setOnboardStatus(onbData);
            }
          } catch(e) {}
        }
      } catch (e) {
        console.warn('Could not fetch data:', e);
      }

      setLoading(false);
    };

    if (candidateId) fetchData();
    else setLoading(false);
  }, [candidateId, user]);

  // ── Now safe to do early returns after all hooks are declared ────────────────
  if (activeInterviewId) {
    return (
      <div style={{ marginTop: '30px' }}>
        <InterviewSession
          interviewId={activeInterviewId}
          onEnd={() => {
          setActiveInterviewId(null);
          // Force a full refresh to guarantee all SQLite updates (status, interview cards) are pulled cleanly
          window.location.reload();
        }}
        />
      </div>
    );
  }

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
                  // Always use the real status from SQLite — normalise to lowercase_underscore
                  // so it matches STATUS_STEPS keys
                  const appStatus   = (app.status || 'applied').toLowerCase().replace(/\s+/g, '_');
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
                      
                      {['interview_scheduled'].includes(appStatus) && (
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                          {interviewError && (
                            <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '10px' }}>
                              ⚠️ {interviewError}
                            </p>
                          )}
                          <button
                            onClick={() => startInterview(app)}
                            disabled={interviewLoading}
                            style={{
                              padding: '12px 24px',
                              background: interviewLoading ? '#93c5fd' : '#3b82f6',
                              color: 'white', border: 'none', borderRadius: '8px',
                              cursor: interviewLoading ? 'not-allowed' : 'pointer',
                              fontWeight: '600', minWidth: '220px'
                            }}
                          >
                            {interviewLoading ? '⏳ Starting Interview...' : '🎤 Start AI Video Interview'}
                          </button>
                          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                            Requires webcam and microphone permissions.
                          </p>
                        </div>
                      )}

                      {appStatus === 'interviewed' && (
                        <div style={{
                          marginTop: '20px', padding: '16px 20px',
                          background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                          border: '1px solid #86efac', borderRadius: '10px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '28px', marginBottom: '6px' }}>🎊</div>
                          <p style={{ margin: 0, fontWeight: '700', color: '#166534', fontSize: '15px' }}>
                            Interview Completed
                          </p>
                          <p style={{ margin: '4px 0 0', color: '#15803d', fontSize: '13px' }}>
                            Your responses have been recorded. We'll be in touch soon!
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
              {applications.some(app => ['rejected'].includes((app.status || '').toLowerCase().replace(/\s+/g, '_'))) ? (
                <div className="cd-no-interview">
                  <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>🔒</span>
                  <p>Interview process closed.</p>
                </div>
              ) : applications.some(app => ['interviewed', 'offered'].includes((app.status || '').toLowerCase().replace(/\s+/g, '_'))) ? (
                <div className="cd-no-interview">
                  <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>✅</span>
                  <p>Interview Completed.</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>Your responses have been recorded and are under review.</p>
                </div>
              ) : interview ? (
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
                  <span className="cd-info-value">
                    {applications.some(app => ['rejected'].includes((app.status || '').toLowerCase().replace(/\s+/g, '_')))
                      ? '❌ Rejected'
                      : applications.some(app => ['interviewed', 'offered'].includes((app.status || '').toLowerCase().replace(/\s+/g, '_')))
                      ? '🎊 Completed'
                      : applications.some(app => ['interview_scheduled'].includes((app.status || '').toLowerCase().replace(/\s+/g, '_'))) || interview
                      ? '✅ Scheduled'
                      : '⏳ Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Document Status Card ── */}
            <div className="cd-card">
              <div className="cd-card-title">📄 Document Checklist</div>
              <div className="cd-doc-list">
                {[
                  { key: 'resume',         label: 'Resume / CV',    icon: '📄' },
                  { key: 'aadhar',         label: 'Aadhar Card',    icon: '🪪' },
                  { key: 'pan',            label: 'PAN Card',       icon: '💳' },
                  { key: 'marksheet_10th', label: '10th Marksheet', icon: '🎓' },
                  { key: 'marksheet_12th', label: '12th Marksheet', icon: '🏫' },
                  { key: 'i9_form',        label: 'I-9 Form',       icon: '📝' },
                ].map((doc, i) => {
                  const isUploaded = onboardStatus?.uploaded_documents?.includes(doc.key);
                  const isVerified = onboardStatus?.validation_status === 'validated'; // Simplification for demo
                  return (
                    <div key={i} className="cd-doc-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ opacity: isUploaded ? 1 : 0.6 }}>{doc.icon} {doc.label}</span>
                      <span className="cd-doc-hint" style={{
                        color: isUploaded ? '#10b981' : '#94a3b8',
                        fontWeight: isUploaded ? 600 : 400,
                        background: isUploaded ? '#ecfdf5' : 'transparent',
                        padding: isUploaded ? '2px 8px' : 0,
                        borderRadius: '4px'
                      }}>
                        {isUploaded ? (isVerified ? '✅ Verified' : '⏳ Uploaded') : 'Upload via HR portal'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
                Documents are securely uploaded by HR during onboarding. Contact HR if you need to submit any.
              </p>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
