import axios from 'axios';
import {
    Citation,
    CrossLectureConnection,
    DiagramArtifact,
    DiagramType,
    Flashcard,
    Lecture,
    LecturePage,
    ProcessingJob,
    ReviewStatus,
    StructuredNote,
    StudyChatMessage,
    Subject,
    TimelineItem,
    User,
    Workspace
} from '../types/stellegent';

import { Capacitor } from '@capacitor/core';

export function getApiBaseUrl(): string {
    const custom = localStorage.getItem('stellegent_api_server_url');
    if (custom) return custom.replace(/\/+$/, '');
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl) return envUrl.replace(/\/+$/, '');
    if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        // Android emulator connects to host machine via 10.0.2.2, iOS simulator uses localhost
        return platform === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api';
    }
    return '/api';
}

export function resolveMediaUrl(rawPath: string): string {
    if (!rawPath) return '';
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('blob:') || rawPath.startsWith('data:')) {
        return rawPath;
    }
    const clean = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    if (Capacitor.isNativePlatform()) {
        const apiBase = getApiBaseUrl();
        const serverOrigin = apiBase.replace(/\/api\/?$/, '');
        return `${serverOrigin}${clean}`;
    }
    return clean;
}

const api = axios.create();

// Attach dynamic baseURL and Authorization Bearer token from localStorage
api.interceptors.request.use((config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('stellegent_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    const currentWs = localStorage.getItem('stellegent_workspace_id');
    if (currentWs) {
        config.headers['X-Workspace-Id'] = currentWs;
    }
    return config;
});

export const stellegentApi = {
    // --- Auth ---
    async register(data: { email: string; password: string; full_name: string; role?: string }) {
        const resp = await api.post('/auth/register', data);
        if (resp.data.access_token) {
            localStorage.setItem('stellegent_token', resp.data.access_token);
            localStorage.setItem('stellegent_workspace_id', resp.data.default_workspace_id);
        }
        return resp.data;
    },

    async login(data: { email: string; password: string }) {
        const resp = await api.post('/auth/login', data);
        if (resp.data.access_token) {
            localStorage.setItem('stellegent_token', resp.data.access_token);
            localStorage.setItem('stellegent_workspace_id', resp.data.default_workspace_id);
        }
        return resp.data;
    },

    async getMe(): Promise<{ id: string; email: string; full_name: string; role: string; workspaces: Workspace[] }> {
        const resp = await api.get('/auth/me');
        return resp.data;
    },

    logout() {
        localStorage.removeItem('stellegent_token');
        localStorage.removeItem('stellegent_workspace_id');
    },

    // --- Subjects ---
    async listSubjects(): Promise<Subject[]> {
        const resp = await api.get('/subjects');
        return resp.data;
    },

    async createSubject(data: { name: string; code?: string; teacher?: string; semester?: string; description?: string; color?: string }): Promise<Subject> {
        const resp = await api.post('/subjects', data);
        return resp.data;
    },

    async deleteSubject(id: string): Promise<void> {
        await api.delete(`/subjects/${id}`);
    },

    // --- Lectures ---
    async uploadLecture(formData: FormData): Promise<{ lecture_id: string; job_id: string; is_duplicate: boolean; lecture: Lecture }> {
        const resp = await api.post('/lectures/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return resp.data;
    },

    async listLectures(params?: { subject_id?: string; teacher?: string; semester?: string; search?: string }): Promise<Lecture[]> {
        const resp = await api.get('/lectures', { params });
        return resp.data;
    },

    async getLectureDetail(lectureId: string): Promise<{
        lecture: Lecture;
        pages: LecturePage[];
        job?: ProcessingJob;
        note?: StructuredNote;
        diagrams: DiagramArtifact[];
        flashcards: Flashcard[];
    }> {
        const resp = await api.get(`/lectures/${lectureId}`);
        return resp.data;
    },

    async getLectureStatus(lectureId: string): Promise<ProcessingJob> {
        const resp = await api.get(`/lectures/${lectureId}/status`);
        return resp.data;
    },

    async retryLecture(lectureId: string, mockPipeline = false): Promise<{ message: string; job_id: string }> {
        const resp = await api.post(`/lectures/${lectureId}/retry${mockPipeline ? '?mock_pipeline=true' : ''}`);
        return resp.data;
    },


    async deleteLecture(lectureId: string): Promise<void> {
        await api.delete(`/lectures/${lectureId}`);
    },

    // --- Notes ---
    async updateNote(lectureId: string, data: { title?: string; summary?: string; user_markdown_override?: string }): Promise<StructuredNote> {
        const resp = await api.put(`/lectures/${lectureId}/note`, data);
        return resp.data;
    },

    // --- Diagrams ---
    async updateDiagram(lectureId: string, diagramId: string, data: { title?: string; mermaid_code: string; diagram_type?: DiagramType }): Promise<DiagramArtifact> {
        const resp = await api.put(`/lectures/${lectureId}/diagrams/${diagramId}`, data);
        return resp.data;
    },

    async regenerateDiagram(lectureId: string, diagramType: DiagramType): Promise<DiagramArtifact> {
        const resp = await api.post(`/lectures/${lectureId}/diagrams/regenerate`, { diagram_type: diagramType });
        return resp.data;
    },

    // --- Flashcards ---
    async listFlashcards(params?: { lecture_id?: string; review_status?: string }): Promise<Flashcard[]> {
        const resp = await api.get('/study/flashcards', { params });
        return resp.data;
    },

    async updateFlashcard(cardId: string, data: { review_status?: ReviewStatus; question?: string; answer?: string; explanation?: string }): Promise<Flashcard> {
        const resp = await api.put(`/study/flashcards/${cardId}`, data);
        return resp.data;
    },

    async deleteFlashcard(cardId: string): Promise<void> {
        await api.delete(`/study/flashcards/${cardId}`);
    },

    // --- Study Assistant ---
    async sendStudyChat(message: string, lectureId?: string): Promise<{ id: string; role: string; content: string; citations: Citation[]; created_at: string }> {
        const resp = await api.post('/study/chat', { message, lecture_id: lectureId });
        return resp.data;
    },

    async getStudyMessages(lectureId?: string): Promise<StudyChatMessage[]> {
        const resp = await api.get('/study/messages', { params: { lecture_id: lectureId } });
        return resp.data;
    },

    // --- Cross-Lecture Connections ---
    async listConnections(): Promise<CrossLectureConnection[]> {
        const resp = await api.get('/study/connections');
        return resp.data;
    },

    // --- Timeline ---
    async getTimeline(): Promise<TimelineItem[]> {
        const resp = await api.get('/study/timeline');
        return resp.data;
    },

    // --- Search ---
    async searchKnowledge(params: {
        q?: string;
        subject_id?: string;
        teacher?: string;
        semester?: string;
        date_from?: string;
        date_to?: string;
        source_type?: string;
    }): Promise<any[]> {
        const resp = await api.get('/study/search', { params });
        return resp.data;
    }
};
