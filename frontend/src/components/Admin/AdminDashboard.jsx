import { useState, useEffect } from 'react';
import { RECRO_API } from '../../config/api';
import JobPostForm from './JobPostForm';
import CandidateProfile from './CandidateProfile';
import sigmoidLogo from '../../assets/sigmoid_logo.jpeg';
import './AdminDashboard.css';

// OnboardGuard Components
import OnboardDashboard from '../OnboardGuard/OnboardDashboard';
import OnboardUpload from '../OnboardGuard/OnboardUpload';
import OnboardValidate from '../OnboardGuard/OnboardValidate';
import { jobs as mockJobs } from '../../data/jobs';


const STATUS_COLOR = {
  'applied': { bg: '#eff6ff', color: '#1d4ed8' },
  'shortlisted': { bg: '#f0fdf4', color: '#15803d' },
  'interview_scheduled': { bg: '#fefce8', color: '#a16207' },
  'rejected': { bg: '#fef2f2', color: '#dc2626' },
  'onboarded': { bg: '#f5f3ff', color: '#7c3aed' },
};

const MENU = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'jobs', label: 'Manage Jobs', icon: '💼' },
  { id: 'post', label: 'Post New Job', icon: '📝' },
  { id: 'apps', label: 'Applications', icon: '📋' },
  { type: 'label', id: 'lab1', label: 'ONBOARDGUARD' },
  { id: 'onboard_dash', label: 'Verification Dash', icon: '🛡️' },
  { id: 'onboard_upload', label: 'Upload Documents', icon: '📤' },
  { id: 'onboard_validate', label: 'Validate Files', icon: '✅' },
];

const FAKE_APP_COUNT = {};

