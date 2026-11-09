import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { lectraApi } from './services/lectraApi';
import {
    DashboardMetrics,
    MasterNoteContent,
    NotificationItem,
    ProfessorProfile,
    SectionId,
    SectionVaultNote,
    SmartDiagram,
    StudyKit,
    SubjectModel,
    UploadedSourceItem,
    UserProfile,
    WorkspaceModel,
} from './types/lectra';

import { LectraSidebar, LectraTab, RecentWorkspaceItem } from './components/lectra/LectraSidebar';
import { LectraHeader } from './components/lectra/LectraHeader';
import { DashboardView } from './components/lectra/DashboardView';
import { AINotesStudioView } from './components/lectra/AINotesStudioView';
import { SectionVaultView } from './components/lectra/SectionVaultView';
import { StudyKitsView } from './components/lectra/StudyKitsView';
import { ProfessorLibraryView } from './components/lectra/ProfessorLibraryView';
import { CommunityView } from './components/lectra/CommunityView';
import { MasterNotesView } from './components/lectra/MasterNotesView';
import { SettingsView } from './components/lectra/SettingsView';
import { ProfileView } from './components/lectra/ProfileView';
import { NotificationsView } from './components/lectra/NotificationsView';
import { AuthView } from './components/lectra/AuthView';
import { AuthModal, AuthModalMode } from './components/lectra/AuthModal';
import { NotebookChatView } from './components/lectra/NotebookChatView';

export type Language = 'en' | 'zh';
export const LanguageContext = createContext<{ lang: Language; setLang: (l: Language) => void }>({
    lang: 'en',
    setLang: () => {},
});
export const useLanguage = () => useContext(LanguageContext);

export interface SourceItem {
    id: string;
    kind: string;
    title: string;
    filename?: string;
    status: 'processing' | 'ready' | 'error' | 'deleted';
    error?: string;
    chunk_count: number;
    char_count: number;
    created_at: string;
}

export interface GeneratedContent {
    id: string;
    type: string;
    title: string;
    createdAt?: Date;
    sourceIds?: string[];
    audioUrl?: string | null;
    transcriptUrl?: string | null;
    audioFilename?: string | null;
    transcriptFilename?: string | null;
    transcript?: string;
    markdown?: string;
    payload?: Record<string, any>;
    fileRefs?: Array<Record<string, unknown>>;
    downloadJsonUrl?: string;
    downloadMarkdownUrl?: string;
    downloadSvgUrl?: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
}

export interface ApiConfig {
    textProvider: 'litellm' | 'openai' | 'anthropic' | 'gemini';
    textApiKey: string;
    textApiKeySet: boolean;
    textBaseUrl: string;
    textModel: string;
    textThinking: 'enabled' | 'disabled';
    embeddingProvider: 'openai-compatible';
    embeddingApiKey: string;
    embeddingApiKeySet: boolean;
    embeddingBaseUrl: string;
    embeddingModel: string;
    rerankProvider: 'openai-compatible';
    rerankApiKey: string;
    rerankApiKeySet: boolean;
    rerankBaseUrl: string;
    rerankModel: string;
    speechProvider: 'openai-compatible';
    speechApiKey: string;
    speechApiKeySet: boolean;
    speechBaseUrl: string;
    speechModel: string;
    speechVoice: string;
    speechFormat: string;
    imageProvider: 'openai-compatible';
    imageApiKey: string;
    imageApiKeySet: boolean;
    imageBaseUrl: string;
    imageModel: string;
    imageAdapter: string;
    editProvider: 'openai-compatible';
    editApiKey: string;
    editApiKeySet: boolean;
    editBaseUrl: string;
    editModel: string;
    editAdapter: string;
    theme: 'light' | 'dark';
}

export const translations = {
    en: {
        sources: 'Sources',
        chat: 'Chat',
        studio: 'Studio',
        generatedContent: 'Artifacts',
        searchPlaceholder: 'Search sources...',
        dragDropText: 'Upload files or paste text',
        startChat: 'Start Chat',
        inputPlaceholder: 'Ask about selected sources...',
        noContent: 'No artifacts yet',
        tools: {
            podcast: 'Podcast',
            mindmap: 'Mind Map',
            ppt: 'PPT',
            faq: 'FAQ',
            flashcards: 'Cards',
            report: 'Report',
            table: 'Table',
            video: 'Video',
            infographic: 'Infographic',
        },
        duration: 'Duration',
        generatePodcast: 'Generate Podcast',
        quick: 'Quick',
        standard: 'Standard',
        detailed: 'Detailed',
        deepDive: 'Deep Dive',
    },
    zh: {
        sources: '来源',
        chat: '对话',
        studio: '工作室',
        generatedContent: '生成内容',
        searchPlaceholder: '搜索来源...',
        dragDropText: '上传文件或粘贴文本',
        startChat: '开始对话',
        inputPlaceholder: '基于选中来源提问...',
        noContent: '暂无生成内容',
        tools: {
            podcast: '播客',
            mindmap: '思维导图',
            ppt: 'PPT',
            faq: '常见问题',
            flashcards: '抽认卡',
            report: '研究报告',
            table: '数据表格',
            video: '视频脚本',
            infographic: '信息图表',
        },
        duration: '时长',
        generatePodcast: '生成播客',
        quick: '快速',
        standard: '标准',
        detailed: '详细',
        deepDive: '深度',
    },
};

