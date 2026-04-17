import { useState } from 'react';
import sigmoidLogo from '../../assets/sigmoid_logo.jpeg';
import './AuthModal.css';

export default function AuthModal({ onClose, onSuccess }) {
  const [tab, setTab] = useState('login');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData, setRegData] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    const errs = {};
    if (!loginData.email) errs.email = 'Email is required';
    if (!loginData.password) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onSuccess({ name: loginData.email.split('@')[0] }); }, 1000);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const errs = {};
    if (!regData.name) errs.name = 'Full name is required';
    if (!regData.email) errs.email = 'Email is required';
    if (!regData.password || regData.password.length < 6) errs.password = 'Min 6 characters';
    if (regData.password !== regData.confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onSuccess({ name: regData.name }); }, 1000);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target.classList.contains('modal-backdrop') && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true">
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Logo */}
        <div className="modal-logo">
          <img src={sigmoidLogo} alt="Sigmoid" className="modal-logo-img" />
          <span className="sigmoid-text-sm">SIGMOID</span>
        </div>

        <h2 className="modal-title">Your next career move starts here</h2>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            id="tab-login"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setErrors({}); }}
          >Sign In</button>
          <button
            id="tab-register"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setErrors({}); }}
          >Create Account</button>
        </div>

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="auth-form" id="login-form">
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={loginData.email}
                onChange={e => setLoginData({ ...loginData, email: e.target.value })}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            <div className="forgot-link"><a href="#">Forgot password?</a></div>
            <button type="submit" className="btn-primary full-width" disabled={loading} id="btn-login">
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="auth-form" id="register-form">
            <div className="form-group">
              <label htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                placeholder="John Doe"
                value={regData.name}
                onChange={e => setRegData({ ...regData, name: e.target.value })}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="reg-email">Email Address</label>
              <input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                value={regData.email}
                onChange={e => setRegData({ ...regData, email: e.target.value })}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={regData.password}
                  onChange={e => setRegData({ ...regData, password: e.target.value })}
                />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="reg-confirm">Confirm Password</label>
                <input
                  id="reg-confirm"
                  type="password"
                  placeholder="Repeat password"
                  value={regData.confirm}
                  onChange={e => setRegData({ ...regData, confirm: e.target.value })}
                />
                {errors.confirm && <span className="field-error">{errors.confirm}</span>}
              </div>
            </div>
            <button type="submit" className="btn-primary full-width" disabled={loading} id="btn-register">
              {loading ? <span className="spinner" /> : 'Create Account & Continue'}
            </button>
          </form>
        )}

        <p className="modal-footer-note">
          By continuing, you agree to Sigmoid's{' '}
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
