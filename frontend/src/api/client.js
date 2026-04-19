import axios from 'axios';

// Single backend entry point — all modules route through port 8000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const OG_API      = import.meta.env.VITE_OG_API_PREFIX || '/api/v1';

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
    startInterview: async () => {
        const response = await api.post('/user/interview/start');
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

/**
 * blobAPI — backed by local filesystem via the /blob/url compatibility shim.
 * Returns { url: "http://localhost:8000/files/{container}/{path}" }
 * which FastAPI serves directly (no Azure dependency).
 */
export const blobAPI = {
    getUrl: async (container, blobPath) => {
        const response = await api.get('/blob/url', {
            params: { container, blob_path: blobPath }
        });
        return response.data;
    }
};

/**
 * onboardAPI — covers all /api/v1/* routes:
 *   - OnboardGuard validation endpoints
 *   - Hetero extraction (candidate_routes)
 *   - Auth for onboarding module
 */
export const onboardAPI = {
    // Candidates
    getCandidates: async () => {
        const r = await api.get(`${OG_API}/candidates`);
        return r.data;
    },
    getCandidate: async (id) => {
        const r = await api.get(`${OG_API}/candidate/${id}`);
        return r.data;
    },
    deleteCandidate: async (id) => {
        const r = await api.delete(`${OG_API}/candidate/${id}`);
        return r.data;
    },
    // Upload onboarding form CSV
    uploadForm: async (file) => {
        const fd = new FormData();
        fd.append('form_file', file);
        const r = await api.post(`${OG_API}/onboarding/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        return r.data;
    },
    // Upload documents for a candidate
    uploadDocuments: async (candidateId, docFiles) => {
        const fd = new FormData();
        Object.entries(docFiles).forEach(([k, f]) => f && fd.append(k, f));
        const r = await api.post(`${OG_API}/documents/${candidateId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        return r.data;
    },
    // Streaming extraction via SSE
    extractUrl: (candidateId) => `${API_BASE_URL}${OG_API}/extract/${candidateId}`,
    // Validate
    validate: async (candidateId) => {
        const r = await api.post(`${OG_API}/validate/${candidateId}`);
        return r.data;
    },
    // Resolve ambiguous field
    resolve: async (candidateId, field, resolution) => {
        const r = await api.post(`${OG_API}/resolve/${candidateId}`, { field, resolution });
        return r.data;
    },
    // Redacted document URL
    redactedDocUrl: (candidateId, docName) => `${API_BASE_URL}${OG_API}/documents/${candidateId}/${docName}/redacted`,
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
    },
    uploadVideoChunk: async (interviewId, chunk, chunkIndex) => {
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunk_index', chunkIndex);
        const response = await api.post(`/interview/${interviewId}/video-chunk`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};

export default api;