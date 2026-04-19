import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';

// AI HirePro Global Pages
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import AdminPortal from './pages/AdminPortal';

// Interview Agent Components
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import InterviewSession from './components/InterviewSession';
import ProtectedRoute from './components/ProtectedRoute';

// OnboardGuard / Extraction Components
import OGDashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import UploadForm from './pages/UploadForm';
import UploadDocs from './pages/UploadDocs';
import Extract from './pages/Extract';
import Validate from './pages/Validate';
import Layout from './components/Layout';
import { onboardAPI } from './api/client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API = `${API_BASE}/api/v1`;

export default function App() {
  const [user, setUser] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);
  
  // Ephemeral State
  const [formFile, setFormFile] = useState(null);
  const [docFiles, setDocFiles] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [extractLogs, setExtractLogs] = useState([]);

  const navigate = useNavigate();

  // OnboardGuard legacy auth compat + Initial Fetch
  useEffect(() => { 
    const s = localStorage.getItem('token'); 
    if (s && !user) {
      setUser({ name: localStorage.getItem('userName') || 'User', token: s }); 
    }
    refresh(); // Load candidates on mount
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('role');
    setUser(null);
    navigate('/');
  };

  const show = (msg, type = 'success') => setToast({ msg, type });
  const refresh = async () => {
    try {
      const d = await onboardAPI.getCandidates();
      setCandidates(d.candidates || []);
    } catch (e) {
      console.error('refresh failed:', e);
    }
  };

  const load = async (id) => {
    try {
      const d = await onboardAPI.getCandidate(id);
      setSelected(d);
    } catch (e) {
      console.error('load failed:', e);
    }
  };

  const triggerDelete = (candidate) => setCandidateToDelete(candidate);

  const confirmDelete = async () => {
    if (!candidateToDelete) return;
    setLoading(true);
    try {
      await onboardAPI.deleteCandidate(candidateToDelete.id);
      show('Candidate deleted successfully'); 
      if(selected?.id === candidateToDelete.id) setSelected(null); 
      await refresh(); 
    } catch (e) {
      show('Delete failed: ' + (e.response?.data?.detail || e.message), 'error');
    }
    setCandidateToDelete(null);
    setLoading(false);
  };

  const uploadForm = async () => {
    if (!formFile) return show('Please select a file first', 'error');
    setLoading(true);
    try {
      const d = await onboardAPI.uploadForm(formFile);
      const added = d.candidates?.filter(c => c.status === 'created').length ?? d.candidates_count ?? 0;
      show(`✓ ${added} candidate${added !== 1 ? 's' : ''} imported successfully`); 
      setFormFile(null); 
      await refresh(); 
      navigate('/onboarding/candidates');
    } catch (e) {
      show('Upload failed: ' + (e.response?.data?.detail || e.message), 'error');
    }
    setLoading(false);
  };

  const uploadDocs = async () => {
    if (!selected) return show('Please select a candidate first', 'error');
    if (!Object.values(docFiles).some(f => f)) return show('No documents provided', 'error');
    setLoading(true);
    try {
      await onboardAPI.uploadDocuments(selected.id, docFiles);
      show('Documents uploaded — building Knowledge Base...', 'info');
      setDocFiles({});
      refresh();
      await load(selected.id);
      // ── Auto-trigger extraction in background ──────────────────────────
      await extractForCandidate(selected.id);
    } catch (e) {
      show('Document upload failed: ' + (e.response?.data?.detail || e.message), 'error');
    }
    setLoading(false);
  };

  // Standalone extract triggered from UploadDocs automatically
  const extractForCandidate = async (candidateId) => {
    if (!candidateId) return;
    setExtractLogs([]);
    navigate('/onboarding/docs'); // stay on docs page, showing progress
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/extract/${candidateId}`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let finalData = null;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.replace('data: ', '').trim();
          if (!raw) continue;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === 'log') setExtractLogs(prev => [...prev, evt.message]);
            else if (evt.type === 'result') { finalData = evt; done = true; }
            else if (evt.type === 'error') { show(evt.message || 'Extraction failed', 'error'); done = true; }
          } catch { setExtractLogs(prev => [...prev, raw]); }
        }
      }
      if (finalData) {
        show(`✓ Knowledge Base built — ${finalData.sources_extracted?.length || 0} documents indexed`, 'success');
        refresh();
        await load(candidateId);
        navigate('/onboarding/validate');
      }
    } catch (e) {
      show(e.message || 'Extraction failed', 'error');
    }
  };

  // Manual extract (kept for direct URL access to /onboarding/extract)
  const extract = async () => {
    if (!selected) return show('Please select a candidate', 'error');
    setLoading(true);
    await extractForCandidate(selected.id);
    setLoading(false);
  };

  const validate = async () => {
    if (!selected) return show('Please select a candidate', 'error');
    setLoading(true);
    show('Running validation...', 'info');
    try {
      const d = await onboardAPI.validate(selected.id);
      show(`Validation Complete. Match Score: ${d.summary?.overall_score || 0}%`); 
      refresh(); 
      load(selected.id); 
    } catch (e) {
      show('Validation Failed: ' + (e.response?.data?.detail || e.message), 'error');
    }
    setLoading(false);
  };

  const contextProps = {
    candidates, selected, setSelected, load, refresh, show, loading, setLoading,
    triggerDelete, uploadForm, uploadDocs, extract, validate,
    formFile, setFormFile, docFiles, setDocFiles,
    extractLogs, previewFile, setPreviewFile
  };

  return (
    <Routes>
      {/* Global Landing & Auth */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login onLogin={(u) => setUser(u)} />} />
      <Route path="/register" element={<Register />} />

      {/* OnboardGuard / Extraction Module */}
      <Route path="/onboarding" element={
        <Layout 
          user={user} 
          logout={logout} 
          toast={toast} 
          setToast={setToast}
          candidateToDelete={candidateToDelete}
          setCandidateToDelete={setCandidateToDelete}
          confirmDelete={confirmDelete}
          contextProps={contextProps}
        />
      }>
        <Route index element={<OGDashboard />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="form" element={<UploadForm />} />
        <Route path="docs" element={<UploadDocs />} />
        <Route path="extract" element={<Extract />} />
        <Route path="validate" element={<Validate />} />
      </Route>

      {/* Interview Agent Module */}
      <Route path="/user/dashboard" element={<ProtectedRoute allowedRoles={['USER']}><UserDashboard /></ProtectedRoute>} />
      <Route path="/admin-portal" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminPortal /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
      
      {/* Note: The session is public or protected by its own ID internally */}
      <Route path="/interview/:interviewId" element={<InterviewSession />} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
