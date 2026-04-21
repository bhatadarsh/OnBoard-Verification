import React from 'react';
import { loginWithGoogle } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();

    const handleMockLogin = async () => {
        // Simulating Google Token
        try {
            await loginWithGoogle("mock_token");
            navigate("/dashboard");
        } catch (error) {
            alert("Login Failed");
        }
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
            <div style={{ textAlign: "center", padding: "2rem", border: "1px solid #ccc", borderRadius: "8px" }}>
                <h2>Sign In</h2>
                <p>Use your Google Account to access the Validator.</p>
                {/* Real Google Button would go here */}
                <button
                    onClick={handleMockLogin}
                    style={{ padding: "10px 20px", cursor: "pointer", fontSize: "16px" }}
                >
                    Sign in with Google (Dev Mock)
                </button>
            </div>
        </div>
    );
};

export default Login;
