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

            if (user.role === 'admin') {
                navigate('/admin/dashboard');
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
            color: '#ffffff',
            backgroundColor: '#050505',
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
            padding: '30px 8%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
        },
        logo: {
            fontSize: '24px',
            fontWeight: '900',
            letterSpacing: '-1px',
            background: 'linear-gradient(90deg, #818cf8 0%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            cursor: 'pointer',
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
            background: 'rgba(15, 15, 20, 0.6)',
            backdropFilter: 'blur(20px)',
            padding: '50px',
            borderRadius: '32px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
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
            padding: '16px 20px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            color: '#ffffff',
            fontSize: '15px',
            transition: 'all 0.3s ease',
            boxSizing: 'border-box',
            outline: 'none',
        },
        button: {
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.4s ease',
            marginTop: '10px',
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
            <div style={styles.bgGlow}></div>

            <nav style={styles.nav}>
                <div style={styles.logo} onClick={() => navigate('/')}>AI Hire Pro</div>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                    Support: <span style={{ color: '#ffffff' }}>help@aihirepro.com</span>
                </div>
            </nav>

            <main style={styles.content}>
                <div style={styles.formWrapper}>
                    <div style={styles.infoSide}>
                        <h1 style={styles.mainTitle}>
                            Elevate your <br />
                            <span style={styles.highlight}>Career Path.</span>
                        </h1>
                        <p style={styles.description}>
                            Sign in to access your AI-powered interview dashboard, <br />
                            track your results, and get closer to your dream job.
                        </p>

                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
                                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎯</div>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Smart Evaluation</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>Get instant feedback on your technical skills.</div>
                            </div>
                            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
                                <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚡</div>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Real-time Insights</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>Understand your peak potential with AI.</div>
                            </div>
                        </div>
                    </div>

                    <div style={styles.formSide}>
                        <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Login</h2>
                        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '32px' }}>Welcome back! Please enter your details.</p>

                        {error && <div style={styles.error}>{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    style={styles.input}
                                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
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
                                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
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
                                {loading ? 'Logging in...' : 'Sign In'}
                            </button>
                        </form>

                        <p style={styles.footer}>
                            Don't have an account?
                            <a href="/register" style={styles.link}>Register</a>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
