import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import Toast from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';
import DocumentViewerModal from '../components/DocumentViewerModal';

const NAV_ITEMS = [
  { id: '',         icon: '⬡',  label: 'Dashboard',        desc: 'Overview & metrics' },
  { id: 'candidates', icon: '◈', label: 'Candidates',      desc: 'All onboarding profiles' },
  { id: 'form',     icon: '⊞',  label: 'Upload CSV',       desc: 'Import candidate batch' },
  { id: 'docs',     icon: '⊟',  label: 'Upload Documents', desc: 'Identity & education docs' },
  { id: 'validate', icon: '◎',  label: 'Validate',         desc: 'Compliance verification' },
];

const Layout = ({ user, logout, toast, setToast, candidateToDelete, setCandidateToDelete, confirmDelete, contextProps }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020811', fontFamily: "'Outfit', sans-serif", color: '#e8f0fe', position: 'relative', overflow: 'hidden' }}>

      {/* ── Ambient Grid ── */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(0,229,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.02) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,229,255,0.06) 0%,transparent 70%)', top: -200, right: -100, filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)', bottom: -200, left: -100, filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Toast / Modals ── */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <ConfirmationModal
        isOpen={!!candidateToDelete}
        title="Purge Candidate Profile"
        message={`Permanently delete all data for ${candidateToDelete?.full_name}? This includes documents, extraction data, and validation scores. This action is irreversible.`}
        onConfirm={confirmDelete}
        onCancel={() => setCandidateToDelete(null)}
      />
      <DocumentViewerModal file={contextProps.previewFile} onClose={() => contextProps.setPreviewFile(null)} />

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 72 : 260,
        background: 'rgba(5,14,26,0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(0,229,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 20,
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: collapsed ? '20px 16px' : '20px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', minHeight: 72, gap: 12 }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/admin-portal')}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🛡️</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#e8f0fe', letterSpacing: '-0.3px' }}>OnboardGuard</div>
                <div style={{ fontSize: 9, color: '#10b981', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.12em', marginTop: 1 }}>COMPLIANCE ENGINE</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' }} onClick={() => navigate('/admin-portal')}>🛡️</div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', flexShrink: 0, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; e.currentTarget.style.color = '#00e5ff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#64748b'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', overflowX: 'hidden' }}>
          {!collapsed && (
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: '#334155', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '4px 10px 8px', marginBottom: 4 }}>Navigation</div>
          )}
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.id}
              to={`/onboarding/${item.id}`}
              end={item.id === ''}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '11px 0' : '11px 14px',
                borderRadius: '2px 10px 10px 2px',
                textDecoration: 'none',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid #10b981' : '3px solid transparent',
                borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                color: isActive ? '#10b981' : '#64748b',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                position: 'relative',
                boxShadow: isActive ? 'inset 0 0 20px rgba(16,185,129,0.04)' : 'none',
              })}
              onMouseEnter={e => { if (!e.currentTarget.style.background.includes('0.12')) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}}
              onMouseLeave={e => { if (!e.currentTarget.style.background.includes('0.12')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0, fontFamily: 'monospace' }}>{item.icon}</span>
              {!collapsed && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>{item.desc}</div>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Extraction Status Note */}
        {!collapsed && (
          <div style={{ margin: '0 10px 12px', padding: '10px 12px', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: 10 }}>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: '#00e5ff', letterSpacing: '0.12em', marginBottom: 4 }}>⚡ AUTO EXTRACTION</div>
            <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.5 }}>Extraction & KB indexing triggers automatically on document upload.</div>
          </div>
        )}

        {/* User Footer */}
        <div style={{ padding: collapsed ? '16px 10px' : '16px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {firstName[0]?.toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f0fe', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Admin'}</div>
              <button onClick={logout} style={{ fontSize: 10, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Outfit',sans-serif", transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#f43f5e'}
                onMouseLeave={e => e.target.style.color = '#475569'}
              >Sign out →</button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 10, height: '100vh' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>
          {/* Pipeline Stepper */}
          {['/onboarding/form', '/onboarding/docs', '/onboarding/validate'].some(p => location.pathname.startsWith(p)) && (() => {
            const steps = [
              { path: '/onboarding/form', label: 'Import CSV' },
              { path: '/onboarding/docs', label: 'Documents & Extract' },
              { path: '/onboarding/validate', label: 'Validate' },
            ];
            const currentIdx = steps.findIndex(s => location.pathname.startsWith(s.path));
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {steps.map((step, i) => {
                  const active = i === currentIdx;
                  const done = i < currentIdx;
                  const col = active ? '#10b981' : done ? '#10b981' : '#1e293b';
                  return (
                    <React.Fragment key={step.path}>
                      {i > 0 && <div style={{ flex: 1, height: 1, background: done ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.04)', maxWidth: 80, margin: '0 4px' }} />}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: active ? 'rgba(16,185,129,0.18)' : done ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? '#10b981' : done ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: col, transition: 'all 0.3s', boxShadow: active ? '0 0 12px rgba(16,185,129,0.25)' : 'none' }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? '#10b981' : done ? '#64748b' : '#1e293b', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', transition: 'all 0.3s' }}>{step.label}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })()}
          <div key={location.pathname} style={{ animation: 'enterUp 0.35s cubic-bezier(0.4,0,0.2,1) forwards' }}>
            <Outlet context={contextProps} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