const FALLBACK_SUBJECTS: SubjectModel[] = [
    {
        id: 'subj_cs244',
        workspace_id: 'ws_main',
        name: 'Distributed Systems & Cloud Computing',
        code: 'CS-244',
        teacher: 'Dr. Aris Thorne',
        professor_id: 'prof_thorne',
        semester: 'Fall 2026',
        description:
            'Consensus algorithms, replication protocols, fault tolerance, Raft, Paxos, and large-scale cloud architectures.',
        color: '#0B132B',
        chapters_count: 8,
        active_sections: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
        created_at: new Date().toISOString(),
    },
    {
        id: 'subj_cs224n',
        workspace_id: 'ws_main',
        name: 'Deep Neural Architectures & Attention',
        code: 'CS-224N',
        teacher: 'Prof. Elena Vance',
        professor_id: 'prof_vance',
        semester: 'Fall 2026',
        description:
            'Transformer models, Multi-Head Self Attention, Vision Transformers, and foundation model pretraining.',
        color: '#312E81',
        chapters_count: 10,
        active_sections: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
        created_at: new Date().toISOString(),
    },
    {
        id: 'subj_cs161',
        workspace_id: 'ws_main',
        name: 'Advanced Algorithms & Optimization',
        code: 'CS-161',
        teacher: 'Dr. Marcus Brody',
        professor_id: 'prof_brody',
        semester: 'Fall 2026',
        description:
            'Divide-and-conquer, graph algorithms, dynamic programming, network flow, and NP-completeness.',
        color: '#4338CA',
        chapters_count: 12,
        active_sections: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
        created_at: new Date().toISOString(),
    },
];

const FALLBACK_PROFESSORS: ProfessorProfile[] = [
    {
        id: 'prof_thorne',
        name: 'Dr. Aris Thorne',
        title: 'Associate Professor',
        department: 'Computer Science & Systems',
        email: 'athorne@stanford.edu',
        avatar_url:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        subjects_taught: ['Distributed Systems & Cloud Computing', 'Operating Systems Architecture'],
        sections_taught: ['A', 'C', 'E'],
        teaching_style:
            'Deep structural proofs, whiteboard consensus state diagrams, emphasizes edge failure modes.',
        exam_focus_topics: [
            'Raft Invariants & Leader Election',
            'Split-Brain Resolution',
            'Byzantine Fault Tolerance',
            'CAP Theorem Trade-offs',
        ],
        preferred_terminology: {
            consensus: 'Distributed State Machine Agreement',
            heartbeat: 'Periodic Leader Liveness Probe',
            term: 'Monotonically Increasing Epoch Identifier',
        },
        formatting_preferences:
            'Always numbers state-machine invariants (I1..In) and draws log index tables.',
        reference_materials_count: 14,
        created_at: new Date().toISOString(),
    },
    {
        id: 'prof_vance',
        name: 'Prof. Elena Vance',
        title: 'Full Professor & Chair',
        department: 'Computer Science & Machine Intelligence',
        email: 'evance@stanford.edu',
        avatar_url:
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        subjects_taught: ['Deep Neural Architectures & Attention', 'Statistical Machine Learning'],
        sections_taught: ['B', 'D', 'F', 'G'],
        teaching_style:
            'Linear algebra geometric intuition, mathematical rigor, detailed forward/backward pass board layouts.',
        exam_focus_topics: [
            'Self-Attention Multi-Head Matrix Derivations',
            'Scaled Dot-Product Numerical Stability',
            'Positional Encodings in High Dimensions',
        ],
        preferred_terminology: {
            query_key_product: 'Bilinear Semantic Alignment Matrix',
            residual_connection: 'Identity Gradient Highway',
            layer_norm: 'Per-Token Feature Normalization',
        },
        formatting_preferences:
            'Detailed tensor shape annotations (e.g. [B, S, H, D]) on all matrix operations.',
        reference_materials_count: 22,
        created_at: new Date().toISOString(),
    },
    {
        id: 'prof_brody',
        name: 'Dr. Marcus Brody',
        title: 'Distinguished Lecturer',
        department: 'Computer Science & Theory',
        email: 'mbrody@stanford.edu',
        avatar_url:
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        subjects_taught: ['Advanced Algorithms & Optimization', 'Discrete Structures'],
        sections_taught: ['H', 'I'],
        teaching_style:
            'Socratic problem reduction, blackboard recursion trees, amortized analysis tables.',
        exam_focus_topics: [
            'Dynamic Programming State Space Compression',
            'Network Flow Minimum Cut Reductions',
            'NP-Completeness 3-SAT Reductions',
        ],
        preferred_terminology: {
            dp_table: 'Optimal Substructure Memoization Lattice',
            reduction: 'Polynomial Time Mapping Transformation',
        },
        formatting_preferences:
            'Requires formal inductive recurrence relations before any pseudocode.',
        reference_materials_count: 18,
        created_at: new Date().toISOString(),
    },
];

