import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, requiredRole }) {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    // Not logged in
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Wrong role
    if (requiredRole && role !== requiredRole) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <h2>Access Denied</h2>
                <p>You do not have permission to access this page.</p>
                <p>Required role: {requiredRole}, Your role: {role}</p>
                <button onClick={() => {
                    localStorage.clear();
                    window.location.href = '/login';
                }}>
                    Logout and Login Again
                </button>
            </div>
        );
    }

    return children;
}
