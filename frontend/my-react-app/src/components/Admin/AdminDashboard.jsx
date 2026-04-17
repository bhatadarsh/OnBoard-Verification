import { useState } from 'react';
import { jobs as initialJobs } from '../../data/jobs';
import JobPostForm from './JobPostForm';
import CandidateProfile from './CandidateProfile';
import sigmoidLogo from '../../assets/sigmoid_logo.jpeg';
import './AdminDashboard.css';

const MENU = [
  { id: 'dashboard', label: 'Dashboard',    icon: '📊' },
  { id: 'jobs',      label: 'Manage Jobs',  icon: '💼' },
  { id: 'post',      label: 'Post New Job', icon: '➕' },
  { id: 'apps',      label: 'Applications', icon: '📋' },
];

// Fake application count per job id
const FAKE_APP_COUNT = { 1: 42, 2: 18, 3: 31, 4: 26, 5: 14, 6: 9, 7: 37, 8: 22 };

// Generate fake applicants for a given job
const STATUSES = ['Under Review', 'Shortlisted', 'Interview Scheduled', 'Rejected', 'Offered'];
const STATUS_COLOR = {
  'Under Review':        { bg: '#eff6ff', color: '#1d4ed8' },
  'Shortlisted':         { bg: '#f0fdf4', color: '#15803d' },
  'Interview Scheduled': { bg: '#fefce8', color: '#a16207' },
  'Rejected':            { bg: '#fef2f2', color: '#dc2626' },
  'Offered':             { bg: '#f5f3ff', color: '#7c3aed' },
};
const FAKE_NAMES = [
  'Arjun Mehta', 'Priya Sharma', 'Rohan Joshi', 'Anjali Gupta', 'Karthik Rajan',
  'Sneha Patel', 'Vikram Singh', 'Divya Nair', 'Aman Verma', 'Neha Kapoor',
  'Siddharth Rao', 'Pooja Iyer', 'Rahul Bose', 'Kritika Das', 'Aditya Kumar',
];

function generateApplicants(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: FAKE_NAMES[i % FAKE_NAMES.length],
    email: `${FAKE_NAMES[i % FAKE_NAMES.length].split(' ')[0].toLowerCase()}${i + 1}@gmail.com`,
    experience: `${3 + (i % 8)} years`,
    appliedOn: `${10 + (i % 18)} Apr 2025`,
    status: STATUSES[i % STATUSES.length],
  }));
}

export default function AdminDashboard({ admin, onLogout }) {
  const [activeMenu,     setActiveMenu]     = useState('dashboard');
  const [jobs,           setJobs]           = useState(initialJobs);
  const [editingJob,     setEditingJob]     = useState(null);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [toast,          setToast]          = useState(null);
  const [selectedJobApp, setSelectedJobApp] = useState(null);
  const [profileData,    setProfileData]    = useState(null); // { applicant, jobTitle }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleJobSave = (jobData) => {
    if (editingJob) {
      setJobs(prev => prev.map(j => j.id === editingJob.id ? { ...jobData, id: j.id } : j));
      showToast('Job updated successfully!');
    } else {
      const newJob = { ...jobData, id: Date.now(), posted: 'Just now' };
      setJobs(prev => [newJob, ...prev]);
      showToast('Job posted successfully!');
    }
    setEditingJob(null);
    setActiveMenu('jobs');
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this job posting?')) {
      setJobs(prev => prev.filter(j => j.id !== id));
      showToast('Job deleted.', 'info');
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
  const handleStatusChange = (applicantId, newStatus) => {
    showToast(`Status updated to "${newStatus}" for applicant #${applicantId}`);
  };

  const totalApps = Object.values(FAKE_APP_COUNT).reduce((s, v) => s + v, 0);

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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
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
                <line x1="3" y1="6"  x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
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
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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
                  { label: 'Total Jobs Posted',   value: jobs.length, icon: '💼', color: '#4f46e5', trend: '+2 this week' },
                  { label: 'Total Applications',  value: totalApps,   icon: '📋', color: '#CC1B1B', trend: '+18 today' },
                  { label: 'Active Positions',    value: jobs.length, icon: '🟢', color: '#16a34a', trend: 'All active' },
                  { label: 'Departments Hiring',  value: new Set(jobs.map(j => j.department)).size, icon: '🏢', color: '#ea580c', trend: 'Across teams' },
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
                          <td><span className="app-count">{FAKE_APP_COUNT[job.id] || 0}</span></td>
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
                    { icon: '➕', label: 'Post New Job',      action: handleNewPost },
                    { icon: '📋', label: 'View Applications', action: () => setActiveMenu('apps') },
                    { icon: '💼', label: 'Manage All Jobs',   action: () => setActiveMenu('jobs') },
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
                        <td><span className="app-count">{FAKE_APP_COUNT[job.id] || 0}</span></td>
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
                    <p>{totalApps} total applications across all positions</p>
                  </div>
                  <div className="apps-grid">
                    {jobs.map(job => (
                      <div key={job.id} className="app-card">
                        <div className="app-card-header">
                          <div className="app-card-dept">{job.department}</div>
                          <span className="app-count-badge">{FAKE_APP_COUNT[job.id] || 0} applicants</span>
                        </div>
                        <div className="app-card-title">{job.title}</div>
                        <div className="app-card-meta">{job.location} · {job.experience}</div>
                        <div className="app-progress">
                          <div
                            className="app-progress-bar"
                            style={{ width: `${Math.min(((FAKE_APP_COUNT[job.id] || 0) / 50) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="app-progress-label">
                          {Math.round(((FAKE_APP_COUNT[job.id] || 0) / 50) * 100)}% of target (50)
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
                      <span>{FAKE_APP_COUNT[selectedJobApp.id] || 0}</span>
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
                        {generateApplicants(FAKE_APP_COUNT[selectedJobApp.id] || 8).map((applicant, idx) => (
                          <tr key={applicant.id}>
                            <td className="table-muted">{idx + 1}</td>
                            <td>
                              <div className="applicant-name-cell">
                                <div className="applicant-avatar">
                                  {applicant.name.charAt(0)}
                                </div>
                                <div className="table-job-title">{applicant.name}</div>
                              </div>
                            </td>
                            <td className="table-muted">{applicant.email}</td>
                            <td className="table-muted">{applicant.experience}</td>
                            <td className="table-muted">{applicant.appliedOn}</td>
                            <td>
                              <span
                                className="status-pill"
                                style={{
                                  background: STATUS_COLOR[applicant.status].bg,
                                  color: STATUS_COLOR[applicant.status].color,
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
                                  onClick={() => showToast(`${applicant.name} rejected.`, 'info')}
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