const FALLBACK_NOTES: MasterNoteContent[] = [
    {
        id: 'mnote_raft_01',
        lecture_id: 'lec_raft_consensus_01',
        title: 'Raft Consensus Protocol & Distributed State Machine Replication',
        subject_id: 'subj_cs244',
        subject_name: 'Distributed Systems & Cloud Computing',
        subject_code: 'CS-244',
        chapter: 'Chapter 4: Consensus in Fault-Tolerant Clusters',
        professor: 'Dr. Aris Thorne',
        section: 'A',
        source_sections: ['A', 'C'],
        summary:
            "A comprehensive, multi-section master guide synthesizing Dr. Thorne's Section A whiteboard derivations and Section C edge-case clarifications with the official Ongaro & Ousterhout Raft paper.",
        learning_objectives: [
            'Understand Leader Election safety invariants and randomized timer mechanisms.',
            'Derive the Log Matching Property and explain how log conflicts are pruned and overwritten.',
            'Distinguish commit condition in the current term vs older terms (Figure 8 edge case).',
        ],
        sections: [
            {
                heading: '1. Cluster States & Leader Election Mechanics',
                content:
                    'A Raft cluster consists of typically 2F+1 nodes to tolerate F crash failures. Each server exists in one of three mutually exclusive states: Follower, Candidate, or Leader.\n\n• Follower: Responds to RPCs from candidates and leaders. If no heartbeat is received within electionTimeout (randomized between 150ms–300ms), transitions to Candidate.\n• Candidate: Increments currentTerm, votes for itself, and broadcasts RequestVote RPCs to all peers.\n• Leader: Once receiving votes from a strict quorum (majority: floor(N/2)+1), asserts authority by broadcasting AppendEntries heartbeats.',
                subsections: ['Randomized Election Timeout Rationale', 'Quorum Intersection Rule'],
                professor_emphasis:
                    "Dr. Thorne highlighted on Section A board: 'Randomized timers split split-votes before they cascade. Exam question guaranteed on minimum quorum sizes!'",
                is_exam_critical: true,
            },
            {
                heading: '2. Log Replication & The Log Matching Invariant',
                content:
                    'The leader receives client commands, appends them to its local log as uncommitted entries, and issues AppendEntries RPCs.\n\nLog Matching Invariant:\n1. If two entries in different logs have the same index and term, then they store the same command.\n2. If two entries in different logs have the same index and term, then their logs are identical in all preceding entries.',
                subsections: ['prevLogIndex Induction', 'Fast Rollback Optimization'],
                professor_emphasis:
                    "Section C Lecture added: 'On network partition healing, follower overwrites all conflicting entries starting at the first mismatched index.'",
                is_exam_critical: true,
            },
        ],
        key_definitions: [
            {
                term: 'Leader Completeness',
                definition:
                    'If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.',
                context: 'Proof relies on majority overlap between voting and replication quorums.',
                source_citation: 'Ongaro et al., Section 5.4.1',
            },
            {
                term: 'Split-Brain',
                definition:
                    'A state where network partition isolates servers into multiple sub-clusters attempting to independently elect a leader.',
                context: 'Prevented in Raft by requiring a strict majority (floor(N/2)+1).',
                source_citation: 'Section A Whiteboard Diagram',
            },
        ],
        important_formulas: [
            {
                latex_or_text: 'N >= 2F + 1   =>   Quorum = floor(N / 2) + 1',
                explanation:
                    'Determines minimum cluster size N required to tolerate F simultaneous crash faults with majority overlap.',
            },
            {
                latex_or_text: 'ElectionTimeout ~ Uniform(150ms, 300ms)',
                explanation:
                    'Uniform distribution ensures candidate election timers rarely expire in synchrony.',
            },
        ],
        important_examples: [],
        key_takeaways: [
            'Leader election requires strict majority quorum; ties broken by randomized timeouts.',
            'AppendEntries consistency check enforces log matching by backwards inductive verification.',
            'Old term entries cannot be committed directly; they require a current-term majority anchor.',
        ],
        exam_focused_concepts: [],
        needs_verification: [
            {
                item: 'Joint Consensus vs Single-Server Membership Changes',
                reason:
                    'Section A board mentions single-server changes whereas textbook Chapter 4 references Joint Consensus.',
                source_doc: 'Section A Board Photo 3',
            },
        ],
        citations: [
            {
                citation_id: 'cit_1',
                source_name: 'Board_Whiteboard_SectionA_Oct24.jpg',
                source_type: 'Whiteboard Image',
                page_or_region: 'Top-Left Quad',
                quote: 'Strict Quorum = floor(N/2) + 1. Never commit without majority ack!',
                section_tag: 'Section A',
            },
            {
                citation_id: 'cit_2',
                source_name: 'Ongaro_Raft_Paper_Official.pdf',
                source_type: 'Reference PDF',
                page_or_region: 'Page 6, Section 5.3',
                quote: 'Each entry contains a log index and a term number.',
                section_tag: 'Official Reference',
            },
        ],
        raw_board_transcription: 'Raft Consensus: Follower, Candidate, Leader.',
        ai_synthesized_markdown:
            '# Raft Consensus Protocol\n\nHarmonized Master Notes across Sections A and C.',
        updated_at: new Date().toISOString(),
    },
];

