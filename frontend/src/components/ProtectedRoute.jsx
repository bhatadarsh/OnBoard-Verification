import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute — supports both prop conventions used across the codebase:
 *   allowedRoles={['ADMIN']}   (App.jsx convention — array, uppercase)
 *   requiredRole="admin"       (legacy convention — string, lowercase)
 * Role comparison is case-insensitive to survive the merge inconsistency.
 */
export default function ProtectedRoute({ children, allowedRoles, requiredRole }) {
    const token = localStorage.getItem('token');
    const role  = (localStorage.getItem('role') || '').toLowerCase();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Normalise both prop conventions into a single lowercase array
    const allowed = [
        ...(allowedRoles || []),
        ...(requiredRole ? [requiredRole] : []),
    ].map(r => r.toLowerCase());

    if (allowed.length > 0 && !allowed.includes(role)) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '100vh',
                background: '#020811', color: '#e8f0fe', fontFamily: "'Outfit',sans-serif",
                gap: 16,
            }}>
                <div style={{ fontSize: 48 }}>🚫</div>
                <h2 style={{ fontWeight: 900, fontSize: 22, color: '#f43f5e', margin: 0 }}>Access Denied</h2>
                <p style={{ color: '#475569', fontSize: 14 }}>
                    Your role (<strong style={{ color: '#818cf8' }}>{role}</strong>) cannot access this page.
                </p>
                <button
                    onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                    style={{ padding: '10px 24px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 10, color: '#f43f5e', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}
                >
                    Sign Out & Re-login
                </button>
            </div>
        );
    }

    return children;
}
