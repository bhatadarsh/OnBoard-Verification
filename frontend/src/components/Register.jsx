import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authAPI.register(formData);
            alert('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
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
            bottom: '-10%',
            left: '-5%',
            width: '60vw',
            height: '60vw',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
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
            padding: '0 8% 80px',
            zIndex: 1,
        },
        layoutWrapper: {
            width: '100%',
            maxWidth: '1100px',
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: '80px',
            alignItems: 'center',
        },
        brandingSide: {
            display: 'flex',
            flexDirection: 'column',
        },
        mainTitle: {
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: '900',
            lineHeight: '1.1',
            letterSpacing: '-2px',
            marginBottom: '24px',
            color: '#ffffff',
        },
        highlight: {
            color: '#818cf8',
        },
        featureList: {
            marginTop: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
        },
        featureItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            fontSize: '16px',
            color: '#94a3b8',
        },
        formSide: {
            background: 'rgba(15, 15, 20, 0.6)',
            backdropFilter: 'blur(30px)',
            padding: '45px',
            borderRadius: '40px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6)',
        },
        inputGroup: {
            marginBottom: '20px',
        },
        label: {
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: '#cbd5e1',
            marginBottom: '8px',
            paddingLeft: '4px',
        },
        input: {
            width: '100%',
            padding: '14px 18px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '15px',
            transition: 'all 0.3s ease',
            boxSizing: 'border-box',
            outline: 'none',
        },
        select: {
            width: '100%',
            padding: '14px 18px',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '15px',
            cursor: 'pointer',
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
            boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.4s ease',
            marginTop: '15px',
        },
        footer: {
            marginTop: '25px',
            textAlign: 'center',
            fontSize: '14px',
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
            padding: '10px',
            borderRadius: '10px',
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.bgGlow}></div>

            <nav style={styles.nav}>
                <div style={styles.logo} onClick={() => navigate('/')}>AI Hire Pro</div>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                    Already joined? <a href="/login" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 'bold' }}>Sign In</a>
                </div>
            </nav>

            <main style={styles.content}>
                <div style={styles.layoutWrapper}>
                    <div style={styles.brandingSide}>
                        <h1 style={styles.mainTitle}>
                            The future of <br />
                            <span style={styles.highlight}>Hiring.</span>
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: '18px', lineHeight: '1.6', marginBottom: '30px' }}>
                            Join thousands of candidates using our advanced AI to find their perfect role.
                            Experience an interview process like never before.
                        </p>

                        <div style={styles.featureList}>
                            <div style={styles.featureItem}>
                                <span style={{ color: '#6366f1', fontSize: '20px' }}>⚡</span>
                                <div><strong>Instant Setup:</strong> Create your profile in seconds.</div>
                            </div>
                            <div style={styles.featureItem}>
                                <span style={{ color: '#6366f1', fontSize: '20px' }}>🛡️</span>
                                <div><strong>Fair Evaluation:</strong> AI-driven, unbiased technical scoring.</div>
                            </div>
                            <div style={styles.featureItem}>
                                <span style={{ color: '#6366f1', fontSize: '20px' }}>📈</span>
                                <div><strong>Detailed Analytics:</strong> In-depth reports on your peak performance.</div>
                            </div>
                        </div>
                    </div>

                    <div style={styles.formSide}>
                        <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-1px' }}>Create Account</h2>
                        <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '32px' }}>Start your journey with us today.</p>

                        {error && <div style={styles.error}>{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                    required
                                    style={styles.input}
                                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="john@example.com"
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
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    style={styles.input}
                                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Your Role</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    style={styles.select}
                                >
                                    <option value="user">Candidate / Job Seeker</option>
                                    <option value="admin">Recruiter / Admin</option>
                                </select>
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
                                {loading ? 'Creating Account...' : 'Get Started'}
                            </button>
                        </form>

                        <p style={styles.footer}>
                            Already have an account?
                            <a href="/login" style={styles.link}>Sign In</a>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
