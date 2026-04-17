import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import UploadForm from './pages/UploadForm';
import UploadDocs from './pages/UploadDocs';
import Extract from './pages/Extract';
import Validate from './pages/Validate';
import OnboardingForm from './pages/OnboardingForm';

// Components
import Layout from './components/Layout';

const API = '/api/v1';

export default function App() {
  const [user, setUser] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);
  
  // Ephemeral State
  const [formFile, setFormFile] = useState(null);
  const [docFiles, setDocFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  
  // Streaming state
  const [extractLogs, setExtractLogs] = useState([]);

  const navigate = useNavigate();

  useEffect(() => { 
    const s = localStorage.getItem('og_user'); 
    if (s) {
      setUser(JSON.parse(s)); 
    }
  }, []);

  useEffect(() => { 
    if (user) { 
      localStorage.setItem('og_user', JSON.stringify(user)); 
      refresh(); 
    } 
  }, [user]);

  const logout = () => {
    localStorage.removeItem('og_user');
    setUser(null);
  };

  const show = (msg, type = 'success') => setToast({ msg, type });
  const refresh = () => fetch(`${API}/candidates`).then(r => r.json()).then(d => setCandidates(d.candidates || []));
  const load = async (id) => { const r = await fetch(`${API}/candidate/${id}`); if (r.ok) setSelected(await r.json()); };

  const triggerDelete = (candidate) => {
    setCandidateToDelete(candidate);
  };

  const confirmDelete = async () => {
    if (!candidateToDelete) return;
    setLoading(true);
    const r = await fetch(`${API}/candidate/${candidateToDelete.id}`, { method: 'DELETE' });
    if (r.ok) { 
      show('Candidate deleted successfully'); 
      if(selected?.id === candidateToDelete.id) setSelected(null); 
      refresh(); 
    }
    setCandidateToDelete(null);
    setLoading(false);
  };

  const uploadForm = async () => {
    if (!formFile) return show('Please select a file first', 'error');
    setLoading(true);
    const fd = new FormData(); fd.append('form_file', formFile);
    const r = await fetch(`${API}/onboarding/upload`, { method: 'POST', body: fd });
    const d = await r.json();
    if (r.ok) { 
      show(`Uploaded successfully: ${d.candidates?.filter(c => c.status === 'created').length || 0} candidates added.`); 
      setFormFile(null); 
      refresh(); 
      navigate('/candidates');
    } else {
      show(d.detail || 'Upload Failed', 'error');
    }
    setLoading(false);
  };

  const uploadDocs = async () => {
    if (!selected) return show('Please select a candidate first', 'error');
    if (!Object.values(docFiles).some(f => f)) return show('No documents provided', 'error');
    setLoading(true);
    const fd = new FormData();
    Object.entries(docFiles).forEach(([k, f]) => f && fd.append(k, f));
    const r = await fetch(`${API}/documents/${selected.id}`, { method: 'POST', body: fd });
    if (r.ok) { 
      show('Documents securely uploaded'); 
      setDocFiles({}); 
      refresh(); 
      load(selected.id); 
      navigate('/extract');
    } else {
      show('Upload Failed', 'error');
    }
    setLoading(false);
  };

  const extract = async () => {
    if (!selected) return show('Please select a candidate', 'error');
    setLoading(true);
    setExtractLogs([]);
    show('Starting data extraction...', 'info');
    
    try {
      const response = await fetch(`${API}/extract/${selected.id}`, { method: 'POST' });
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let extractionDone = false;
      let finalData = null;

      while (!extractionDone) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'log') {
                setExtractLogs(prev => [...prev, data.message]);
              } else if (data.type === 'stream') {
                // Stream chunks are ignored in logs to prevent spam, or we could aggregate them. Let's append to last log
                setExtractLogs(prev => {
                  const arr = [...prev];
                  if (arr.length > 0 && !arr[arr.length - 1].startsWith('>')) {
                    arr[arr.length - 1] += data.message;
                  } else {
                    arr.push(data.message);
                  }
                  return arr;
                });
              } else if (data.type === 'result') {
                finalData = data;
                extractionDone = true;
              } else if (data.type === 'error') {
                show(data.message || 'Extraction Failed', 'error');
                extractionDone = true;
              }
            } catch (e) {
               console.log("Error parsing SSE:", dataStr);
               // Simple text stream
               setExtractLogs(prev => [...prev, dataStr]);
            }
          }
        }
      }
      
      if (finalData) {
        show(`Extraction complete for ${finalData.sources_extracted?.length || 0} documents`); 
        refresh(); 
        await load(selected.id); 
        navigate('/validate');
      }
    } catch (e) {
       show(e.message || 'Extraction Failed', 'error');
    }
    
    setLoading(false);
  };

  const validate = async () => {
    if (!selected) return show('Please select a candidate', 'error');
    setLoading(true);
    show('Running validation...', 'info');
    const r = await fetch(`${API}/validate/${selected.id}`, { method: 'POST' });
    const d = await r.json();
    if (r.ok) { 
      show(`Validation Complete. Match Score: ${d.summary?.overall_score || 0}%`); 
      refresh(); 
      load(selected.id); 
    } else {
      show(d.detail || 'Validation Failed', 'error');
    }
    setLoading(false);
  };

  if (!user) return <Login onLogin={setUser} />;

  const contextProps = {
    candidates, selected, setSelected, load, refresh, show, loading, setLoading,
    triggerDelete, uploadForm, uploadDocs, extract, validate,
    formFile, setFormFile, docFiles, setDocFiles,
    extractLogs
  };

  return (
    <Routes>
      <Route path="/" element={<Layout 
          user={user} 
          logout={logout} 
          toast={toast} 
          setToast={setToast}
          candidateToDelete={candidateToDelete}
          setCandidateToDelete={setCandidateToDelete}
          confirmDelete={confirmDelete}
          contextProps={contextProps}
        />}>
        <Route index element={<Dashboard />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="onboarding" element={<OnboardingForm show={show} />} />
        <Route path="form" element={<UploadForm />} />
        <Route path="docs" element={<UploadDocs />} />
        <Route path="extract" element={<Extract />} />
        <Route path="validate" element={<Validate />} />
      </Route>
    </Routes>
  );
}
