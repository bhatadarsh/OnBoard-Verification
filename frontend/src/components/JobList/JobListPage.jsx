import { useState, useEffect } from 'react';
import JobCard from './JobCard';
import JobDetail from './JobDetail';
import './JobListPage.css';
import { RECRO_API } from '../../config/api';
import sigmoidLogo from '../../assets/sigmoid_logo.jpeg';
import { jobs as mockJobs } from '../../data/jobs';
export default function JobListPage({ onApply, onAdminSwitch, user, onDashboard }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Simulate API delay for smooth UI transition
    setTimeout(() => {
      setJobs(mockJobs);
      if (mockJobs.length > 0) setSelectedJob(mockJobs[0]);
      setLoading(false);
    }, 500);
  }, []);

  const departments = ['All', ...new Set(jobs.map(j => j.department))];

  const filtered = jobs.filter(j => {
    const matchSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase()) ||
      j.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchDept = filterDept === 'All' || j.department === filterDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="jlp-root">
      {/* ── Header ── */}
      <header className="jlp-header">
        <div className="jlp-header-inner">
          {/* Sigmoid Logo SVG */}
          <div className="sigmoid-logo">
            <img src={sigmoidLogo} alt="Sigmoid" className="sigmoid-logo-img" />
            <span className="sigmoid-wordmark">SIGMOID</span>
          </div>

          <nav className="jlp-nav">
            <a href="#" className="nav-link">About Us</a>
            <a href="#" className="nav-link">Solutions</a>
            <a href="#" className="nav-link active">Careers</a>
            <a href="#" className="nav-link">Contact</a>
            {user ? (
              <button className="nav-link portal-btn" onClick={onDashboard}>My Portal</button>
            ) : (
              <button className="nav-link portal-btn" onClick={onDashboard}>Sign In</button>
            )}
            <button
              id="btn-admin-portal"
              className="admin-portal-btn"
              onClick={onAdminSwitch}
              title="Switch to Admin Portal"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>

              Admin
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <div className="jlp-banner">
        <div className="banner-content">
          <h1 className="banner-title">Work at the heart of <span>data and AI</span></h1>
          <p className="banner-subtitle">
            Join a global team of analytics innovators helping Fortune 500 companies
            unlock the power of data.
          </p>
          <div className="banner-stats">
            <div className="stat"><span className="stat-num">{jobs.length}</span><span className="stat-label">Open Positions</span></div>
            <div className="stat-divider"/>
            <div className="stat"><span className="stat-num">12+</span><span className="stat-label">Countries</span></div>
            <div className="stat-divider"/>
            <div className="stat"><span className="stat-num">1000+</span><span className="stat-label">Data Experts</span></div>
          </div>
        </div>
        <div className="banner-wave-art">
          <svg viewBox="0 0 200 180" width="200" height="180" opacity="0.15">
            {Array.from({ length: 8 }).map((_, row) =>
              Array.from({ length: 10 }).map((_, col) => (
                <ellipse
                  key={`${row}-${col}`}
                  cx={col * 22 + 10}
                  cy={row * 22 + 10}
                  rx="4"
                  ry="8"
                  fill={col % 2 === 0 ? '#CC1B1B' : '#fff'}
                  transform={`rotate(${(col - 5) * 8} ${col * 22 + 10} ${row * 22 + 10})`}
                  opacity={0.4 + col * 0.06}
                />
              ))
            )}
          </svg>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div className="jlp-search-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            id="job-search"
            type="text"
            placeholder="Search by title, location or skill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="dept-filters">
          {departments.map(d => (
            <button
              key={d}
              id={`filter-${d.replace(/\s+/g, '-').toLowerCase()}`}
              className={`dept-filter-btn ${filterDept === d ? 'active' : ''}`}
              onClick={() => setFilterDept(d)}
            >{d}</button>
          ))}
        </div>
      </div>

      {/* ── Split Panel ── */}
      <div className="jlp-split">
        {/* Left: Job List */}
        <aside className="jlp-list-panel">
          <div className="list-panel-header">
            <span className="list-count">{filtered.length} position{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="job-cards-scroll">
            {loading ? (
              <div className="jlp-loading">
                <span className="jlp-spinner"></span>
                <p>Loading jobs...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="no-results">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <p>No jobs match your search.</p>
              </div>
            ) : (
              filtered.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJob?.id === job.id}
                  onClick={() => setSelectedJob(job)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Right: Job Detail */}
        <main className="jlp-detail-panel">
          {selectedJob ? (
            <JobDetail job={selectedJob} onApply={onApply} />
          ) : (
            <div className="jlp-empty-state">Select a job to view details</div>
          )}
        </main>
      </div>
    </div>
  );
}