export default function AdminDashboard({ admin, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  const [editingJob, setEditingJob] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedJobApp, setSelectedJobApp] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState({ total_candidates: 0, active_jobs: 0, total_applications: 0 });
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      setJobs(mockJobs);
      setStats({
        total_candidates: mockJobs.reduce((acc, job) => acc + (job.applicant_count || 0), 0),
        active_jobs: mockJobs.length,
        total_applications: mockJobs.reduce((acc, job) => acc + (job.applicant_count || 0), 0)
      });
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeMenu === 'apps' && selectedJobApp) {
      fetchApplicants(selectedJobApp.id);
    }
  }, [activeMenu, selectedJobApp]);

  const fetchApplicants = async (jobId) => {
    try {
      const res = await fetch(`${RECRO_API}/api/admin/job/${jobId}/applicants`);
      if (res.ok) setApplicants(await res.json());
    } catch (err) {
      console.error('Fetch applicants error:', err);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleJobSave = async (jobData) => {
    // Parse experience range (e.g., "2-4 Years" or "10+ Years")
    let minExp = 0;
    let maxExp = 5;
    if (jobData.experience) {
      const matchRange = jobData.experience.match(/(\d+)\s*[\u2013-]\s*(\d+)/);
      const matchPlus = jobData.experience.match(/(\d+)\+/);
      if (matchRange) {
        minExp = parseInt(matchRange[1]);
        maxExp = parseInt(matchRange[2]);
      } else if (matchPlus) {
        minExp = parseInt(matchPlus[1]);
        maxExp = 99; // Representing 10+
      }
    }

    try {
      const method = editingJob ? 'PUT' : 'POST';
      const url = editingJob ? `${RECRO_API}/api/job/${editingJob.id}` : `${RECRO_API}/api/job/`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobData.title,
          subtitle: jobData.subtitle,
          department: jobData.department,
          location: jobData.location,
          employment_type: jobData.type,
          work_mode: jobData.mode,
          min_experience: minExp,
          max_experience: maxExp,
          experience_range: jobData.experience,
          required_skills: Array.isArray(jobData.tags) ? jobData.tags.join(', ') : jobData.tags,
          responsibilities: jobData.responsibilities,
          desired_experience: jobData.desiredExperience,
          primary_skills: jobData.primarySkills,
          secondary_skills: jobData.secondarySkills,
          content_raw: jobData.summary
        }),
      });
      if (res.ok) {
        showToast(editingJob ? 'Job updated!' : 'Job posted!');
        fetchInitialData();
        setEditingJob(null);
        setActiveMenu('jobs');
      }
    } catch (err) {
      showToast('Error saving job', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this job?')) {
      try {
        const res = await fetch(`${RECRO_API}/api/job/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Job deleted.');
          fetchInitialData();
        }
      } catch (err) {
        showToast('Delete failed', 'error');
      }
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setActiveMenu('post');
  };

  const handleNewPost = () => {
    setEditingJob(null);
    setActiveMenu('post');
  };

  // Open the applicant list for a job
  const handleViewApps = (job) => {
    setSelectedJobApp(job);
    setActiveMenu('apps');
  };

  // Open candidate profile modal
  const handleOpenProfile = (applicant, jobTitle) => {
    setProfileData({ applicant, jobTitle });
  };

  // Close candidate profile modal
  const handleCloseProfile = () => setProfileData(null);

  // Update applicant status (local state)
  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      const res = await fetch(`${RECRO_API}/api/admin/application/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Status updated to "${newStatus}"`);
        if (selectedJobApp) {
          if (newStatus.toLowerCase() === 'rejected') {
            setApplicants(prev => prev.filter(a => a.id !== applicationId));
            handleCloseProfile();
          } else {
            fetchApplicants(selectedJobApp.id);
          }
        }
      }
    } catch (err) {
      showToast('Update failed', 'error');
    }
  };

  return (
    <div className="admin-root">
      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-logo">
          <img src={sigmoidLogo} alt="Sigmoid" className="sidebar-logo-img" />
          {sidebarOpen && <span className="sidebar-brand">SIGMOID</span>}
        </div>

        {sidebarOpen && <div className="sidebar-section-label">MAIN MENU</div>}

        <nav className="sidebar-nav">
          {MENU.map(item => (
            item.type === 'label' ? (
              <div key={item.id} className="sidebar-section-label" style={{ marginTop: '12px' }}>{sidebarOpen && item.label}</div>
            ) : (
              <button
                key={item.id}
                id={`menu-${item.id}`}
                className={`sidebar-item ${activeMenu === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveMenu(item.id);
                  if (item.id !== 'post') setEditingJob(null);
                  if (item.id !== 'apps') setSelectedJobApp(null);
                }}
                title={!sidebarOpen ? item.label : ''}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                {sidebarOpen && <span className="sidebar-item-label">{item.label}</span>}
                {item.id === 'jobs' && sidebarOpen && (
                  <span className="sidebar-badge">{jobs.length}</span>
                )}
              </button>
            )
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="admin-user-info">
              <div className="admin-avatar">{admin.name.charAt(0)}</div>
              <div>
                <div className="admin-user-name">{admin.name}</div>
                <div className="admin-user-role">Administrator</div>
              </div>
            </div>
          )}
          <button className="sidebar-logout" onClick={onLogout} id="btn-admin-logout" title="Logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(v => !v)}
              id="btn-sidebar-toggle"
              aria-label="Toggle sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="topbar-breadcrumb">
              <span className="breadcrumb-parent">Admin</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">
                {activeMenu === 'apps' && selectedJobApp
                  ? `Applications — ${selectedJobApp.title}`
                  : MENU.find(m => m.id === activeMenu)?.label}
              </span>
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn" id="btn-post-new" onClick={handleNewPost}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Post New Job
            </button>
          </div>
        </header>

        {/* ── Content ── */}
        <div className="admin-content">

          {/* ── DASHBOARD ── */}
          {activeMenu === 'dashboard' && (
            <div className="dashboard-view" id="view-dashboard">
              <div className="view-title">
                <h1>Welcome back, {admin.name.split(' ')[0]} 👋</h1>
                <p>Here's what's happening with Sigmoid's job portal today.</p>
              </div>

              <div className="stat-cards">
                {[
                  { label: 'Total Jobs Posted', value: jobs.length, icon: '💼', color: '#4f46e5', trend: 'Live from DB' },
                  { label: 'Total Applications', value: stats.total_applications, icon: '📋', color: '#CC1B1B', trend: 'Live from DB' },
                  { label: 'Active Positions', value: stats.active_jobs, icon: '🟢', color: '#16a34a', trend: 'Open status' },
                  { label: 'Total Candidates', value: stats.total_candidates, icon: '🏢', color: '#ea580c', trend: 'In database' },
                ].map((s, i) => (
                  <div key={i} className="stat-card" style={{ '--accent': s.color }}>
                    <div className="stat-card-icon">{s.icon}</div>
                    <div className="stat-card-info">
                      <div className="stat-card-value">{s.value}</div>
                      <div className="stat-card-label">{s.label}</div>
                      <div className="stat-card-trend">{s.trend}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dashboard-section">
                <div className="section-title-bar">
                  <h2>Recent Job Postings</h2>
                  <button className="link-btn" onClick={() => setActiveMenu('jobs')}>View all →</button>
                </div>
                <div className="jobs-table-wrap">
                  <table className="jobs-table">
                    <thead>
                      <tr>
                        <th>Job Title</th><th>Department</th><th>Location</th>
                        <th>Experience</th><th>Applications</th><th>Posted</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.slice(0, 5).map(job => (
                        <tr key={job.id}>
                          <td>
                            <div className="table-job-title">{job.title}</div>
                            <div className="table-job-sub">{job.subtitle}</div>
                          </td>
                          <td><span className="dept-pill">{job.department}</span></td>
                          <td className="table-muted">{job.location}</td>
                          <td className="table-muted">{job.experience}</td>
                          <td><span className="app-count">{job.applicant_count || 0}</span></td>
                          <td className="table-muted">{job.posted}</td>
                          <td>
                            <div className="table-actions">
                              <button className="tbl-btn edit" onClick={() => handleEdit(job)} id={`dash-edit-${job.id}`}>Edit</button>
                              <button className="tbl-btn del" onClick={() => handleDelete(job.id)} id={`dash-del-${job.id}`}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="quick-actions">
                <div className="qa-title">Quick Actions</div>
                <div className="qa-grid">
                  {[
                    { icon: '➕', label: 'Post New Job', action: handleNewPost },
                    { icon: '📋', label: 'View Applications', action: () => setActiveMenu('apps') },
                    { icon: '💼', label: 'Manage All Jobs', action: () => setActiveMenu('jobs') },
                  ].map((qa, i) => (
                    <button key={i} className="qa-btn" onClick={qa.action} id={`qa-btn-${i}`}>
                      <span className="qa-icon">{qa.icon}</span>
                      <span>{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── MANAGE JOBS ── */}
          {activeMenu === 'jobs' && (
            <div className="jobs-view" id="view-jobs">
              <div className="view-title">
                <h1>Manage Job Postings</h1>
                <p>{jobs.length} active job{jobs.length !== 1 ? 's' : ''} posted</p>
              </div>
              <div className="jobs-table-wrap">
                <table className="jobs-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Job Title</th><th>Department</th><th>Location</th>
                      <th>Type</th><th>Experience</th><th>Applications</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job, idx) => (
                      <tr key={job.id}>
                        <td className="table-muted">{idx + 1}</td>
                        <td>
                          <div className="table-job-title">{job.title}</div>
                          <div className="table-job-sub">{job.subtitle}</div>
                        </td>
                        <td><span className="dept-pill">{job.department}</span></td>
                        <td className="table-muted">{job.location}</td>
                        <td>
                          <span className={`type-pill ${job.type === 'Full-time' ? 'ft' : 'ct'}`}>
                            {job.type}
                          </span>
                        </td>
                        <td className="table-muted">{job.experience}</td>
                        <td><span className="app-count">{job.applicant_count || 0}</span></td>
                        <td>
                          <div className="table-actions">
                            <button className="tbl-btn view" onClick={() => handleViewApps(job)} id={`view-job-apps-${job.id}`}>
                              👥 Applicants
                            </button>
                            <button className="tbl-btn edit" onClick={() => handleEdit(job)} id={`edit-job-${job.id}`}>
                              ✏️ Edit
                            </button>
                            <button className="tbl-btn del" onClick={() => handleDelete(job.id)} id={`delete-job-${job.id}`}>
                              🗑 Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── POST / EDIT JOB ── */}
          {activeMenu === 'post' && (
            <div id="view-post">
              <div className="view-title">
                <h1>{editingJob ? `Edit: ${editingJob.title}` : 'Post New Job'}</h1>
                <p>{editingJob ? 'Update the job details below.' : 'Fill in the details to publish a new position.'}</p>
              </div>
              <JobPostForm
                initialData={editingJob}
                onSave={handleJobSave}
                onCancel={() => { setActiveMenu('jobs'); setEditingJob(null); }}
              />
            </div>
          )}

          {/* ── APPLICATIONS ── */}
          {activeMenu === 'apps' && (
            <div className="apps-view" id="view-apps">
              {/* If no specific job selected, show all jobs as cards */}
              {!selectedJobApp ? (
                <>
                  <div className="view-title">
                    <h1>Applications Overview</h1>
                    <p>{stats.total_applications} total applications across all positions</p>
                  </div>
                  <div className="apps-grid">
                    {jobs.map(job => (
                      <div key={job.id} className="app-card">
                        <div className="app-card-header">
                          <div className="app-card-dept">{job.department}</div>
                          <span className="app-count-badge">{job.applicant_count || 0} applicants</span>
                        </div>
                        <div className="app-card-title">{job.title}</div>
                        <div className="app-card-meta">{job.location} · {job.experience}</div>
                        <div className="app-progress">
                          <div
                            className="app-progress-bar"
                            style={{ width: `${Math.min(((job.applicant_count || 0) / 50) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="app-progress-label">
                          {Math.round(((job.applicant_count || 0) / 50) * 100)}% of target (50)
                        </div>
                        <button
                          className="app-view-btn"
                          id={`view-apps-${job.id}`}
                          onClick={() => handleViewApps(job)}
                        >
                          View Applications →
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Applicant list for a specific job */
                <div id="view-applicant-list">
                  <div className="applicant-list-header">
                    <div>
                      <button
                        className="back-btn"
                        id="btn-back-to-apps"
                        onClick={() => setSelectedJobApp(null)}
                      >
                        ← Back to All Jobs
                      </button>
                      <h1 className="applicant-list-title">{selectedJobApp.title}</h1>
                      <p className="applicant-list-sub">
                        {selectedJobApp.department} · {selectedJobApp.location} · {selectedJobApp.experience}
                      </p>
                    </div>
                    <div className="applicant-count-badge">
                      <span>{applicants.length || 0}</span>
                      <span>Applicants</span>
                    </div>
                  </div>

                  <div className="jobs-table-wrap" style={{ marginTop: 20 }}>
                    <table className="jobs-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Candidate Name</th>
                          <th>Email</th>
                          <th>Experience</th>
                          <th>Applied On</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applicants.map((applicant, idx) => (
                          <tr key={applicant.id}>
                            <td className="table-muted">{idx + 1}</td>
                            <td>
                              <div className="applicant-name-cell">
                                <div className="applicant-avatar">
                                  {applicant.candidate.name.charAt(0)}
                                </div>
                                <div className="table-job-title">{applicant.candidate.name}</div>
                              </div>
                            </td>
                            <td className="table-muted">{applicant.candidate.email}</td>
                            <td className="table-muted">{applicant.candidate.experience}</td>
                            <td className="table-muted">{applicant.applied_on}</td>
                            <td>
                              <span
                                className="status-pill"
                                style={{
                                  background: STATUS_COLOR[applicant.status]?.bg || '#f1f5f9',
                                  color: STATUS_COLOR[applicant.status]?.color || '#64748b',
                                }}
                              >
                                {applicant.status}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="tbl-btn edit"
                                  id={`view-profile-${applicant.id}`}
                                  onClick={() => handleOpenProfile(applicant, selectedJobApp.title)}
                                >
                                  View Profile
                                </button>
                                <button
                                  className="tbl-btn del"
                                  id={`reject-${applicant.id}`}
                                  onClick={() => handleStatusChange(applicant.id, 'rejected')}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ONBOARDGUARD VIEWS ── */}
          {/* These components now self-fetch from the OnBoard backend (port 8002) */}
          {activeMenu === 'onboard_dash' && <OnboardDashboard />}
          {activeMenu === 'onboard_upload' && <OnboardUpload />}
          {activeMenu === 'onboard_validate' && <OnboardValidate />}

        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`admin-toast ${toast.type}`} id="admin-toast">
          {toast.type === 'success' ? '✅' : 'ℹ️'} {toast.msg}
        </div>
      )}

      {/* Candidate Profile Modal */}
      {profileData && (
        <CandidateProfile
          applicant={profileData.applicant}
          jobTitle={profileData.jobTitle}
          onClose={handleCloseProfile}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
