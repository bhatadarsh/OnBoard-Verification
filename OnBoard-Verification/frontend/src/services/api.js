import axios from 'axios';

const API_URL = "http://localhost:8000/api/v1";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor to add Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const loginWithGoogle = async (googleToken) => {
    const response = await api.post("/auth/login", { token: googleToken });
    if (response.data.access_token) {
        localStorage.setItem("access_token", response.data.access_token);
    }
    return response.data;
};

export const validateOnboarding = async (resumeText, formData) => {
    const response = await api.post("/validate", {
        resume_text: resumeText,
        onboarding_form_data: formData
    });
    return response.data;
};

export default api;
