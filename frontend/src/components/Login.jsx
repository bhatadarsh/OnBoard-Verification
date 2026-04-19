import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await authAPI.login({ email, password });
            localStorage.setItem('token', data.access_token);
            const user = await authAPI.getMe();
            localStorage.setItem('role', user.role);
            localStorage.setItem('userRole', user.role); // Legacy compat
            localStorage.setItem('userName', user.name);

            if (user.role === 'admin') {
                navigate('/admin-portal');
            } else {
                navigate('/user/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            fontFamily: "'Outfit', sans-serif",
            color: '#e8f0fe',
            backgroundColor: '#020811',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
        },
        bgGlow: {
            position: 'absolute',
            top: '-10%',
            right: '-5%',
            width: '60vw',
            height: '60vw',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
            zIndex: 0,
        },
        nav: {
            padding: '20px 8%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
            position: 'relative',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
        },
        logo: {
            fontSize: '20px',
            fontWeight: '900',
            letterSpacing: '-0.5px',
            background: 'linear-gradient(90deg, #00e5ff, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        },
        content: {
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 8% 100px',
            zIndex: 1,
        },
        formWrapper: {
            width: '100%',
            maxWidth: '1000px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '80px',
            alignItems: 'center',
        },
        infoSide: {
            display: 'flex',
            flexDirection: 'column',
        },
        mainTitle: {
            fontSize: 'clamp(40px, 5vw, 72px)',
            fontWeight: '900',
            lineHeight: '1',
            letterSpacing: '-3px',
            marginBottom: '24px',
            color: '#ffffff',
        },
        highlight: {
            color: '#818cf8',
        },
        description: {
            fontSize: '18px',
            color: '#94a3b8',
            lineHeight: '1.6',
            marginBottom: '40px',
        },
        formSide: {
            background: 'rgba(10, 22, 40, 0.85)',
            backdropFilter: 'blur(24px)',
            padding: '50px',
            borderRadius: '28px',
            border: '1px solid rgba(0,229,255,0.1)',
            boxShadow: '0 32px 64px -16px rgba(0,0,0,0.7), 0 0 40px rgba(0,229,255,0.04)',
            animation: 'enterUp 0.5s cubic-bezier(0.4,0,0.2,1) forwards',
        },
        inputGroup: {
            marginBottom: '24px',
        },
        label: {
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#cbd5e1',
            marginBottom: '10px',
        },
        input: {
            width: '100%',
            padding: '14px 18px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: '#e8f0fe',
            fontSize: '14px',
            transition: 'all 0.3s ease',
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: "'Inter', sans-serif",
        },
        button: {
            width: '100%',
            padding: '15px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #00e5ff 0%, #0ea5e9 100%)',
            color: '#020811',
            fontSize: '15px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(0,229,255,0.25)',
            transition: 'all 0.3s ease',
            marginTop: '10px',
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: '0.02em',
        },
        footer: {
            marginTop: '30px',
            textAlign: 'center',
            fontSize: '15px',
            color: '#94a3b8',
        },
        link: {
            color: '#818cf8',
            textDecoration: 'none',
            fontWeight: '600',
            marginLeft: '5px',
        },
        error: {
            color: '#f87171',
            fontSize: '14px',
            textAlign: 'center',
            marginBottom: '20px',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '12px',
            borderRadius: '10px',
        }
    };

    return (
        <div style={styles.container}>
            {/* Grid bg */}
            <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none', zIndex: 0 }} />
            {/* Blobs */}
            <div style={{ position: 'fixed', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)', top: -200, right: -100, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'fixed', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)', bottom: -100, left: -100, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

            <nav style={styles.nav}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #00e5ff, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
                    <span style={styles.logo}>AI HirePro</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#00e5ff', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 5, padding: '2px 7px', letterSpacing: '0.1em' }}>ENTERPRISE</span>
                </div>
                <div style={{ fontSize: '13px', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
                    <span style={{ color: '#10b981' }}>●</span> Systems online
                </div>
            </nav>

            <main style={styles.content}>
                <div style={styles.formWrapper}>
                    <div style={styles.infoSide}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#00e5ff', letterSpacing: '0.2em', marginBottom: 20 }}>// SECURE ACCESS PORTAL</div>
                        <h1 style={styles.mainTitle}>
                            Welcome<br />
                            <span style={{ background: 'linear-gradient(135deg, #00e5ff, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Back.</span>
                        </h1>
                        <p style={styles.description}>
                            Sign in to access your AI-powered interview dashboard,
                            track your results, and get closer to your dream role.
                        </p>

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ padding: '18px', background: 'rgba(0,229,255,0.04)', borderRadius: '16px', border: '1px solid rgba(0,229,255,0.1)', flex: 1 }}>
                                <div style={{ fontSize: '22px', marginBottom: '8px' }}>🎯</div>
                                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px', color: '#e8f0fe' }}>Smart Evaluation</div>
                                <div style={{ fontSize: '11px', color: '#475569' }}>Instant feedback on your technical skills.</div>
                            </div>
                            <div style={{ padding: '18px', background: 'rgba(99,102,241,0.05)', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.15)', flex: 1 }}>
                                <div style={{ fontSize: '22px', marginBottom: '8px' }}>⚡</div>
                                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px', color: '#e8f0fe' }}>Real-time Insights</div>
                                <div style={{ fontSize: '11px', color: '#475569' }}>Understand your peak potential with AI.</div>
                            </div>
                        </div>
                    </div>

                    <div style={styles.formSide}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#475569', marginBottom: 20, letterSpacing: '0.15em' }}>AUTH / SIGN IN</div>
                        <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px', color: '#ffffff', letterSpacing: '-0.5px' }}>Sign In</h2>
                        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '28px' }}>Enter your credentials to continue.</p>

                        {error && <div style={styles.error}>{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    required
                                    style={styles.input}
                                    onFocus={(e) => { e.target.style.borderColor = 'rgba(0,229,255,0.5)'; e.target.style.background = 'rgba(0,229,255,0.04)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={styles.input}
                                    onFocus={(e) => { e.target.style.borderColor = 'rgba(0,229,255,0.5)'; e.target.style.background = 'rgba(0,229,255,0.04)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    ...styles.button,
                                    opacity: loading ? 0.7 : 1,
                                    transform: loading ? 'scale(0.98)' : 'scale(1)'
                                }}
                            >
                                {loading ? 'Authenticating...' : '→ Sign In'}
                            </button>
                        </form>

                        <p style={styles.footer}>
                            Don't have an account?
                            <a href="/register" style={{ color: '#00e5ff', textDecoration: 'none', fontWeight: '700', marginLeft: '5px' }}>Register free</a>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
