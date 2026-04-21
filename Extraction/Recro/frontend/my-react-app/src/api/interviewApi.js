import axios from 'axios';

// The Intelligence Node handles the real-time AI logic and WebRTC pipelines directly
const AI_ENGINE_URL = 'http://localhost:8003';

const api = axios.create({
    baseURL: AI_ENGINE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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
