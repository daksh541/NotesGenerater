import axios from 'axios';
import {
    AcademicCatalog,
    AuthSessionResponse,
    CommunityReview,
    DashboardMetrics,
    FlashcardItem,
    MasterNoteContent,
    MCQQuestion,
    NoteSection,
    NotificationItem,
    ProcessingPipelineJob,
    ProfessorProfile,
    SectionComparisonResult,
    SectionId,
    SectionVaultNote,
    SmartDiagram,
    SourceMaterialType,
    StorageBucketType,
    StudyKit,
    SubjectModel,
    UploadedSourceItem,
    UserProfile,
    VisibilityType,
    WorkspaceModel,
    WorkspaceStatus,
} from '../types/lectra';

const API_BASE = '/api/lectra';
const SESSION_STORAGE_KEY = 'lectra_auth_session_v2';

export interface StoredSession {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
    user: UserProfile;
}

type SessionExpiredCallback = () => void;
let sessionExpiredListener: SessionExpiredCallback | null = null;

const http = axios.create({
    baseURL: API_BASE,
});

http.interceptors.request.use((config) => {
    try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
            const parsed: StoredSession = JSON.parse(raw);
            if (parsed?.access_token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${parsed.access_token}`;
            }
        }
    } catch {
        // Ignore storage read errors
    }
    return config;
});

http.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            const url: string = error?.config?.url || '';
            if (!url.includes('/auth/login') && !url.includes('/auth/signup') && !url.includes('/auth/register')) {
                try {
                    localStorage.removeItem(SESSION_STORAGE_KEY);
                } catch {
                    // ignore
                }
                if (sessionExpiredListener) {
                    sessionExpiredListener();
                }
            }
        }
        return Promise.reject(error);
    }
);

export const lectraApi = {
    // Session Persistence Helpers
    getStoredSession(): StoredSession | null {
        try {
            const raw = localStorage.getItem(SESSION_STORAGE_KEY);
            if (!raw) return null;
            const parsed: StoredSession = JSON.parse(raw);
            if (parsed.expires_at && parsed.expires_at * 1000 < Date.now()) {
                localStorage.removeItem(SESSION_STORAGE_KEY);
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    },

    saveSession(data: AuthSessionResponse | StoredSession): void {
        try {
            const toSave: StoredSession = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: data.expires_at,
                user: data.user,
            };
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(toSave));
        } catch {
            // ignore
        }
    },

    clearSession(): void {
        try {
            localStorage.removeItem(SESSION_STORAGE_KEY);
        } catch {
            // ignore
        }
    },

    onSessionExpired(cb: SessionExpiredCallback): void {
        sessionExpiredListener = cb;
    },

    // Academic Catalog (Universities, Courses, Subjects, Professors, Chapters, Sections A-I)
    async getCatalog(params?: {
        university_id?: string;
        course_id?: string;
        subject_id?: string;
    }): Promise<AcademicCatalog> {
        const res = await http.get('/catalog', { params });
        return res.data;
    },

    // Dashboard (with Search & Filters)
    async getDashboard(params?: {
        section?: string;
        subject_code?: string;
        search?: string;
    }): Promise<{
        metrics: DashboardMetrics;
        workspaces?: WorkspaceModel[];
        subjects: SubjectModel[];
        recent_master_notes: MasterNoteContent[];
        professors: ProfessorProfile[];
        upload_history?: UploadedSourceItem[];
        user_profile?: UserProfile;
    }> {
        const res = await http.get('/dashboard', { params });
        return res.data;
    },

    // Workspaces & Subjects
    async listWorkspaces(params?: {
        subject_id?: string;
        section?: string;
        status?: string;
        search?: string;
        include_shared?: boolean;
    }): Promise<WorkspaceModel[]> {
        const res = await http.get('/workspaces', { params });
        return res.data;
    },

    async getWorkspace(workspaceId: string): Promise<{
        workspace: WorkspaceModel;
        sources: UploadedSourceItem[];
    }> {
        const res = await http.get(`/workspaces/${workspaceId}`);
        return res.data;
    },

    async createWorkspace(data: {
        name?: string;
        title?: string;
        subject_id?: string;
        chapter_id?: string;
        professor_id?: string;
        section?: SectionId;
        lecture_date?: string;
        status?: WorkspaceStatus;
        visibility?: VisibilityType;
        university?: string;
        department?: string;
        semester?: string;
        description?: string;
        subject_name?: string;
        subject_code?: string;
        professor_name?: string;
    }): Promise<{ message: string; workspace: WorkspaceModel; subject?: SubjectModel }> {
        const res = await http.post('/workspaces', data);
        return res.data;
    },

    async updateWorkspace(
        workspaceId: string,
        data: Partial<WorkspaceModel>
    ): Promise<{ message: string; workspace: WorkspaceModel }> {
        const res = await http.put(`/workspaces/${workspaceId}`, data);
        return res.data;
    },

    async deleteWorkspace(workspaceId: string): Promise<{ message: string }> {
        const res = await http.delete(`/workspaces/${workspaceId}`);
        return res.data;
    },

    async createSubject(data: {
        name: string;
        code: string;
        teacher: string;
        workspace_id?: string;
        course_id?: string;
        semester?: string;
        description?: string;
        color?: string;
    }): Promise<{ message: string; subject: SubjectModel }> {
        const res = await http.post('/subjects', data);
        return res.data;
    },

    // Supabase Storage Buckets, Upload, Signed URLs & Upload History
    async listStorageBuckets(): Promise<{
        buckets: { id: StorageBucketType; name: string; public: boolean; max_size_mb: number }[];
    }> {
        const res = await http.get('/storage/buckets');
        return res.data;
    },

    async uploadToStorageBucket(params: {
        file: File;
        workspace_id?: string;
        bucket?: StorageBucketType;
        source_type?: SourceMaterialType;
        visibility?: VisibilityType;
        onUploadProgress?: (percent: number) => void;
    }): Promise<{
        message: string;
        source: UploadedSourceItem;
        signed_url: string;
        expires_at: number;
    }> {
        const formData = new FormData();
        formData.append('file', params.file);
        formData.append('workspace_id', params.workspace_id || 'ws_main');
        formData.append('bucket', params.bucket || 'private-student-uploads');
        formData.append('source_type', params.source_type || 'whiteboard');
        formData.append('visibility', params.visibility || 'private');

        const res = await http.post('/storage/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (evt) => {
                if (params.onUploadProgress && evt.total) {
                    params.onUploadProgress(Math.round((evt.loaded * 100) / evt.total));
                }
            },
        });
        return res.data;
    },

    async createSignedUrl(
        bucket: StorageBucketType,
        storagePath: string,
        expiresIn: number = 3600
    ): Promise<{
        signed_url: string;
        bucket: string;
        storage_path: string;
        expires_at: number;
    }> {
        const res = await http.post('/storage/signed-url', {
            bucket,
            storage_path: storagePath,
            expires_in: expiresIn,
        });
        return res.data;
    },

    async listUploadedSources(params?: {
        workspace_id?: string;
        source_type?: string;
        bucket_id?: string;
        search?: string;
        include_shared?: boolean;
    }): Promise<UploadedSourceItem[]> {
        const res = await http.get('/sources', { params });
        return res.data;
    },

    async deleteUploadedSource(sourceId: string): Promise<{ message: string }> {
        const res = await http.delete(`/sources/${sourceId}`);
        return res.data;
    },

    // The Nine-Section Vault
    async getVaultNotes(params?: {
        section?: string;
        subject?: string;
        professor?: string;
        verification_status?: string;
        search?: string;
    }): Promise<{ section_filter: string; total_notes: number; notes: SectionVaultNote[] }> {
        const res = await http.get('/vault', { params });
        return res.data;
    },

    async compareSections(
        subjectCode: string,
        chapter: string,
        sections: string[]
    ): Promise<SectionComparisonResult> {
        const res = await http.get('/vault/compare', {
            params: {
                subject_code: subjectCode,
                chapter,
                sections: sections.join(','),
            },
        });
        return res.data;
    },

    async upvoteVaultNote(vaultNoteId: string): Promise<{ message: string; upvotes: number }> {
        const res = await http.post('/vault/upvote', { vault_note_id: vaultNoteId });
        return res.data;
    },

    async reportVaultNote(
        vaultNoteId: string,
        reason: string,
        reporterName?: string
    ): Promise<{ message: string }> {
        const res = await http.post('/vault/report', {
            vault_note_id: vaultNoteId,
            reason,
            reporter_name: reporterName || 'Student Peer',
        });
        return res.data;
    },

    async shareToVault(data: {
        lecture_id: string;
        title: string;
        chapter: string;
        subject_code: string;
        section: SectionId;
        summary: string;
        visibility?: VisibilityType;
    }): Promise<{ message: string; vault_note: SectionVaultNote }> {
        const res = await http.post('/vault/share', data);
        return res.data;
    },

    // Master Notes
    async listMasterNotes(params?: {
        subject_code?: string;
        section?: string;
        search?: string;
        include_shared?: boolean;
    }): Promise<MasterNoteContent[]> {
        const res = await http.get('/notes', { params });
        return res.data;
    },

    async getMasterNote(lectureId: string): Promise<{
        note: MasterNoteContent;
        diagrams: SmartDiagram[];
        study_kit: StudyKit;
        sources: UploadedSourceItem[];
    }> {
        const res = await http.get(`/notes/${lectureId}`);
        return res.data;
    },

    async updateMasterNote(
        lectureId: string,
        data: {
            title?: string;
            summary?: string;
            user_markdown_override?: string;
            sections?: NoteSection[];
            visibility?: VisibilityType;
        }
    ): Promise<{ message: string; note: MasterNoteContent }> {
        const res = await http.put(`/notes/${lectureId}`, data);
        return res.data;
    },

    async deleteMasterNote(lectureId: string): Promise<{ message: string }> {
        const res = await http.delete(`/notes/${lectureId}`);
        return res.data;
    },

    async regenerateSection(
        lectureId: string,
        sectionIndex: number,
        instruction?: string
    ): Promise<{ message: string; note: MasterNoteContent }> {
        const res = await http.post(`/notes/${lectureId}/regenerate-section`, {
            section_index: sectionIndex,
            instruction,
        });
        return res.data;
    },

    async askNoteQuestion(
        lectureId: string,
        question: string
    ): Promise<{
        question: string;
        answer: string;
        primary_citation: string;
        citations: { source_name: string; source_type: string; quote: string }[];
        grounded: boolean;
        ocr_confidence: number;
    }> {
        const res = await http.post(`/notes/${lectureId}/ask`, { question });
        return res.data;
    },

    // Diagrams
    async getDiagrams(lectureId: string): Promise<SmartDiagram[]> {
        const res = await http.get(`/diagrams/${lectureId}`);
        return res.data;
    },

    async updateDiagram(
        diagramId: string,
        data: { title?: string; mermaid_code: string; diagram_type?: string }
    ): Promise<{ message: string; diagram: SmartDiagram }> {
        const res = await http.put(`/diagrams/${diagramId}`, data);
        return res.data;
    },

    // Study Kits, Flashcards & Quizzes
    async listStudyKits(): Promise<StudyKit[]> {
        const res = await http.get('/study-kits');
        return res.data;
    },

    async listFlashcards(studyKitId?: string): Promise<FlashcardItem[]> {
        const res = await http.get('/flashcards', { params: { study_kit_id: studyKitId } });
        return res.data;
    },

    async listQuizQuestions(studyKitId?: string): Promise<MCQQuestion[]> {
        const res = await http.get('/quiz-questions', { params: { study_kit_id: studyKitId } });
        return res.data;
    },

    async getStudyKit(lectureId: string): Promise<StudyKit> {
        const res = await http.get(`/study-kits/${lectureId}`);
        return res.data;
    },

    async submitQuiz(
        lectureId: string,
        answers: Record<string, number>,
        timeTakenSeconds: number
    ): Promise<{
        score: number;
        total: number;
        percentage: number;
        passed: boolean;
        time_taken_seconds: number;
        topic_performance: Record<string, { correct: number; total: number }>;
        detailed_breakdown: any[];
    }> {
        const res = await http.post(`/study-kits/${lectureId}/quiz-submit`, {
            answers,
            time_taken_seconds: timeTakenSeconds,
        });
        return res.data;
    },

    // Professor Library
    async listProfessors(): Promise<ProfessorProfile[]> {
        const res = await http.get('/professors');
        return res.data;
    },

    async getProfessor(profId: string): Promise<ProfessorProfile> {
        const res = await http.get(`/professors/${profId}`);
        return res.data;
    },

    // Community Reviews
    async listReviews(vaultNoteId: string): Promise<CommunityReview[]> {
        const res = await http.get(`/community/reviews/${vaultNoteId}`);
        return res.data;
    },

    async submitReview(data: {
        vault_note_id: string;
        user_id: string;
        user_name: string;
        user_section: SectionId;
        rating: number;
        comment: string;
    }): Promise<{ message: string; review: CommunityReview }> {
        const res = await http.post('/community/reviews', data);
        return res.data;
    },

    // Notifications & Realtime
    async getNotifications(): Promise<NotificationItem[]> {
        const res = await http.get('/notifications');
        return res.data;
    },

    async markNotificationsRead(): Promise<void> {
        await http.post('/notifications/read');
    },

    async getRealtimeEvents(sinceSeq: number = 0): Promise<{ events: any[] }> {
        const res = await http.get('/realtime/events', { params: { since_seq: sinceSeq } });
        return res.data;
    },

    // Authentication, Onboarding & Profile
    async getProfile(): Promise<UserProfile> {
        const res = await http.get('/auth/profile');
        return res.data;
    },

    async updateProfile(data: Partial<UserProfile>): Promise<{ message: string; user: UserProfile }> {
        const res = await http.put('/auth/profile', data);
        const stored = this.getStoredSession();
        if (stored && res.data?.user) {
            this.saveSession({ ...stored, user: res.data.user });
        }
        return res.data;
    },

    async login(email: string, password: string): Promise<AuthSessionResponse> {
        const res = await http.post('/auth/login', { email, password });
        if (res.data?.access_token) {
            this.saveSession(res.data);
        }
        return res.data;
    },

    async register(data: {
        email: string;
        password: string;
        full_name: string;
        university_id?: string;
        university: string;
        course_id?: string;
        course: string;
        subject_id?: string;
        subject?: string;
        semester?: string;
        section: SectionId;
        onboarding_completed?: boolean;
    }): Promise<AuthSessionResponse> {
        const res = await http.post('/auth/signup', data);
        if (res.data?.access_token) {
            this.saveSession(res.data);
        }
        return res.data;
    },

    async logout(): Promise<void> {
        try {
            await http.post('/auth/logout');
        } catch {
            // Even if server session was already expired, clear local session
        } finally {
            this.clearSession();
        }
    },

    async verifySession(): Promise<{ authenticated: boolean; user: UserProfile; supabase_configured: boolean }> {
        const res = await http.get('/auth/session');
        return res.data;
    },

    async verifyEmail(token: string): Promise<{ message: string; user: UserProfile }> {
        const res = await http.post('/auth/verify-email', { token });
        const stored = this.getStoredSession();
        if (stored && res.data?.user) {
            this.saveSession({ ...stored, user: res.data.user });
        }
        return res.data;
    },

    async resendVerification(email: string): Promise<{ message: string; verification_token: string }> {
        const res = await http.post('/auth/resend-verification', { email });
        return res.data;
    },

    async forgotPassword(email: string): Promise<{ message: string; reset_token: string }> {
        const res = await http.post('/auth/forgot-password', { email });
        return res.data;
    },

    async resetPassword(token: string, newPassword: string): Promise<AuthSessionResponse> {
        const res = await http.post('/auth/reset-password', {
            token,
            new_password: newPassword,
        });
        if (res.data?.access_token) {
            this.saveSession(res.data);
        }
        return res.data;
    },

    async completeOnboarding(data: {
        full_name: string;
        university_id?: string;
        university: string;
        course_id?: string;
        course: string;
        semester: string;
        subject_id?: string;
        subject: string;
        section: SectionId;
    }): Promise<{ message: string; user: UserProfile }> {
        const res = await http.post('/auth/onboarding', data);
        const stored = this.getStoredSession();
        if (stored && res.data?.user) {
            this.saveSession({ ...stored, user: res.data.user });
        }
        return res.data;
    },

    // Studio Process (Upload & 10-stage synthesis)
    async uploadAndProcess(
        formData: FormData,
        onUploadProgress?: (percent: number) => void
    ): Promise<{ lecture_id: string; job_id: string; message: string }> {
        const res = await http.post('/studio/process', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (evt) => {
                if (onUploadProgress && evt.total) {
                    const pct = Math.round((evt.loaded * 100) / evt.total);
                    onUploadProgress(pct);
                }
            },
        });
        return res.data;
    },

    async getPipelineStatus(jobId: string): Promise<ProcessingPipelineJob> {
        const res = await http.get(`/studio/status/${jobId}`);
        return res.data;
    },

    async retryPipelineJob(jobId: string): Promise<{ job_id: string; lecture_id: string; message: string }> {
        const res = await http.post(`/studio/retry/${jobId}`);
        return res.data;
    },

    getSourceFileUrl(sourceId: string, preprocessed: boolean = false): string {
        return `${API_BASE}/sources/${sourceId}/file${preprocessed ? '?preprocessed=true' : ''}`;
    },

    // Export URLs
    getExportUrl(type: 'pdf' | 'docx' | 'markdown', lectureId: string): string {
        return `${API_BASE}/export/${type}/${lectureId}`;
    },
};
