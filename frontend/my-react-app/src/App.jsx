import { useState } from 'react';
import JobListPage from './components/JobList/JobListPage';
import AuthModal from './components/Auth/AuthModal';
import ApplicationWizard from './components/Application/ApplicationWizard';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';

/*
  App-level routing (state-based, no react-router):

  portalMode: 'candidate' | 'admin'

  Candidate flow:
    view: 'jobs'  →  JobListPage
    view: 'auth'  →  AuthModal (login / register)
    view: 'apply' →  ApplicationWizard (3-step)

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
  const [user,        setUser]        = useState(null);

  // Admin state
  const [adminView,   setAdminView]   = useState('login'); // 'login' | 'dashboard'
  const [adminUser,   setAdminUser]   = useState(null);

  /* ── Candidate Handlers ── */
  const handleApply = (job) => {
    setSelectedJob(job);
    setView(user ? 'apply' : 'auth');
  };
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setView('apply');
  };
  const handleAuthClose  = () => { setView('jobs'); setSelectedJob(null); };
  const handleWizardClose = () => { setView('jobs'); setSelectedJob(null); };

  /* ── Admin Handlers ── */
  const handleAdminLogin  = (a) => { setAdminUser(a);  setAdminView('dashboard'); };
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
    return (
      <AdminDashboard admin={adminUser} onLogout={handleAdminLogout} />
    );
  }

  /* CANDIDATE PORTAL */
  return (
    <>
      <JobListPage onApply={handleApply} onAdminSwitch={switchToAdmin} />

      {view === 'auth' && (
        <AuthModal
          onClose={handleAuthClose}
          onSuccess={handleAuthSuccess}
        />
      )}

      {view === 'apply' && selectedJob && (
        <ApplicationWizard
          job={selectedJob}
          user={user}
          onClose={handleWizardClose}
        />
      )}
    </>
  );
}