const FALLBACK_KITS: StudyKit[] = [
    {
        id: 'skit_raft_01',
        lecture_id: 'lec_raft_consensus_01',
        title: 'Raft Protocol Complete Mastery Kit',
        subject_name: 'CS-244',
        chapter: 'Chapter 4: Consensus in Fault-Tolerant Clusters',
        key_takeaways: [
            'Leader election requires strict majority quorum (floor(N/2)+1).',
            'Randomized election timeouts break ties and avoid split votes.',
            'Log entries from previous terms cannot be committed directly; they require a current-term entry committed by majority.',
            'Candidates with less up-to-date logs are denied votes by up-to-date peers.',
        ],
        mcqs: [
            {
                id: 'mcq_raft_1',
                question:
                    'In a Raft cluster of 7 nodes, what is the minimum number of functional nodes required to maintain consensus and make progress?',
                options: ['3 nodes', '4 nodes', '5 nodes', '6 nodes'],
                correct_option_index: 1,
                explanation:
                    'For N=7 nodes, a strict majority quorum is floor(7/2) + 1 = 4 nodes. Thus, the cluster can tolerate up to 3 crash failures.',
                difficulty: 'easy',
                topic_reference: 'Cluster Quorum Sizing',
            },
            {
                id: 'mcq_raft_2',
                question:
                    'Why does Raft prohibit a leader from directly committing an entry from an older term simply by counting replica copies?',
                options: [
                    'Older entries might be rejected by the client application',
                    'A future leader with a higher term could overwrite it if a subsequent election occurs before current-term replication (Figure 8)',
                    'Older entries do not carry an indexed hash pointer',
                    'Heartbeat packets cannot transmit old term identifiers',
                ],
                correct_option_index: 1,
                explanation:
                    'As demonstrated in Figure 8 of the Raft paper, an older term entry replicated on a majority can still be overwritten by a subsequent leader.',
                difficulty: 'hard',
                topic_reference: 'Figure 8 Corner Case',
            },
        ],
        flashcards: [
            {
                id: 'fc_raft_1',
                question: 'What is the Log Matching Property in Raft?',
                answer:
                    'If two entries in different logs have the same index and term, they store the same command AND their logs are identical in all preceding entries.',
                explanation: 'Enforced inductively by AppendEntries checking prevLogIndex and prevLogTerm.',
                difficulty: 'medium',
                review_status: 'needs_review',
                topic_tag: 'Invariants',
            },
            {
                id: 'fc_raft_2',
                question: 'How does Raft break split-vote ties during Leader Election?',
                answer:
                    'By choosing election timeouts randomly from a fixed interval (150ms–300ms) on each node.',
                explanation: 'Spreads out timeouts so one server times out first and collects votes.',
                difficulty: 'easy',
                review_status: 'mastered',
                topic_tag: 'Leader Election',
            },
        ],
        revision_sheet: {
            core_definitions: [
                {
                    term: 'Split Quorum',
                    definition:
                        'A state where no single candidate secures a strict majority, requiring a randomized timeout reset.',
                },
            ],
            critical_formulas: [
                {
                    latex_or_text: 'F <= floor((N - 1) / 2)',
                    explanation: 'Maximum number of node crashes tolerated by an N-node system.',
                },
            ],
            high_probability_questions: [
                {
                    question:
                        'Explain step-by-step what happens when a partitioned leader with 2 of 5 nodes receives client requests.',
                    answer:
                        'The partitioned leader appends requests to its log but fails to reach a majority of 3 nodes. When the partition heals, it steps down and truncates uncommitted entries.',
                },
            ],
            professor_tips: [
                'Dr. Thorne always tests what happens if election timeout equals heartbeat interval: continuous spurious elections.',
            ],
        },
        created_at: new Date().toISOString(),
    },
];

