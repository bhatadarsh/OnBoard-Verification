import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import InterviewSession from './components/InterviewSession';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route
                    path="/admin/*"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <Routes>
                                <Route path="dashboard" element={<AdminDashboard />} />
                                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                            </Routes>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/user/*"
                    element={
                        <ProtectedRoute requiredRole="user">
                            <Routes>
                                <Route path="dashboard" element={<UserDashboard />} />
                                <Route path="interview/:interviewId" element={<InterviewSession />} />
                                <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
                            </Routes>
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
