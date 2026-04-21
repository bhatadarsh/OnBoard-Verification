import { useState } from 'react';
import JobListPage from './components/JobList/JobListPage';
import AuthModal from './components/Auth/AuthModal';
import ApplicationWizard from './components/Application/ApplicationWizard';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import CandidateDashboard from './components/Candidate/CandidateDashboard';

/*
  App-level routing (state-based, no react-router):

  portalMode: 'candidate' | 'admin'

  Candidate flow:
    view: 'jobs'      →  JobListPage
    view: 'auth'      →  AuthModal (login / register)
    view: 'apply'     →  ApplicationWizard (multi-step)
    view: 'dashboard' →  CandidateDashboard (after login — shows status + interview)

  Admin flow:
    view: 'login'     →  AdminLogin
    view: 'dashboard' →  AdminDashboard
*/

export default function App() {
  // Detect #admin in URL hash for initial mode
  const initialMode = window.location.hash === '#admin' ? 'admin' : 'candidate';

  const [portalMode, setPortalMode] = useState(initialMode);

  // Candidate state
  const [view,        setView]        = useState('jobs');
  const [selectedJob, setSelectedJob] = useState(null);
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('candidate_token');
    const cid = localStorage.getItem('candidate_id');
    const email = localStorage.getItem('candidate_email');
    return token && cid ? { candidate_id: cid, access_token: token, email: email || '', name: 'Candidate' } : null;
  });

  // Admin state
  const [adminView, setAdminView] = useState('login');
  const [adminUser, setAdminUser] = useState(null);

  /* ── Candidate Handlers ── */
  const handleApply = (job) => {
    setSelectedJob(job);
    if (user) {
      setView('apply');
    } else {
      setView('auth');
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    // After login, go to candidate dashboard instead of directly to apply
    // If they clicked Apply on a job, go to apply; otherwise go to dashboard
    if (selectedJob) {
      setView('apply');
    } else {
      setView('dashboard');
    }
  };

  const handleAuthClose   = () => { setView('jobs'); setSelectedJob(null); };
  const handleWizardClose = () => { setView('jobs'); setSelectedJob(null); };
  const handleWizardSuccess = () => { setView('dashboard'); setSelectedJob(null); };
  const handleCandidateLogout = () => {
    localStorage.removeItem('candidate_token');
    localStorage.removeItem('candidate_id');
    localStorage.removeItem('candidate_email');
    setUser(null);
    setSelectedJob(null);
    setView('jobs');
  };

  // Allow logged-in candidate to see their dashboard from the job list
  const handleViewDashboard = () => {
    if (user) setView('dashboard');
    else setView('auth');
  };

  /* ── Admin Handlers ── */
  const handleAdminLogin  = (a) => { setAdminUser(a); setAdminView('dashboard'); };
  const handleAdminLogout = () => {
    setAdminUser(null);
    setAdminView('login');
    setPortalMode('candidate');
    window.location.hash = '';
  };

  /* ── Toggle Admin / Candidate ── */
  const switchToAdmin = () => {
    setPortalMode('admin');
    window.location.hash = 'admin';
  };

  /* ════════════════════════════
     RENDER
  ════════════════════════════ */

  /* ADMIN PORTAL */
  if (portalMode === 'admin') {
    if (adminView === 'login') {
      return <AdminLogin onLogin={handleAdminLogin} />;
    }
    return <AdminDashboard admin={adminUser} onLogout={handleAdminLogout} />;
  }

  /* CANDIDATE — Dashboard (after login) */
  if (view === 'dashboard' && user) {
    return (
      <CandidateDashboard
        user={user}
        onLogout={handleCandidateLogout}
        onGoToCareers={() => setView('jobs')}
      />
    );
  }

  /* CANDIDATE — Application Wizard */
  if (view === 'apply' && selectedJob && user) {
    return (
      <ApplicationWizard
        job={selectedJob}
        user={user}
        onClose={handleWizardClose}
        onSuccess={handleWizardSuccess}
      />
    );
  }

  /* CANDIDATE PORTAL — Job List (with auth/modal overlays) */
  return (
    <>
      <JobListPage
        onApply={handleApply}
        onAdminSwitch={switchToAdmin}
        onDashboard={handleViewDashboard}
        user={user}
      />

      {view === 'auth' && (
        <AuthModal
          onClose={handleAuthClose}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}