export default function App() {
    const [lang, setLang] = useState<Language>('en');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<LectraTab>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [studioProfessorPreset, setStudioProfessorPreset] = useState<string | undefined>(
        undefined
    );

    // Global Academic State
    const [userProfile, setUserProfile] = useState<UserProfile>({
        id: 'usr_lectra_default',
        email: 'alex.rivera@stanford.edu',
        full_name: 'Alex Rivera',
        university: 'Stanford University',
        course: 'B.S. Computer Science & AI',
        section: 'A',
        role: 'student',
        avatar_url:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        bio: 'Junior year CS student specializing in Distributed Systems and Machine Intelligence. Section A academic representative.',
        created_at: new Date().toISOString(),
    });

    const [currentSection, setCurrentSection] = useState<SectionId>('A');
    const [subjects, setSubjects] = useState<SubjectModel[]>(FALLBACK_SUBJECTS);
    const [currentSubject, setCurrentSubject] = useState<SubjectModel | null>(FALLBACK_SUBJECTS[0]);
    const [professors, setProfessors] = useState<ProfessorProfile[]>(FALLBACK_PROFESSORS);
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        total_master_notes: 2,
        uploaded_sources: 18,
        available_study_kits: 2,
        community_contributions: 9,
        total_upvotes: 185,
    });
    const [recentNotes, setRecentNotes] = useState<MasterNoteContent[]>(FALLBACK_NOTES);
    const [studyKits, setStudyKits] = useState<StudyKit[]>(FALLBACK_KITS);
    const [vaultNotes, setVaultNotes] = useState<SectionVaultNote[]>([]);
    const [notifications, setNotifications] = useState<NotificationItem[]>([
        {
            id: 'notif_1',
            user_id: 'usr_lectra_default',
            title: 'Section A Master Note Verified',
            message:
                'Your Raft Consensus Master Note passed syllabus grounding and received 12 new peer upvotes.',
            type: 'vault',
            read: false,
            created_at: new Date().toISOString(),
        },
        {
            id: 'notif_2',
            user_id: 'usr_lectra_default',
            title: 'Section C Comparison Available',
            message:
                'New whiteboard notes for CS-244 Chapter 4 were uploaded in Section C by Dr. Thorne’s TA.',
            type: 'studio',
            read: false,
            created_at: new Date().toISOString(),
        },
    ]);

    const [activeMasterNote, setActiveMasterNote] = useState<MasterNoteContent | null>(
        FALLBACK_NOTES[0]
    );
    const [activeDiagrams, setActiveDiagrams] = useState<SmartDiagram[]>([
        {
            id: 'diag_raft_01',
            lecture_id: 'lec_raft_consensus_01',
            diagram_type: 'state_machine',
            title: 'Raft Server States & Transition Invariants',
            description: 'State machine showing Follower, Candidate, and Leader transitions.',
            mermaid_code: `stateDiagram-v2
    [*] --> Follower
    Follower --> Candidate : Election Timeout (150-300ms)
    Candidate --> Leader : Votes from Majority Quorum (N/2 + 1)
    Candidate --> Follower : Discovers Higher Term
    Leader --> Follower : Discovers Server with Higher Term`,
            uncertain_elements: [],
            is_valid_syntax: true,
            created_at: new Date().toISOString(),
        },
    ]);
    const [activeStudyKit, setActiveStudyKit] = useState<StudyKit | null>(FALLBACK_KITS[0]);
    const [workspaces, setWorkspaces] = useState<WorkspaceModel[]>([]);
    const [uploadHistory, setUploadHistory] = useState<UploadedSourceItem[]>([]);
    const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
    const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
    const [toast, setToast] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
    } | null>(null);
    const toastPopoverRef = useRef<HTMLDivElement>(null);

    const showNotification = useCallback(
        (message: string, type: 'success' | 'error' | 'info' = 'info') => {
            setToast({ message, type });
            try {
                if (toastPopoverRef.current && 'showPopover' in toastPopoverRef.current) {
                    (toastPopoverRef.current as any).showPopover();
                }
            } catch {
                // Fallback when popover API is already open
            }
            setTimeout(() => {
                setToast(null);
            }, 4000);
        },
        []
    );

    const refreshDashboardData = useCallback(async () => {
        try {
            const dash = await lectraApi.getDashboard();
            if (dash.metrics) setMetrics(dash.metrics);
            if (dash.subjects?.length > 0) {
                setSubjects(dash.subjects);
                setCurrentSubject((prev) => prev || dash.subjects[0]);
            }
            if (dash.recent_master_notes?.length > 0) {
                setRecentNotes(dash.recent_master_notes);
                setActiveMasterNote((prev) => prev || dash.recent_master_notes[0]);
            }
            if (dash.professors?.length > 0) {
                setProfessors(dash.professors);
            }
            if (dash.workspaces) {
                setWorkspaces(dash.workspaces);
            }
            if (dash.upload_history) {
                setUploadHistory(dash.upload_history);
            }
            if (dash.user_profile) {
                setUserProfile(dash.user_profile);
                setCurrentSection(dash.user_profile.section);
            }

            const [kits, vlt, notifs] = await Promise.all([
                lectraApi.listStudyKits().catch(() => []),
                lectraApi.getVaultNotes().catch(() => ({ notes: [] })),
                lectraApi.getNotifications().catch(() => []),
            ]);
            if (kits?.length > 0) {
                setStudyKits(kits);
                setActiveStudyKit((prev) => prev || kits[0]);
            }
            if (vlt?.notes) setVaultNotes(vlt.notes);
            if (notifs?.length > 0) setNotifications(notifs);
        } catch (err) {
            console.warn('Using local fallback seed data for LECTRA UI:', err);
        }
    }, []);

    useEffect(() => {
        lectraApi.onSessionExpired(() => {
            showNotification(
                'Your session has expired. Please sign in again to access protected workspaces.',
                'error'
            );
            setAuthModalMode('login');
            setAuthModalOpen(true);
        });
    }, [showNotification]);

    useEffect(() => {
        const initSessionAndData = async () => {
            const stored = lectraApi.getStoredSession();
            if (stored?.access_token) {
                try {
                    const sessionRes = await lectraApi.verifySession();
                    if (sessionRes?.authenticated && sessionRes.user) {
                        setUserProfile(sessionRes.user);
                        setCurrentSection(sessionRes.user.section);
                    }
                } catch {
                    // Session token expired or invalid
                }
            }
            await refreshDashboardData();
        };
        initSessionAndData();
    }, [refreshDashboardData]);

    useEffect(() => {
        if (activeMasterNote) {
            lectraApi
                .getDiagrams(activeMasterNote.lecture_id)
                .then((d) => {
                    if (d && d.length > 0) setActiveDiagrams(d);
                })
                .catch(() => {});
        }
    }, [activeMasterNote]);

    const handleSelectNoteFromVault = async (lectureId: string) => {
        try {
            const res = await lectraApi.getMasterNote(lectureId);
            if (res && res.note) {
                setActiveMasterNote(res.note);
                setActiveDiagrams(res.diagrams || []);
                setActiveStudyKit(res.study_kit || null);
                setActiveTab('notes-viewer');
                return;
            }
        } catch {
            // Fallback lookup in recentNotes
        }
        const found = recentNotes.find((n) => n.lecture_id === lectureId);
        if (found) {
            setActiveMasterNote(found);
            setActiveTab('notes-viewer');
        }
    };

    const handleDownloadNote = (lectureId: string, format: 'pdf' | 'docx' | 'markdown') => {
        const url = lectraApi.getExportUrl(format, lectureId);
        window.open(url, '_blank');
    };

    const handleNoteGeneratedFromStudio = async (noteOrLectureId: MasterNoteContent | string) => {
        if (typeof noteOrLectureId === 'string') {
            try {
                const res = await lectraApi.getMasterNote(noteOrLectureId);
                if (res && res.note) {
                    setActiveMasterNote(res.note);
                    setActiveDiagrams(res.diagrams || []);
                    if (res.study_kit) {
                        setActiveStudyKit(res.study_kit);
                        setStudyKits((prev) => [res.study_kit, ...prev]);
                    }
                    setRecentNotes((prev) => [res.note, ...prev]);
                    setMetrics((prev) => ({
                        ...prev,
                        total_master_notes: prev.total_master_notes + 1,
                        uploaded_sources: prev.uploaded_sources + (res.sources?.length || 2),
                    }));
                    setActiveTab('notes-viewer');
                    await refreshDashboardData();
                    return;
                }
            } catch {
                // fallback below
            }
            return;
        }
        setActiveMasterNote(noteOrLectureId);
        setRecentNotes((prev) => [noteOrLectureId, ...prev]);
        setMetrics((prev) => ({
            ...prev,
            total_master_notes: prev.total_master_notes + 1,
            uploaded_sources: prev.uploaded_sources + 2,
        }));
        setActiveTab('notes-viewer');
    };

    const handleMarkNotificationsRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        try {
            await lectraApi.markNotificationsRead();
        } catch {
            // Ignored offline
        }
    };

    const handleMarkSingleNotificationRead = (id: string) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    };

    const handleLogout = async () => {
        await lectraApi.logout();
        showNotification('Signed out of your LECTRA session.', 'info');
        setAuthModalMode('login');
        setAuthModalOpen(true);
    };

    const recentWorkspaces: RecentWorkspaceItem[] =
        workspaces.length > 0
            ? workspaces.map((ws) => ({
                  id: ws.id,
                  name: ws.title || ws.name || 'Workspace',
                  code: ws.subject_id || 'CS-244',
                  section: ws.section || currentSection,
                  chapter: ws.chapter_id || 'Chapter 1',
                  updatedAt: ws.status || 'Active',
              }))
            : subjects.map((s) => ({
                  id: s.id,
                  name: s.name,
                  code: s.code,
                  section: currentSection,
                  chapter: `${s.chapters_count} Chapters`,
                  updatedAt: 'Active',
              }));

    // Filter recent notes by selected top-bar subject if desired
    const displayedRecentNotes = currentSubject
        ? recentNotes.filter((n) => n.subject_code === currentSubject.code)
        : recentNotes;
    const effectiveRecentNotes =
        displayedRecentNotes.length > 0 ? displayedRecentNotes : recentNotes;

    return (
        <LanguageContext.Provider value={{ lang, setLang }}>
            <div className={theme === 'dark' ? 'dark' : ''}>
                <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans">
                    {/* Top-Layer Toast Container (popover="manual") */}
                    {toast && (
                        <div
                            ref={toastPopoverRef}
                            // @ts-expect-error React popover attribute support
                            popover="manual"
                            role="status"
                            aria-live="polite"
                            className={`fixed bottom-5 right-5 z-50 m-0 rounded-xl border px-4 py-3 text-xs font-semibold shadow-xl transition-all ${
                                toast.type === 'error'
                                    ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
                                    : toast.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                                    : 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                            }`}
                        >
                            {toast.message}
                        </div>
                    )}

                    {/* Auth & Onboarding Modal */}
                    <AuthModal
                        isOpen={authModalOpen}
                        initialMode={authModalMode}
                        currentUser={userProfile}
                        onClose={() => setAuthModalOpen(false)}
                        onAuthSuccess={(u) => {
                            setUserProfile(u);
                            setCurrentSection(u.section);
                            showNotification(
                                `Authenticated as ${u.full_name} (Section ${u.section})`,
                                'success'
                            );
                            refreshDashboardData();
                        }}
                    />

                    {/* Persistent Left Sidebar */}
                    <LectraSidebar
                        activeTab={activeTab}
                        onSelectTab={(t) => {
                            if (t === 'notes-viewer' && !activeMasterNote && recentNotes.length > 0) {
                                setActiveMasterNote(recentNotes[0]);
                            }
                            setActiveTab(t);
                        }}
                        currentSection={currentSection}
                        subjects={subjects}
                        currentSubject={currentSubject}
                        onSelectSubject={(s) => {
                            setCurrentSubject(s);
                            setActiveTab('dashboard');
                        }}
                        recentNotes={recentNotes}
                        onSelectNote={(lecId) => handleSelectNoteFromVault(lecId)}
                        collapsed={sidebarCollapsed}
                        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
                        mobileOpen={mobileSidebarOpen}
                        onCloseMobile={() => setMobileSidebarOpen(false)}
                        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
                    />

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
                        {/* Top Navigation Bar */}
                        <LectraHeader
                            pageTitle={
                                activeTab === 'dashboard'
                                    ? 'Home'
                                    : activeTab === 'chat'
                                    ? 'Notebook Chat'
                                    : activeTab === 'studio'
                                    ? 'AI Notes Studio'
                                    : activeTab === 'vault'
                                    ? 'Section Vault'
                                    : activeTab === 'study-kits'
                                    ? 'Study Kits'
                                    : activeTab === 'notes-viewer'
                                    ? 'Master Notes'
                                    : activeTab === 'professors'
                                    ? 'Professor Library'
                                    : activeTab === 'community'
                                    ? 'Community'
                                    : activeTab === 'notifications'
                                    ? 'Notifications'
                                    : activeTab === 'profile'
                                    ? 'Profile'
                                    : 'Settings'
                            }
                            currentSubject={currentSubject}
                            subjects={subjects}
                            onSelectSubject={(s) => setCurrentSubject(s)}
                            currentSection={currentSection}
                            onSelectSection={(sec) => {
                                setCurrentSection(sec);
                                setUserProfile((p) => ({ ...p, section: sec }));
                            }}
                            userProfile={userProfile}
                            notifications={notifications}
                            onMarkNotificationsRead={handleMarkNotificationsRead}
                            onCreateMasterNotesClick={() => setActiveTab('studio')}
                            onSearchChange={setSearchQuery}
                            searchQuery={searchQuery}
                            onNavigateTab={(t) => setActiveTab(t)}
                            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
                            recentNotes={recentNotes}
                            vaultNotes={vaultNotes}
                            professors={professors}
                            onSelectNote={(lecId) => handleSelectNoteFromVault(lecId)}
                            onLogout={handleLogout}
                            onOpenAuthModal={(mode) => {
                                setAuthModalMode(mode);
                                setAuthModalOpen(true);
                            }}
                        />

                        {/* Dynamic View Panels */}
                        <main className="flex-1 px-4 py-6 sm:px-8 max-w-7xl w-full mx-auto">
                            {activeTab === 'dashboard' && (
                                <DashboardView
                                    userProfile={userProfile}
                                    metrics={metrics}
                                    subjects={subjects}
                                    recentNotes={effectiveRecentNotes}
                                    professors={professors}
                                    workspaces={workspaces}
                                    uploadHistory={uploadHistory}
                                    currentSection={currentSection}
                                    onOpenStudio={() => setActiveTab('studio')}
                                    onOpenVault={() => setActiveTab('vault')}
                                    onOpenChat={() => setActiveTab('chat')}
                                    onOpenStudyKit={(lecId) => {
                                        if (lecId) {
                                            const found = studyKits.find(
                                                (k) => k.lecture_id === lecId
                                            );
                                            if (found) setActiveStudyKit(found);
                                        }
                                        setActiveTab('study-kits');
                                    }}
                                    onViewMasterNote={(note) => {
                                        setActiveMasterNote(note);
                                        setActiveTab('notes-viewer');
                                    }}
                                    onDownloadNote={handleDownloadNote}
                                    onSelectSubject={(subj) => {
                                        setCurrentSubject(subj);
                                        setActiveTab('vault');
                                    }}
                                    onRefreshDashboard={refreshDashboardData}
                                    onNotify={showNotification}
                                />
                            )}

                            {activeTab === 'chat' && (
                                <NotebookChatView
                                    currentSubject={currentSubject}
                                    userProfile={userProfile}
                                    activeMasterNote={activeMasterNote}
                                    recentNotes={effectiveRecentNotes}
                                    uploadHistory={uploadHistory}
                                    currentSection={currentSection}
                                    onOpenStudio={() => setActiveTab('studio')}
                                    onOpenMasterNote={(note) => {
                                        setActiveMasterNote(note);
                                        setActiveTab('notes-viewer');
                                    }}
                                    onOpenStudyKit={(lecId) => {
                                        if (lecId) {
                                            const found = studyKits.find((k) => k.lecture_id === lecId);
                                            if (found) setActiveStudyKit(found);
                                        }
                                        setActiveTab('study-kits');
                                    }}
                                    onOpenVault={() => setActiveTab('vault')}
                                    onNotify={showNotification}
                                />
                            )}

                            {activeTab === 'studio' && (
                                <AINotesStudioView
                                    subjects={subjects}
                                    professors={professors}
                                    currentSubject={currentSubject}
                                    currentSection={currentSection}
                                    userProfile={userProfile}
                                    onNoteGenerated={handleNoteGeneratedFromStudio}
                                    initialProfessorName={studioProfessorPreset}
                                />
                            )}

                            {activeTab === 'vault' && (
                                <SectionVaultView
                                    currentSection={currentSection}
                                    subjects={subjects}
                                    professors={professors}
                                    onSelectNote={handleSelectNoteFromVault}
                                    onDownloadNote={handleDownloadNote}
                                />
                            )}

                            {activeTab === 'study-kits' && (
                                <StudyKitsView
                                    studyKits={studyKits}
                                    initialLectureId={activeMasterNote?.lecture_id}
                                    onViewMasterNote={(lecId) => handleSelectNoteFromVault(lecId)}
                                    onRefreshKits={() => refreshDashboardData()}
                                />
                            )}

                            {activeTab === 'professors' && (
                                <ProfessorLibraryView
                                    professors={professors}
                                    onSelectProfessorForNotes={(profName) => {
                                        setStudioProfessorPreset(profName);
                                        setActiveTab('studio');
                                    }}
                                />
                            )}

                            {activeTab === 'community' && (
                                <CommunityView
                                    vaultNotes={vaultNotes}
                                    userProfile={userProfile}
                                    onViewNote={handleSelectNoteFromVault}
                                />
                            )}

                            {activeTab === 'notes-viewer' && (
                                activeMasterNote ? (
                                    <MasterNotesView
                                        note={activeMasterNote}
                                        diagrams={activeDiagrams}
                                        studyKit={activeStudyKit}
                                        allNotes={recentNotes}
                                        onSelectNote={(n) => setActiveMasterNote(n)}
                                        onNoteUpdated={(updated) => {
                                            setActiveMasterNote(updated);
                                            setRecentNotes((prev) =>
                                                prev.map((n) => (n.id === updated.id ? updated : n))
                                            );
                                        }}
                                        onOpenStudyKit={(lecId) => {
                                            const found = studyKits.find(
                                                (k) => k.lecture_id === lecId
                                            );
                                            if (found) setActiveStudyKit(found);
                                            setActiveTab('study-kits');
                                        }}
                                        onOpenChat={(note) => {
                                            setActiveMasterNote(note);
                                            setActiveTab('chat');
                                        }}
                                    />
                                ) : (
                                    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800">
                                            <div>
                                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                                    My Notes
                                                </h1>
                                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                                    All your synthesized academic Master Notes in one place.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('studio')}
                                                className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition"
                                            >
                                                <span>+ Create Master Notes</span>
                                            </button>
                                        </div>

                                        {recentNotes.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                    No Master Notes generated yet
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Upload whiteboard photos or reference PDFs to generate structured notes.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('studio')}
                                                    className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                                                >
                                                    Open AI Notes Studio
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {recentNotes.map((n) => (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => setActiveMasterNote(n)}
                                                        className="group rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-indigo-400 transition cursor-pointer dark:border-slate-800 dark:bg-slate-900 space-y-2.5"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                                {n.subject_code}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                Sec {n.section}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                                                            {n.chapter || n.title}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                            {n.summary}
                                                        </p>
                                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                                                            <span>Prof. {n.professor}</span>
                                                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                                                                Open in Viewer →
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            )}

                            {activeTab === 'profile' && (
                                <ProfileView
                                    userProfile={userProfile}
                                    metrics={metrics}
                                    subjects={subjects}
                                    recentNotes={recentNotes}
                                    vaultNotes={vaultNotes}
                                    onNavigateTab={(t) => setActiveTab(t)}
                                    onViewNote={(note) => {
                                        setActiveMasterNote(note);
                                        setActiveTab('notes-viewer');
                                    }}
                                />
                            )}

                            {activeTab === 'notifications' && (
                                <NotificationsView
                                    notifications={notifications}
                                    onMarkAllRead={handleMarkNotificationsRead}
                                    onMarkSingleRead={handleMarkSingleNotificationRead}
                                    onNavigateTab={(t) => setActiveTab(t)}
                                />
                            )}

                            {activeTab === 'settings' && (
                                <SettingsView
                                    userProfile={userProfile}
                                    onUpdateProfile={(u) => {
                                        setUserProfile(u);
                                        setCurrentSection(u.section);
                                        showNotification(
                                            'Academic profile updated in database.',
                                            'success'
                                        );
                                    }}
                                    theme={theme}
                                    onToggleTheme={() =>
                                        setTheme(theme === 'light' ? 'dark' : 'light')
                                    }
                                    onOpenAuthModal={(mode) => {
                                        setAuthModalMode(mode);
                                        setAuthModalOpen(true);
                                    }}
                                    onLogout={handleLogout}
                                />
                            )}

                            {activeTab === 'auth' && (
                                <AuthView
                                    onAuthSuccess={(u) => {
                                        setUserProfile(u);
                                        setCurrentSection(u.section);
                                        setActiveTab('dashboard');
                                        showNotification(
                                            `Welcome back, ${u.full_name}!`,
                                            'success'
                                        );
                                        refreshDashboardData();
                                    }}
                                    onCancel={() => setActiveTab('dashboard')}
                                />
                            )}
                        </main>
                    </div>
                </div>
            </div>
        </LanguageContext.Provider>
    );
}
