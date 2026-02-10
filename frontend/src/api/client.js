import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authAPI = {
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    getMe: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },
};

export const userAPI = {
    getDashboard: async () => {
        const response = await api.get('/user/dashboard');
        return response.data;
    },
};

export const adminAPI = {
    getDashboard: async () => {
        const response = await api.get('/admin/dashboard');
        return response.data;
    },
    uploadJD: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/admin/jd/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    getJD: async () => {
        const response = await api.get('/admin/jd');
        return response.data;
    },
    deleteJD: async (jobId) => {
        const response = await api.delete(`/admin/job-descriptions/${jobId}`);
        return response.data;
    },
    getCandidates: async () => {
        const response = await api.get('/admin/candidates');
        return response.data;
    },
    shortlistCandidate: async (candidateId, decision) => {
        const response = await api.post(`/admin/candidates/${candidateId}/shortlist`, { decision });
        return response.data;
    },
    startInterview: async (candidateId, resumeId) => {
        const url = resumeId
            ? `/admin/interview/start/${candidateId}?resume_id=${resumeId}`
            : `/admin/interview/start/${candidateId}`;
        const response = await api.post(url);
        return response.data;
    },
    deleteCandidate: async (candidateId) => {
        const response = await api.delete(`/admin/candidates/${candidateId}`);
        return response.data;
    }
};

export const blobAPI = {
    getUrl: async (container, blobPath) => {
        const response = await api.get('/blob/url', {
            params: { container, blob_path: blobPath }
        });
        return response.data;
    }
};

userAPI.uploadResume = async (file, jobId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (jobId) {
        formData.append('job_id', jobId);
    }
    const response = await api.post('/user/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

userAPI.getJDs = async () => {
    const response = await api.get('/user/jds');
    return response.data;
};

userAPI.getActiveJD = async () => {
    const response = await api.get('/user/jd');
    return response.data;
};

userAPI.getResumeStatus = async () => {
    const response = await api.get('/user/resume/status');
    return response.data;
};

userAPI.getInterviewStatus = async () => {
    const response = await api.get('/user/interview/status');
    return response.data;
};

export const interviewAPI = {
    getQuestion: async (interviewId) => {
        const response = await api.get(`/interview/${interviewId}/question`);
        return response.data;
    },
    submitAnswer: async (interviewId, audioFile, submissionType) => {
        const formData = new FormData();
        if (audioFile) {
            formData.append('audio_file', audioFile);
        }
        formData.append('submission_type', submissionType);
        const response = await api.post(`/interview/${interviewId}/answer`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    sendVideoFrame: async (interviewId, frameB64) => {
        const response = await api.post(`/interview/${interviewId}/video-frame`, { frame: frameB64 });
        return response.data;
    },
    reportEvent: async (interviewId, eventType) => {
        const response = await api.post(`/interview/${interviewId}/event`, { event_type: eventType });
        return response.data;
    },
    endInterview: async (interviewId, audioFile) => {
        const formData = new FormData();
        if (audioFile) {
            formData.append('audio_file', audioFile);
        }
        const response = await api.post(`/interview/${interviewId}/end`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};

export default api;
