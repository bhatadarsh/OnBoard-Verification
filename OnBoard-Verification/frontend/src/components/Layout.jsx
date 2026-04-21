import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Toast from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';

const Layout = ({ user, logout, toast, setToast, candidateToDelete, setCandidateToDelete, confirmDelete, contextProps }) => {
  const [sidebar, setSidebar] = useState(true);
  const firstName = user?.name?.split(' ')[0] || 'User';

  const navItems = [
    { id: '', icon: '📊', label: 'Dashboard' },
    { id: 'candidates', icon: '👥', label: 'Candidates List' },
    { id: 'form', icon: '📄', label: '1. Upload CSV Base' },
    { id: 'docs', icon: '📎', label: '2. Upload Documents' },
    { id: 'extract', icon: '🧠', label: '3. Extract Data' },
    { id: 'validate', icon: '✅', label: '4. Run Validation' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-300 relative overflow-hidden">
      <style>{`
        @keyframes ambient {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .anim-blob { animation: ambient 25s infinite alternate ease-in-out; }
        .anim-delay-2000 { animation-delay: 2s; }
        .anim-delay-5000 { animation-delay: 5s; }
      `}</style>
      
      {/* Cybernetic Enterprise Ambient Backgrounds */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none z-0"></div>
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none anim-blob z-0"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none anim-blob anim-delay-5000 z-0"></div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <ConfirmationModal 
        isOpen={!!candidateToDelete} 
        title="Purge Candidate Profile" 
        message={`Are you absolutely certain you wish to purge the data profiling for ${candidateToDelete?.full_name}? This will permanently delete all extracted metrics, scoring, and source files. Action is irreversible.`}
        onConfirm={confirmDelete}
        onCancel={() => setCandidateToDelete(null)}
      />

      {/* Sidebar */}
      <nav className={`${sidebar ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 text-white transition-all duration-300 flex-shrink-0 flex flex-col z-20`}>
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <button onClick={() => setSidebar(!sidebar)} className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {sidebar && <span className="font-bold text-lg tracking-wide">OnboardGuard</span>}
        </div>
        
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map(n => (
            <NavLink 
              key={n.id} 
              to={`/${n.id}`} 
              end={n.id === ''}
              className={({ isActive }) => `w-full flex items-center gap-3 ${sidebar ? 'px-4 py-3' : 'justify-center p-3'} rounded-xl transition-all font-medium text-sm ${isActive ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <span className="text-xl">{n.icon}</span>
              {sidebar && <span>{n.label}</span>}
            </NavLink>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4">
            {user?.picture ? 
              <img src={user.picture} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full border border-slate-700" alt="" /> : 
              <div className="w-10 h-10 bg-slate-800 border border-slate-700 text-slate-300 rounded-full flex items-center justify-center font-bold text-lg">{firstName[0]}</div>
            }
            {sidebar && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email}</div>
              </div>
            )}
          </div>
          {sidebar && (
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign out
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-10 overflow-y-auto relative h-screen z-10 w-full">
        <div className="max-w-6xl mx-auto pb-20 mt-2">
          {/* React Router mounts the current page components here */}
          <Outlet context={contextProps} />
        </div>
      </main>
    </div>
  );
};

export default Layout;
