import React, { useState, useEffect } from 'react';

const API = '/api/v1';

const Login = ({ onLogin }) => {
  const [googleConfig, setGoogleConfig] = useState(null);
  
  useEffect(() => { 
    fetch(`${API}/auth/google/config`)
      .then(r => r.json())
      .then(setGoogleConfig)
      .catch(() => setGoogleConfig({ configured: false })); 
  }, []);
  
  useEffect(() => {
    if (!googleConfig?.configured) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => setTimeout(() => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({ 
          client_id: googleConfig.client_id, 
          callback: async (r) => { 
            const res = await fetch(`${API}/auth/google/verify`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ token: r.credential }) 
            }); 
            if (res.ok) onLogin(await res.json()); 
          } 
        });
        const btn = document.getElementById('g-btn');
        if (btn) window.google.accounts.id.renderButton(btn, { theme: 'filled_black', size: 'large', width: 280 });
      }
    }, 100);
    document.head.appendChild(script);
  }, [googleConfig, onLogin]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans relative overflow-hidden text-slate-200">
      <style>{`
        @keyframes ambient {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .anim-blob { animation: ambient 25s infinite alternate ease-in-out; }
        .anim-delay-5000 { animation-delay: 5s; }
      `}</style>
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none anim-blob"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none anim-blob anim-delay-5000"></div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-16 max-w-5xl w-full px-8 items-center z-10">
        <div className="animate-in slide-in-from-left-8 duration-700 fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-slate-800 backdrop-blur-md rounded-xl flex items-center justify-center text-3xl shadow-lg border border-slate-700">
              ⚡
            </div>
            <div className="font-bold text-2xl tracking-wide text-slate-100">OnboardGuard</div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight text-white">
            Automated HR Document<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Validation System</span>
          </h1>
          <p className="text-lg text-slate-400 font-light max-w-lg leading-relaxed">
            Verify candidate documents instantly using advanced OCR, Audio Transcription, and LLM matching. Professional, secure, and fully automated.
          </p>
        </div>
        
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700 p-10 rounded-3xl shadow-2xl animate-in slide-in-from-right-8 duration-700 fade-in">
          <div className="w-16 h-16 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl shadow-inner">
            🔐
          </div>
          <h2 className="text-center text-2xl font-bold text-white mb-2">HR Login</h2>
          <p className="text-center text-slate-400 text-sm mb-8">Sign in to manage candidates</p>
          
          {googleConfig?.configured && <div id="g-btn" className="mb-6 flex justify-center"></div>}
          
          <button 
            onClick={() => onLogin({ name: 'HR Admin', email: 'hr@company.com', picture: '' })} 
            className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all shadow-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          >
            Sign in as Demo Admin
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
