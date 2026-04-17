import { useState } from 'react';
import sigmoidLogo from '../../assets/sigmoid_logo.jpeg';
import './AdminLogin.css';

export default function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    // Simulate admin auth (replace with real API call)
    setTimeout(() => {
      if (form.email === 'admin@sigmoid.com' && form.password === 'admin123') {
        onLogin({ name: 'Admin User', email: form.email, role: 'admin' });
      } else {
        setError('Invalid credentials. Try admin@sigmoid.com / admin123');
        setLoading(false);
      }
    }, 900);
  };

  return (
    <div className="admin-login-root">
      {/* Background pattern */}
      <div className="admin-login-bg" />

      <div className="admin-login-card">
        {/* Logo */}
        <div className="admin-logo">
          <img src={sigmoidLogo} alt="Sigmoid" className="admin-logo-img" />
          <span className="logo-text">SIGMOID</span>
        </div>

        <div className="admin-badge">Admin Portal</div>
        <h1 className="admin-login-title">Sign in to your<br />admin account</h1>
        <p className="admin-login-sub">Manage job postings and applications</p>

        <form onSubmit={handleSubmit} id="admin-login-form" className="admin-form">
          <div className="admin-field">
            <label htmlFor="admin-email">Email Address</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                id="admin-email"
                type="email"
                placeholder="admin@sigmoid.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="admin-password"
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="admin-error" id="admin-login-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" id="btn-admin-login" className="admin-login-btn" disabled={loading}>
            {loading ? (
              <><span className="admin-spinner" /> Signing in...</>
            ) : (
              <>Sign In to Admin →</>
            )}
          </button>
        </form>

        <div className="admin-hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Demo: <strong>admin@sigmoid.com</strong> / <strong>admin123</strong>
        </div>
      </div>
    </div>
  );
}
