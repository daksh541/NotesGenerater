import React, { useState, useEffect, useMemo } from 'react';
import {
    BookOpen,
    HelpCircle,
    Brain,
    Timer,
    CheckCircle2,
    XCircle,
    ChevronLeft,
    ChevronRight,
    Award,
    Printer,
    FileText,
    Sparkles,
    Check,
    Lightbulb,
    Copy,
    ExternalLink,
    RefreshCw,
    Shuffle,
    Plus,
    Trash2,
    Edit3,
    X,
    Eye,
    EyeOff,
    Search,
    Filter,
    BarChart3,
    CheckSquare,
    Clock,
    Download,
    AlertCircle,
    ArrowLeft,
    GraduationCap,
    Send,
    AlertTriangle,
    Layers,
    BookMarked,
} from 'lucide-react';
import {
    StudyKit,
    MasterNoteContent,
    QuizAttempt,
    StudentKitProgress,
    PracticeQuestionItem,
    PracticeEvaluationResponse,
    ExamPriorityTopic,
} from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';

interface StudyKitsViewProps {
    studyKits: StudyKit[];
    initialLectureId?: string;
    onViewMasterNote?: (lectureId: string) => void;
    onRefreshKits?: () => Promise<void> | void;
}

type TabType =
    | 'overview'
    | 'takeaways'
    | 'mcqs'
    | 'quiz'
    | 'flashcards'
    | 'practice'
    | 'exam-priority';

export const StudyKitsView: React.FC<StudyKitsViewProps> = ({
    studyKits: initialKits,
    initialLectureId,
    onViewMasterNote,
    onRefreshKits,
}) => {
    // Current kits list (managed locally with fallback to initialKits)
    const [kits, setKits] = useState<StudyKit[]>(initialKits);
    const [viewMode, setViewMode] = useState<'dashboard' | 'workspace'>(
        initialLectureId ? 'workspace' : 'dashboard'
    );
    const [selectedKitId, setSelectedKitId] = useState<string>(
        initialLectureId || initialKits[0]?.id || initialKits[0]?.lecture_id || ''
    );
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Dashboard filters & search
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [kitTypeFilter, setKitTypeFilter] = useState('all');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [masterNotesList, setMasterNotesList] = useState<MasterNoteContent[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);

    // Create Modal state
    const [newKitLectureId, setNewKitLectureId] = useState('');
    const [newKitType, setNewKitType] = useState('comprehensive');
    const [newKitNumMcqs, setNewKitNumMcqs] = useState(5);
    const [newKitDifficulty, setNewKitDifficulty] = useState('all');

    // Edit Modal state
    const [editTitle, setEditTitle] = useState('');
    const [editTakeaways, setEditTakeaways] = useState<string>('');
    const [editOnePage, setEditOnePage] = useState('');
    const [editDetailed, setEditDetailed] = useState('');
    const [editLastMinute, setEditLastMinute] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Current Kit resolution
    const currentKit = useMemo(() => {
        return (
            kits.find((k) => k.id === selectedKitId || k.lecture_id === selectedKitId) ||
            kits[0] ||
            null
        );
    }, [kits, selectedKitId]);

    // Keep kits state in sync with parent props
    useEffect(() => {
        if (initialKits && initialKits.length > 0) {
            setKits(initialKits);
            if (!selectedKitId) {
                setSelectedKitId(initialKits[0].id || initialKits[0].lecture_id);
            }
        }
    }, [initialKits]);

    // Initial Lecture ID deep-link
    useEffect(() => {
        if (initialLectureId) {
            const found = kits.find(
                (k) => k.lecture_id === initialLectureId || k.id === initialLectureId
            );
            if (found) {
                setSelectedKitId(found.id || found.lecture_id);
                setViewMode('workspace');
            }
        }
    }, [initialLectureId, kits]);

    // Load master notes for creation dropdown
    useEffect(() => {
        lectraApi
            .listMasterNotes()
            .then((notes) => {
                if (notes && notes.length > 0) {
                    setMasterNotesList(notes);
                    if (!newKitLectureId) {
                        setNewKitLectureId(notes[0].lecture_id);
                    }
                }
            })
            .catch(() => {});
    }, []);

    // -------------------------------------------------------------
    // INTERFACE STATES (MCQs, Flashcards, Quiz, Practice, Takeaways)
    // -------------------------------------------------------------

    // 1. MCQ Generator State
    const [selectedMcqOption, setSelectedMcqOption] = useState<Record<string, number>>({});
    const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

    // 2. Flashcards State
    const [cardIndex, setCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [shuffledFlashcards, setShuffledFlashcards] = useState<any[]>([]);
    const [cardStatusMap, setCardStatusMap] = useState<Record<string, 'mastered' | 'needs_review'>>({});

    // Sync flashcard deck on kit switch
    useEffect(() => {
        if (currentKit?.flashcards) {
            setShuffledFlashcards([...currentKit.flashcards]);
            setCardIndex(0);
            setIsFlipped(false);
        }
    }, [currentKit?.id]);

    // 3. Timed Quiz State
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
    const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
    const [quizSecondsRemaining, setQuizSecondsRemaining] = useState(600);
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizResult, setQuizResult] = useState<any>(null);
    const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
    const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);

    // 4. Practice Questions State
    const [practiceCategory, setPracticeCategory] = useState<string>('all');
    const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
    const [evaluations, setEvaluations] = useState<Record<string, PracticeEvaluationResponse>>({});
    const [evaluatingQuestionId, setEvaluatingQuestionId] = useState<string | null>(null);
    const [revealedModelAnswers, setRevealedModelAnswers] = useState<Record<string, boolean>>({});

    // 5. Key Takeaways & Revision Sheets State
    const [revisionMode, setRevisionMode] = useState<'one_page' | 'detailed' | 'last_minute'>('one_page');
    const [masteredTakeaways, setMasteredTakeaways] = useState<Record<number, boolean>>({});
    const [copiedTakeaways, setCopiedTakeaways] = useState(false);

    // Fetch quiz attempts when Quiz tab is opened
    useEffect(() => {
        if (activeTab === 'quiz' && currentKit) {
            setIsLoadingAttempts(true);
            lectraApi
                .getQuizAttempts(currentKit.lecture_id)
                .then((atts) => setQuizAttempts(atts || []))
                .catch(() => {})
                .finally(() => setIsLoadingAttempts(false));
        }
    }, [activeTab, currentKit?.id]);

    // Quiz Timer countdown
    useEffect(() => {
        let timer: any = null;
        if (quizStarted && !quizSubmitted && quizSecondsRemaining > 0) {
            timer = setInterval(() => {
                setQuizSecondsRemaining((prev) => {
                    if (prev <= 1) {
                        handleQuizSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [quizStarted, quizSubmitted, quizSecondsRemaining]);

    const formatTimer = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // -------------------------------------------------------------
    // HANDLERS
    // -------------------------------------------------------------

    const handleCreateStudyKit = async () => {
        if (!newKitLectureId) return;
        setIsGenerating(true);
        setGenError(null);
        try {
            const created = await lectraApi.generateStudyKit({
                lecture_id: newKitLectureId,
                kit_type: newKitType,
                num_mcqs: newKitNumMcqs,
                difficulty: newKitDifficulty,
                user_id: 'usr_lectra_default',
            });
            setKits((prev) => [created, ...prev.filter((k) => k.id !== created.id)]);
            setSelectedKitId(created.id || created.lecture_id);
            setShowCreateModal(false);
            setViewMode('workspace');
            setActiveTab('overview');
            if (onRefreshKits) await onRefreshKits();
        } catch (err: any) {
            setGenError(err?.response?.data?.detail || err.message || 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleOpenEditModal = () => {
        if (!currentKit) return;
        setEditTitle(currentKit.title || '');
        setEditTakeaways((currentKit.key_takeaways || []).join('\n'));
        setEditOnePage(currentKit.one_page_summary || '');
        setEditDetailed(currentKit.detailed_summary || '');
        setEditLastMinute(currentKit.last_minute_summary || '');
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!currentKit) return;
        setIsSavingEdit(true);
        try {
            const takeawaysArray = editTakeaways
                .split('\n')
                .map((t) => t.trim().replace(/^[•\-\*]\s*/, ''))
                .filter(Boolean);

            const res = await lectraApi.updateStudyKit(currentKit.id, {
                title: editTitle,
                key_takeaways: takeawaysArray,
                one_page_summary: editOnePage,
                detailed_summary: editDetailed,
                last_minute_summary: editLastMinute,
                user_id: 'usr_lectra_default',
            });

            const updated = res.study_kit;
            setKits((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
            setShowEditModal(false);
            if (onRefreshKits) await onRefreshKits();
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Failed to update study kit');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteKit = async () => {
        if (!currentKit) return;
        try {
            await lectraApi.deleteStudyKit(currentKit.id, 'usr_lectra_default');
            const remaining = kits.filter((k) => k.id !== currentKit.id);
            setKits(remaining);
            setShowDeleteModal(false);
            if (remaining.length > 0) {
                setSelectedKitId(remaining[0].id || remaining[0].lecture_id);
                setViewMode('dashboard');
            } else {
                setViewMode('dashboard');
            }
            if (onRefreshKits) await onRefreshKits();
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Failed to delete study kit');
        }
    };

    // Flashcard Handlers
    const activeFlashcardsList = shuffledFlashcards.length > 0 ? shuffledFlashcards : currentKit?.flashcards || [];
    const currentCard = activeFlashcardsList[cardIndex] || activeFlashcardsList[0];

    const handleNextCard = () => {
        setIsFlipped(false);
        setCardIndex((prev) => (prev + 1) % activeFlashcardsList.length);
    };

    const handlePrevCard = () => {
        setIsFlipped(false);
        setCardIndex((prev) => (prev - 1 + activeFlashcardsList.length) % activeFlashcardsList.length);
    };

    const handleShuffleCards = () => {
        setIsFlipped(false);
        const shuffled = [...activeFlashcardsList].sort(() => Math.random() - 0.5);
        setShuffledFlashcards(shuffled);
        setCardIndex(0);
    };

    const handleSetCardStatus = async (status: 'mastered' | 'needs_review') => {
        if (!currentKit || !currentCard) return;
        setCardStatusMap((prev) => ({ ...prev, [currentCard.id]: status }));
        const currentUserId = lectraApi.getStoredSession()?.user?.id || 'usr_lectra_default';
        try {
            const res = await lectraApi.updateFlashcardProgress(
                currentKit.id,
                currentCard.id,
                status,
                currentUserId
            );
            if (res.progress) {
                // Update local kit progress
                setKits((prev) =>
                    prev.map((k) =>
                        k.id === currentKit.id ? { ...k, progress: res.progress } : k
                    )
                );
            }
        } catch (e) {
            console.error('Failed to update flashcard progress', e);
        }
        handleNextCard();
    };

    // MCQ Handlers
    const handleSelectOption = (mcqId: string, optIndex: number) => {
        setSelectedMcqOption((prev) => ({ ...prev, [mcqId]: optIndex }));
    };

    const filteredMcqs = useMemo(() => {
        if (!currentKit?.mcqs) return [];
        return currentKit.mcqs.filter(
            (m) => difficultyFilter === 'all' || m.difficulty === difficultyFilter
        );
    }, [currentKit?.mcqs, difficultyFilter]);

    // Timed Quiz Handlers
    const handleStartQuiz = () => {
        setQuizStarted(true);
        setQuizSubmitted(false);
        setQuizAnswers({});
        setQuizCurrentIndex(0);
        setQuizSecondsRemaining(600);
        setQuizResult(null);
    };

    const handleQuizSubmit = async () => {
        if (!currentKit) return;
        setQuizSubmitted(true);
        const timeTaken = 600 - quizSecondsRemaining;
        const currentUserId = lectraApi.getStoredSession()?.user?.id || 'usr_lectra_default';
        try {
            const res = await lectraApi.submitQuiz(
                currentKit.lecture_id,
                quizAnswers,
                timeTaken,
                currentUserId
            );
            setQuizResult(res);
            // Refresh attempts list
            const atts = await lectraApi.getQuizAttempts(currentKit.lecture_id);
            setQuizAttempts(atts || []);
            // Update local kit progress
            if (res.progress) {
                setKits((prev) =>
                    prev.map((k) =>
                        k.id === currentKit.id ? { ...k, progress: res.progress } : k
                    )
                );
            }
        } catch (err) {
            console.error('Quiz submit failed:', err);
        }
    };

    // Practice Evaluation Handler
    const handleEvaluatePractice = async (qId: string) => {
        if (!currentKit) return;
        const answer = studentAnswers[qId];
        if (!answer || answer.trim().length === 0) {
            alert('Please type your answer before requesting AI evaluation.');
            return;
        }
        setEvaluatingQuestionId(qId);
        try {
            const evaluation = await lectraApi.evaluatePracticeAnswer(
                currentKit.id,
                qId,
                answer.trim()
            );
            setEvaluations((prev) => ({ ...prev, [qId]: evaluation }));
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Evaluation failed. Please try again.');
        } finally {
            setEvaluatingQuestionId(null);
        }
    };

    const handleCopyTakeaways = () => {
        if (!currentKit?.key_takeaways) return;
        navigator.clipboard.writeText(currentKit.key_takeaways.join('\n• '));
        setCopiedTakeaways(true);
        setTimeout(() => setCopiedTakeaways(false), 2000);
    };

    // Filtered study kits for dashboard
    const filteredDashboardKits = useMemo(() => {
        return kits.filter((k) => {
            const matchesSearch =
                searchQuery.trim() === '' ||
                k.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                k.chapter.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (k.professor && k.professor.toLowerCase().includes(searchQuery.toLowerCase())) ||
                k.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (k.subject_code && k.subject_code.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesSubject =
                subjectFilter === 'all' ||
                k.subject_code === subjectFilter ||
                k.subject_name === subjectFilter;

            const matchesType =
                kitTypeFilter === 'all' || k.kit_type === kitTypeFilter;

            return matchesSearch && matchesSubject && matchesType;
        });
    }, [kits, searchQuery, subjectFilter, kitTypeFilter]);

    // Unique subjects list for filter dropdown
    const uniqueSubjects = useMemo(() => {
        const set = new Set<string>();
        kits.forEach((k) => {
            if (k.subject_code) set.add(k.subject_code);
            else if (k.subject_name) set.add(k.subject_name);
        });
        return Array.from(set);
    }, [kits]);

    // Aggregate stats for dashboard header
    const stats = useMemo(() => {
        let totalMcqs = 0;
        let totalCards = 0;
        let totalMasteredCards = 0;
        let totalQuizzesTaken = 0;
        let sumScores = 0;
        let scoresCount = 0;

        kits.forEach((k) => {
            totalMcqs += k.mcqs?.length || 0;
            totalCards += k.flashcards?.length || 0;
            if (k.progress) {
                totalMasteredCards += k.progress.cards_mastered || 0;
                totalQuizzesTaken += k.progress.quizzes_taken || 0;
                if (k.progress.last_quiz_score !== undefined && k.progress.last_quiz_score !== null) {
                    sumScores += k.progress.last_quiz_score;
                    scoresCount++;
                }
            }
        });

        const avgScore = scoresCount > 0 ? Math.round(sumScores / scoresCount) : 84;
        return {
            totalKits: kits.length,
            totalMcqs,
            totalCards,
            totalMasteredCards,
            totalQuizzesTaken,
            avgScore,
        };
    }, [kits]);

    // -------------------------------------------------------------
    // RENDER: DASHBOARD VIEW
    // -------------------------------------------------------------

    if (viewMode === 'dashboard') {
        return (
            <div className="space-y-6 pb-20 animate-fade-in">
                {/* Dashboard Hero Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-200/80 pb-5 dark:border-slate-800">
                    <div>
                        <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            <Sparkles size={15} />
                            <span>AI Study Kit & Exam Preparation Engine</span>
                        </div>
                        <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                            Study Kits Dashboard
                        </h1>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Comprehensive active-recall kits, grounded chapter MCQs, 3D flashcards, practice questions, and exam priority analytics.
                        </p>
                    </div>

                    <div className="flex items-center space-x-2.5">
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center space-x-2 rounded-xl bg-[#0B132B] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-600 transition dark:bg-indigo-600 dark:hover:bg-indigo-500"
                        >
                            <Plus size={15} />
                            <span>Create Study Kit</span>
                        </button>
                    </div>
                </div>

                {/* Metrics Stats Ribbon */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Available Kits</span>
                            <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                            {stats.totalKits}
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400">Grounded in verified master notes</p>
                    </div>

                    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Grounded MCQs</span>
                            <HelpCircle size={16} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                            {stats.totalMcqs}
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400">With source citations & rationales</p>
                    </div>

                    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Flashcards Mastered</span>
                            <Brain size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                            {stats.totalMasteredCards} <span className="text-xs font-normal text-slate-400">/ {stats.totalCards}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400">Interactive recall memory engine</p>
                    </div>

                    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Avg Quiz Mastery</span>
                            <Award size={16} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                            {stats.avgScore}%
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400">{stats.totalQuizzesTaken} timed attempts logged</p>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-saas sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by topic, chapter, subject, or professor..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                            <Filter size={13} />
                            <span className="font-semibold">Subject:</span>
                        </div>
                        <select
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        >
                            <option value="all">All Subjects</option>
                            {uniqueSubjects.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>

                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 ml-2">
                            <span className="font-semibold">Type:</span>
                        </div>
                        <select
                            value={kitTypeFilter}
                            onChange={(e) => setKitTypeFilter(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        >
                            <option value="all">All Types</option>
                            <option value="comprehensive">Comprehensive</option>
                            <option value="exam_prep">Exam Prep</option>
                            <option value="quick_review">Quick Review</option>
                            <option value="flashcards">Flashcards Only</option>
                        </select>
                    </div>
                </div>

                {/* Kits Grid */}
                {filteredDashboardKits.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900">
                        <BookOpen size={36} className="mx-auto mb-3 text-indigo-400" />
                        <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                            No Study Kits Match Your Criteria
                        </h3>
                        <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                            Generate a new AI Study Kit from your classroom Master Notes to start practicing.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 inline-flex items-center space-x-2 rounded-lg bg-[#0B132B] px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-600 dark:bg-indigo-600"
                        >
                            <Plus size={14} />
                            <span>Create Study Kit</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {filteredDashboardKits.map((kit) => {
                            const progress = kit.progress || {
                                cards_mastered: 0,
                                total_cards: kit.flashcards?.length || 0,
                                cards_needs_review: 0,
                                quizzes_taken: 0,
                                best_quiz_score: 0,
                                last_quiz_score: 0,
                                practice_completed: 0,
                            };
                            const totalCards = kit.flashcards?.length || 1;
                            const masteryPct = Math.round((progress.cards_mastered / totalCards) * 100);

                            return (
                                <div
                                    key={kit.id}
                                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-saas hover:border-indigo-400 hover:shadow-saas-md transition dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div>
                                        {/* Card Top Badges */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                    {kit.subject_code || kit.subject_name}
                                                </span>
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-400">
                                                    {kit.kit_type || 'comprehensive'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(kit.created_at || Date.now()).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                        </div>

                                        {/* Title & Metadata */}
                                        <h3 className="mt-3 font-display text-base font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 line-clamp-2">
                                            {kit.title}
                                        </h3>
                                        <div className="mt-1 flex items-center space-x-1.5 text-xs text-slate-500">
                                            <GraduationCap size={13} className="text-slate-400" />
                                            <span className="truncate">{kit.professor || 'Prof. Faculty'}</span>
                                            <span>•</span>
                                            <span className="truncate text-[11px]">{kit.chapter}</span>
                                        </div>

                                        {/* Module Counts */}
                                        <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50/80 p-2.5 text-xs dark:bg-slate-800/50">
                                            <div className="text-center flex-1 border-r border-slate-200 dark:border-slate-700/60">
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase">MCQs</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{kit.mcqs?.length || 0}</span>
                                            </div>
                                            <div className="text-center flex-1 border-r border-slate-200 dark:border-slate-700/60">
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Cards</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{kit.flashcards?.length || 0}</span>
                                            </div>
                                            <div className="text-center flex-1">
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Practice</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{kit.practice_questions?.length || 5}</span>
                                            </div>
                                        </div>

                                        {/* Learning Progress Gauge */}
                                        <div className="mt-4 space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-semibold text-slate-600 dark:text-slate-400">
                                                    Flashcard Mastery
                                                </span>
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                                    {masteryPct}% ({progress.cards_mastered}/{totalCards})
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                                                    style={{ width: `${Math.min(100, masteryPct)}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                                                <span>Best Quiz: {progress.best_quiz_score ? `${progress.best_quiz_score}%` : 'Not taken'}</span>
                                                <span>{progress.quizzes_taken || 0} attempts</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedKitId(kit.id || kit.lecture_id);
                                                setViewMode('workspace');
                                                setActiveTab('overview');
                                            }}
                                            className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0B132B] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition"
                                        >
                                            <BookOpen size={13} />
                                            <span>Open Kit</span>
                                        </button>

                                        <div className="flex items-center space-x-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedKitId(kit.id || kit.lecture_id);
                                                    setViewMode('workspace');
                                                    setActiveTab('quiz');
                                                }}
                                                title="Practice Timed Quiz"
                                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                            >
                                                <Timer size={14} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedKitId(kit.id || kit.lecture_id);
                                                    handleOpenEditModal();
                                                }}
                                                title="Edit Study Kit"
                                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                            >
                                                <Edit3 size={14} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedKitId(kit.id || kit.lecture_id);
                                                    setShowDeleteModal(true);
                                                }}
                                                title="Delete Study Kit"
                                                className="rounded-lg border border-slate-200 bg-white p-2 text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* MODAL 1: Create Study Kit Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
                        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                                <div className="flex items-center space-x-2">
                                    <Sparkles size={18} className="text-indigo-600" />
                                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                                        Generate AI Study Kit
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="mt-4 space-y-4">
                                {genError && (
                                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300 flex items-center space-x-2">
                                        <AlertCircle size={15} className="shrink-0" />
                                        <span>{genError}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Source Master Note
                                    </label>
                                    <select
                                        value={newKitLectureId}
                                        onChange={(e) => setNewKitLectureId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    >
                                        {masterNotesList.map((m) => (
                                            <option key={m.lecture_id} value={m.lecture_id}>
                                                {m.title} ({m.subject_code} • {m.professor})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        All questions, flashcards, and revision sheets will be grounded strictly in this note.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Study Kit Type
                                        </label>
                                        <select
                                            value={newKitType}
                                            onChange={(e) => setNewKitType(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        >
                                            <option value="comprehensive">Comprehensive Exam Kit</option>
                                            <option value="exam_prep">Exam Prep Focus</option>
                                            <option value="quick_review">Quick Review</option>
                                            <option value="flashcards">Flashcards Only</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Number of MCQs
                                        </label>
                                        <select
                                            value={newKitNumMcqs}
                                            onChange={(e) => setNewKitNumMcqs(Number(e.target.value))}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        >
                                            <option value={5}>5 Questions (Quick)</option>
                                            <option value={10}>10 Questions (Standard)</option>
                                            <option value={15}>15 Questions (Deep Dive)</option>
                                            <option value={20}>20 Questions (Full Midterm)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Difficulty Distribution
                                    </label>
                                    <select
                                        value={newKitDifficulty}
                                        onChange={(e) => setNewKitDifficulty(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    >
                                        <option value="all">Balanced (Easy, Medium, Hard)</option>
                                        <option value="easy">Easy (Foundational Concepts)</option>
                                        <option value="medium">Medium (Analytical & Proofs)</option>
                                        <option value="hard">Hard (Edge Cases & Midterm Level)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-end space-x-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={isGenerating}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateStudyKit}
                                    disabled={isGenerating}
                                    className="inline-flex items-center space-x-2 rounded-lg bg-[#0B132B] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-600 disabled:opacity-50 dark:bg-indigo-600"
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw size={13} className="animate-spin" />
                                            <span>Grounding & Synthesizing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={13} />
                                            <span>Generate Study Kit</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: WORKSPACE VIEW (Active Kit Focused)
    // -------------------------------------------------------------

    if (!currentKit) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-16 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                <BookOpen size={36} className="mx-auto mb-3 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                    No Study Kit Selected
                </h3>
                <button
                    type="button"
                    onClick={() => setViewMode('dashboard')}
                    className="mt-4 rounded-lg bg-[#0B132B] px-4 py-2 text-xs font-semibold text-white"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* Top Workspace Bar */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-200/80 pb-4 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                    <button
                        type="button"
                        onClick={() => setViewMode('dashboard')}
                        className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                        <ArrowLeft size={14} />
                        <span>All Study Kits</span>
                    </button>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {currentKit.subject_code || currentKit.subject_name}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                                {currentKit.title}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Kit Switcher Dropdown */}
                    <select
                        value={currentKit.id}
                        onChange={(e) => {
                            setSelectedKitId(e.target.value);
                            setCardIndex(0);
                            setIsFlipped(false);
                            setQuizStarted(false);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    >
                        {kits.map((k) => (
                            <option key={k.id} value={k.id}>
                                {k.title} ({k.subject_code || k.subject_name})
                            </option>
                        ))}
                    </select>

                    {/* View Master Note */}
                    {onViewMasterNote && (
                        <button
                            type="button"
                            onClick={() => onViewMasterNote(currentKit.lecture_id)}
                            className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <ExternalLink size={13} />
                            <span>Source Note</span>
                        </button>
                    )}

                    {/* Edit Study Kit */}
                    <button
                        type="button"
                        onClick={handleOpenEditModal}
                        className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                        <Edit3 size={13} />
                        <span>Edit</span>
                    </button>

                    {/* PDF Export Direct Link */}
                    <a
                        href={lectraApi.getStudyKitPdfUrl(currentKit.id, revisionMode)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0B132B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 transition dark:bg-indigo-600"
                    >
                        <Download size={13} />
                        <span>Export PDF</span>
                    </a>
                </div>
            </div>

            {/* Navigation Tabs (7 Rich Interfaces) */}
            <div className="flex items-center space-x-1.5 overflow-x-auto rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                {[
                    { id: 'overview', label: 'Overview & Progress', icon: BarChart3 },
                    {
                        id: 'takeaways',
                        label: `Key Takeaways (${currentKit.key_takeaways?.length || 0})`,
                        icon: Lightbulb,
                    },
                    {
                        id: 'mcqs',
                        label: `MCQ Bank (${currentKit.mcqs?.length || 0})`,
                        icon: HelpCircle,
                    },
                    { id: 'quiz', label: 'Timed Quiz', icon: Timer },
                    {
                        id: 'flashcards',
                        label: `Flashcards (${currentKit.flashcards?.length || 0})`,
                        icon: Brain,
                    },
                    {
                        id: 'practice',
                        label: `Practice Qs (${currentKit.practice_questions?.length || 5})`,
                        icon: FileText,
                    },
                    { id: 'exam-priority', label: 'Exam Priority Analysis', icon: Award },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition shrink-0 ${
                                isActive
                                    ? 'bg-[#0B132B] text-white shadow-xs dark:bg-indigo-600'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Icon size={14} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* -------------------------------------------------------- */}
            {/* TAB 0: OVERVIEW & PROGRESS */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Hero Meta Card */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                        {currentKit.subject_code} • {currentKit.subject_name}
                                    </span>
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                        {currentKit.kit_type || 'Comprehensive'}
                                    </span>
                                </div>
                                <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                    {currentKit.title}
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    {currentKit.chapter} • Instructor: {currentKit.professor || 'Prof. Faculty'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('quiz')}
                                    className="rounded-xl bg-[#0B132B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600 transition dark:bg-indigo-600"
                                >
                                    Take Timed Quiz
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('flashcards')}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                    Review Flashcards
                                </button>
                            </div>
                        </div>

                        {/* Learning Progress Breakdown */}
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-6 dark:border-slate-800">
                            <div className="rounded-xl bg-slate-50/80 p-4 dark:bg-slate-800/40">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase">Flashcards</span>
                                    <Brain size={16} className="text-indigo-600" />
                                </div>
                                <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                                    {currentKit.progress?.cards_mastered || 0} / {currentKit.flashcards?.length || 0}
                                </div>
                                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-600 rounded-full"
                                        style={{
                                            width: `${
                                                ((currentKit.progress?.cards_mastered || 0) /
                                                    (currentKit.flashcards?.length || 1)) *
                                                100
                                            }%`,
                                        }}
                                    />
                                </div>
                                <p className="mt-1.5 text-[10px] text-slate-400">
                                    {currentKit.progress?.cards_needs_review || 0} flagged for review
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-50/80 p-4 dark:bg-slate-800/40">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase">Best Quiz Score</span>
                                    <Award size={16} className="text-emerald-600" />
                                </div>
                                <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                                    {currentKit.progress?.best_quiz_score ? `${currentKit.progress.best_quiz_score}%` : 'Not Attempted'}
                                </div>
                                <p className="mt-2 text-[10px] text-slate-400">
                                    {currentKit.progress?.quizzes_taken || 0} total attempts logged
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-50/80 p-4 dark:bg-slate-800/40">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase">Practice Questions</span>
                                    <CheckSquare size={16} className="text-purple-600" />
                                </div>
                                <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                                    {currentKit.practice_questions?.length || 5} Questions
                                </div>
                                <p className="mt-2 text-[10px] text-slate-400">
                                    Short, long, conceptual & formula-based
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access Grid to Sub-Modules */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div
                            onClick={() => setActiveTab('takeaways')}
                            className="cursor-pointer rounded-xl border border-slate-200/90 bg-white p-5 shadow-saas hover:border-indigo-400 transition dark:border-slate-800 dark:bg-slate-900"
                        >
                            <Lightbulb size={20} className="text-amber-500 mb-2" />
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                Key Takeaways & Revision Sheets
                            </h4>
                            <p className="mt-1 text-xs text-slate-500">
                                3 revision modes: 1-Page Cram Sheet, Detailed Review, and Last-Minute Exam Prep + PDF export.
                            </p>
                        </div>

                        <div
                            onClick={() => setActiveTab('mcqs')}
                            className="cursor-pointer rounded-xl border border-slate-200/90 bg-white p-5 shadow-saas hover:border-indigo-400 transition dark:border-slate-800 dark:bg-slate-900"
                        >
                            <HelpCircle size={20} className="text-purple-500 mb-2" />
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                MCQ Practice Bank
                            </h4>
                            <p className="mt-1 text-xs text-slate-500">
                                Grounded questions with 4 options, explanations, topic tags, and lecture citations.
                            </p>
                        </div>

                        <div
                            onClick={() => setActiveTab('practice')}
                            className="cursor-pointer rounded-xl border border-slate-200/90 bg-white p-5 shadow-saas hover:border-indigo-400 transition dark:border-slate-800 dark:bg-slate-900"
                        >
                            <FileText size={20} className="text-indigo-500 mb-2" />
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                Practice Questions & AI Grading
                            </h4>
                            <p className="mt-1 text-xs text-slate-500">
                                5 question formats with interactive answer drafting and AI formative evaluation.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* TAB 1: KEY TAKEAWAYS & REVISION SHEETS */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'takeaways' && (
                <div className="space-y-6">
                    {/* Mode Selector & Actions Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center space-x-1.5 overflow-x-auto">
                            {[
                                { id: 'one_page', label: 'One-Page Revision Sheet' },
                                { id: 'detailed', label: 'Detailed Revision Sheet' },
                                { id: 'last_minute', label: 'Last-Minute Exam Summary' },
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setRevisionMode(m.id as any)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0 ${
                                        revisionMode === m.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={handleCopyTakeaways}
                                className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                                <Copy size={13} />
                                <span>{copiedTakeaways ? 'Copied!' : 'Copy Takeaways'}</span>
                            </button>

                            <a
                                href={lectraApi.getStudyKitPdfUrl(currentKit.id, revisionMode)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0B132B] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 transition dark:bg-indigo-600"
                            >
                                <Download size={13} />
                                <span>Download PDF</span>
                            </a>
                        </div>
                    </div>

                    {/* Mode Content Viewer */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-6">
                        {revisionMode === 'one_page' && (
                            <div className="space-y-6">
                                <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                                        High-Yield Overview
                                    </span>
                                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                                        One-Page Condensed Revision Sheet
                                    </h3>
                                </div>
                                <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 bg-slate-50/60 p-5 rounded-xl border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800">
                                    {currentKit.one_page_summary ||
                                        'No one-page summary generated. Please regenerate kit to populate.'}
                                </div>
                            </div>
                        )}

                        {revisionMode === 'detailed' && (
                            <div className="space-y-6">
                                <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                                        Comprehensive Analysis
                                    </span>
                                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                                        Detailed Chapter Revision Sheet
                                    </h3>
                                </div>
                                <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 bg-slate-50/60 p-5 rounded-xl border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800">
                                    {currentKit.detailed_summary ||
                                        'No detailed summary generated. Please regenerate kit to populate.'}
                                </div>
                            </div>
                        )}

                        {revisionMode === 'last_minute' && (
                            <div className="space-y-6">
                                <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                                        Pre-Exam Cramming
                                    </span>
                                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                                        Last-Minute Exam Summary (Must-Know Items)
                                    </h3>
                                </div>
                                <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 bg-slate-50/60 p-5 rounded-xl border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800">
                                    {currentKit.last_minute_summary ||
                                        'No last-minute summary generated. Please regenerate kit to populate.'}
                                </div>
                            </div>
                        )}

                        {/* Interactive Key Takeaways Checklist */}
                        <div className="border-t border-slate-100 pt-6 dark:border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                    Interactive Concept Checklist ({currentKit.key_takeaways?.length || 0})
                                </h4>
                                <span className="text-[11px] text-slate-400">
                                    Click item to mark as mastered
                                </span>
                            </div>

                            <div className="space-y-2">
                                {(currentKit.key_takeaways || []).map((takeaway, idx) => {
                                    const isChecked = !!masteredTakeaways[idx];
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() =>
                                                setMasteredTakeaways((prev) => ({
                                                    ...prev,
                                                    [idx]: !prev[idx],
                                                }))
                                            }
                                            className={`flex cursor-pointer items-start justify-between rounded-xl border p-3.5 transition ${
                                                isChecked
                                                    ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                                                    : 'border-slate-200/80 bg-slate-50/60 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-800/40'
                                            }`}
                                        >
                                            <div className="flex items-start space-x-3">
                                                <div
                                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold ${
                                                        isChecked
                                                            ? 'border-emerald-600 bg-emerald-600 text-white'
                                                            : 'border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900'
                                                    }`}
                                                >
                                                    {isChecked ? <Check size={12} /> : idx + 1}
                                                </div>
                                                <p
                                                    className={`text-xs leading-relaxed ${
                                                        isChecked
                                                            ? 'line-through text-slate-400'
                                                            : 'text-slate-800 dark:text-slate-200 font-medium'
                                                    }`}
                                                >
                                                    {takeaway}
                                                </p>
                                            </div>
                                            <span className="ml-3 shrink-0 text-[10px] font-semibold text-slate-400">
                                                {isChecked ? 'Mastered' : 'Mark Done'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* TAB 2: MCQ BANK */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'mcqs' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-5 py-3.5 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                                Grounded MCQ Bank • {currentKit.chapter}
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Questions derived directly from Master Note definitions, proofs, and professor emphasis.
                            </p>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
                                <button
                                    key={diff}
                                    type="button"
                                    onClick={() => setDifficultyFilter(diff)}
                                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase transition ${
                                        difficultyFilter === diff
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                >
                                    {diff}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {filteredMcqs.map((q, qIndex) => {
                            const userSelected = selectedMcqOption[q.id];
                            const isAnswered = userSelected !== undefined;
                            return (
                                <div
                                    key={q.id}
                                    className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0B132B] text-xs font-bold text-white dark:bg-indigo-600">
                                                {qIndex + 1}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-500">
                                                {q.topic_reference}
                                            </span>
                                            {q.source_reference && (
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                    Ref: {q.source_reference}
                                                </span>
                                            )}
                                        </div>
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                                                q.difficulty === 'hard'
                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400'
                                                    : q.difficulty === 'medium'
                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400'
                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400'
                                            }`}
                                        >
                                            {q.difficulty}
                                        </span>
                                    </div>

                                    <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                        {q.question}
                                    </h3>

                                    <div className="mt-4 space-y-2">
                                        {q.options.map((opt, optIdx) => {
                                            const isSelected = userSelected === optIdx;
                                            const isCorrect = q.correct_option_index === optIdx;
                                            let optionClass =
                                                'border-slate-200 bg-slate-50/70 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-800/60';

                                            if (isAnswered) {
                                                if (isCorrect) {
                                                    optionClass =
                                                        'border-emerald-500 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold';
                                                } else if (isSelected) {
                                                    optionClass =
                                                        'border-rose-400 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-semibold';
                                                }
                                            }

                                            return (
                                                <button
                                                    key={optIdx}
                                                    type="button"
                                                    onClick={() => handleSelectOption(q.id, optIdx)}
                                                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-xs transition ${optionClass}`}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 text-[10px] font-bold text-slate-600 dark:border-slate-700">
                                                            {String.fromCharCode(65 + optIdx)}
                                                        </span>
                                                        <span>{opt}</span>
                                                    </div>
                                                    {isAnswered && isCorrect && (
                                                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                                    )}
                                                    {isAnswered && isSelected && !isCorrect && (
                                                        <XCircle size={16} className="text-rose-600 shrink-0" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {isAnswered && (
                                        <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs dark:border-indigo-900 dark:bg-indigo-950/40">
                                            <span className="font-bold text-indigo-800 dark:text-indigo-300 block mb-0.5">
                                                Grounded Explanation:
                                            </span>
                                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {q.explanation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* TAB 3: TIMED INTERACTIVE QUIZ & ATTEMPTS HISTORY */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'quiz' && (
                <div className="space-y-6">
                    {!quizStarted ? (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            {/* Start Quiz Card */}
                            <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-saas dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mx-auto dark:bg-indigo-950 dark:text-indigo-400 mb-4">
                                    <Timer size={28} />
                                </div>
                                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                                    {currentKit.title} • Midterm Practice Quiz
                                </h2>
                                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                                    Test your mastery under timed examination conditions across {currentKit.mcqs?.length || 0} grounded questions.
                                </p>

                                <div className="mt-6 grid grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl dark:bg-slate-800 text-left">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                            Questions
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-white">
                                            {currentKit.mcqs?.length || 0} Items
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                            Time Limit
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-white">10 Minutes</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                            Passing Mark
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-white">70% Threshold</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleStartQuiz}
                                    className="mt-6 w-full rounded-xl bg-[#0B132B] hover:bg-indigo-600 py-3 text-xs font-semibold text-white shadow-xs transition dark:bg-indigo-600"
                                >
                                    Start Timed Quiz Now
                                </button>
                            </div>

                            {/* Past Quiz Attempts Table */}
                            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                                    <span>Historical Quiz Attempts</span>
                                    <span className="text-[11px] font-normal text-slate-400">
                                        {quizAttempts.length} attempts recorded
                                    </span>
                                </h3>

                                {quizAttempts.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-6">
                                        No quiz attempts yet. Start the quiz above to record your first score!
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {quizAttempts.map((att, idx) => (
                                            <div
                                                key={att.id || idx}
                                                className="py-3 flex items-center justify-between text-xs"
                                            >
                                                <div>
                                                    <div className="font-bold text-slate-800 dark:text-white">
                                                        Attempt #{quizAttempts.length - idx} • {att.score} / {att.total}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {new Date(att.created_at || Date.now()).toLocaleString()} • {att.time_taken_seconds}s
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span
                                                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                                            att.passed
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                                        }`}
                                                    >
                                                        {att.percentage}% {att.passed ? 'Passed' : 'Needs Review'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : quizSubmitted ? (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            {/* Quiz Results Card */}
                            <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-saas dark:border-slate-800 dark:bg-slate-900">
                                <div
                                    className={`flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-3 ${
                                        quizResult?.passed
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                                    }`}
                                >
                                    <Award size={28} />
                                </div>
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                        quizResult?.passed
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    }`}
                                >
                                    {quizResult?.passed ? 'Passed Examination Standard' : 'Review Recommended'}
                                </span>
                                <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-white">
                                    Score: {quizResult?.percentage}%
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Answered {quizResult?.score} of {quizResult?.total} correctly in {quizResult?.time_taken_seconds} seconds.
                                </p>

                                {/* Topic Performance Breakdown */}
                                {quizResult?.topic_performance && (
                                    <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800 text-left">
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                            Topic Performance Breakdown
                                        </h4>
                                        <div className="space-y-2">
                                            {Object.entries(quizResult.topic_performance).map(
                                                ([topic, stats]: any) => {
                                                    const pct = Math.round((stats.correct / stats.total) * 100);
                                                    return (
                                                        <div
                                                            key={topic}
                                                            className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg dark:bg-slate-800"
                                                        >
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {topic}
                                                            </span>
                                                            <span
                                                                className={`font-bold ${
                                                                    pct >= 70
                                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                                        : 'text-amber-600 dark:text-amber-400'
                                                                }`}
                                                            >
                                                                {stats.correct} / {stats.total} ({pct}%)
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Question Review Accordion */}
                                {quizResult?.detailed_breakdown && (
                                    <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800 text-left space-y-3">
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                            Question-By-Question Review
                                        </h4>
                                        {quizResult.detailed_breakdown.map((item: any, idx: number) => (
                                            <div
                                                key={item.question_id || idx}
                                                className={`p-3.5 rounded-xl border text-xs ${
                                                    item.is_correct
                                                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20'
                                                        : 'border-rose-200 bg-rose-50/50 dark:border-rose-950 dark:bg-rose-950/20'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between font-bold">
                                                    <span>Q{idx + 1}: {item.question}</span>
                                                    {item.is_correct ? (
                                                        <span className="text-emerald-600 flex items-center space-x-1">
                                                            <CheckCircle2 size={14} />
                                                            <span>Correct</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-rose-600 flex items-center space-x-1">
                                                            <XCircle size={14} />
                                                            <span>Incorrect</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-slate-600 dark:text-slate-300">
                                                    <span className="font-semibold">Explanation: </span>
                                                    {item.explanation}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-6 flex items-center justify-center space-x-3">
                                    <button
                                        type="button"
                                        onClick={handleStartQuiz}
                                        className="rounded-lg bg-[#0B132B] px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600 transition dark:bg-indigo-600"
                                    >
                                        Retake Quiz
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setQuizStarted(false)}
                                        className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    >
                                        Back to Overview
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Active Timed Quiz Session */
                        <div className="max-w-2xl mx-auto space-y-5">
                            {/* Top Sticky Header with Navigation Pills */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-bold text-slate-800 dark:text-white">
                                        Question {quizCurrentIndex + 1} of {currentKit.mcqs?.length || 0}
                                    </div>
                                    <div
                                        className={`flex items-center space-x-1.5 font-mono text-xs font-bold px-3 py-1 rounded-lg ${
                                            quizSecondsRemaining < 120
                                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                                                : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                                        }`}
                                    >
                                        <Timer size={14} />
                                        <span>{formatTimer(quizSecondsRemaining)}</span>
                                    </div>
                                </div>

                                {/* Question Jumper Pills */}
                                <div className="flex items-center space-x-1.5 overflow-x-auto pt-1">
                                    {(currentKit.mcqs || []).map((q, idx) => {
                                        const isAnswered = quizAnswers[q.id] !== undefined;
                                        const isCurrent = quizCurrentIndex === idx;
                                        return (
                                            <button
                                                key={q.id}
                                                type="button"
                                                onClick={() => setQuizCurrentIndex(idx)}
                                                className={`h-7 w-7 rounded-md text-xs font-bold transition flex items-center justify-center shrink-0 ${
                                                    isCurrent
                                                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                                        : isAnswered
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                                }`}
                                            >
                                                {idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Active Question Box */}
                            {(() => {
                                const q = (currentKit.mcqs || [])[quizCurrentIndex];
                                if (!q) return null;
                                const selected = quizAnswers[q.id];
                                return (
                                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-4">
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>Topic: {q.topic_reference}</span>
                                            <span className="uppercase text-[10px] font-bold">{q.difficulty}</span>
                                        </div>

                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                                            {q.question}
                                        </h3>

                                        <div className="space-y-2 pt-2">
                                            {q.options.map((opt, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() =>
                                                        setQuizAnswers((prev) => ({ ...prev, [q.id]: idx }))
                                                    }
                                                    className={`flex w-full items-center space-x-3 rounded-lg border p-3.5 text-left text-xs transition ${
                                                        selected === idx
                                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-950 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                                                            : 'border-slate-200 bg-slate-50/70 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-800'
                                                    }`}
                                                >
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold">
                                                        {String.fromCharCode(65 + idx)}
                                                    </span>
                                                    <span>{opt}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Prev / Next / Submit Controls */}
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setQuizCurrentIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={quizCurrentIndex === 0}
                                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                >
                                    Previous
                                </button>

                                <div className="flex items-center space-x-2">
                                    {quizCurrentIndex < (currentKit.mcqs?.length || 0) - 1 ? (
                                        <button
                                            type="button"
                                            onClick={() => setQuizCurrentIndex((prev) => prev + 1)}
                                            className="rounded-lg bg-[#0B132B] px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-600 dark:bg-indigo-600"
                                        >
                                            Next Question
                                        </button>
                                    ) : null}

                                    <button
                                        type="button"
                                        onClick={handleQuizSubmit}
                                        className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                                    >
                                        Submit Quiz ({Object.keys(quizAnswers).length}/{currentKit.mcqs?.length || 0})
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* TAB 4: FLASHCARDS (3D FLIP & PERSISTENCE) */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'flashcards' && (
                <div className="max-w-2xl mx-auto space-y-5">
                    {/* Top Deck Controls */}
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <div className="flex items-center space-x-2">
                            <span>
                                Flashcard {cardIndex + 1} of {activeFlashcardsList.length}
                            </span>
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {currentCard?.topic_tag}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleShuffleCards}
                            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                            <Shuffle size={13} />
                            <span>Shuffle Deck</span>
                        </button>
                    </div>

                    {/* 3D Perspective Flip Card */}
                    <div
                        style={{ perspective: '1000px' }}
                        className="w-full cursor-pointer min-h-[300px]"
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        <div
                            style={{
                                transformStyle: 'preserve-3d',
                                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            className="relative w-full min-h-[300px] rounded-2xl border border-slate-200/90 bg-white shadow-saas-md dark:border-slate-800 dark:bg-slate-900"
                        >
                            {/* Front Side */}
                            <div
                                style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                }}
                                className={`absolute inset-0 flex flex-col justify-between p-8 text-center rounded-2xl ${
                                    isFlipped ? 'pointer-events-none' : ''
                                }`}
                            >
                                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    Concept Question • Click to Reveal Answer
                                </div>

                                <div className="my-auto py-4">
                                    <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                                        {currentCard?.question || currentCard?.front}
                                    </h3>
                                </div>

                                <div className="text-[11px] text-slate-400 font-medium">
                                    Click anywhere or press Space to flip card
                                </div>
                            </div>

                            {/* Back Side */}
                            <div
                                style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                }}
                                className={`absolute inset-0 flex flex-col justify-between p-8 text-center rounded-2xl bg-indigo-50/30 dark:bg-slate-900/90 ${
                                    !isFlipped ? 'pointer-events-none' : ''
                                }`}
                            >
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    Verified Master Answer & Principles
                                </div>

                                <div className="my-auto py-4 space-y-3 overflow-y-auto max-h-[180px]">
                                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                                        {currentCard?.answer || currentCard?.back}
                                    </h3>
                                    {currentCard?.explanation && (
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            {currentCard.explanation}
                                        </p>
                                    )}
                                </div>

                                <div className="text-[11px] text-slate-400 font-medium">
                                    Click to flip back
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Navigation & Progress Marking */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handlePrevCard}
                            className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 w-full sm:w-auto justify-center"
                        >
                            <ChevronLeft size={15} />
                            <span>Previous</span>
                        </button>

                        <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
                            <button
                                type="button"
                                onClick={() => handleSetCardStatus('needs_review')}
                                className="rounded-lg px-3.5 py-2 text-xs font-semibold border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300 transition"
                            >
                                Needs Revision
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetCardStatus('mastered')}
                                className="rounded-lg px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition"
                            >
                                Mark as Known
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextCard}
                            className="inline-flex items-center space-x-1 rounded-lg bg-[#0B132B] hover:bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition dark:bg-indigo-600 w-full sm:w-auto justify-center"
                        >
                            <span>Next Card</span>
                            <ChevronRight size={15} />
                        </button>
                    </div>

                    {/* Persisted Mastery Status Bar */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            <span>Deck Mastery Progress</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {currentKit.progress?.cards_mastered || 0} of {activeFlashcardsList.length} Known
                            </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full transition-all duration-300"
                                style={{
                                    width: `${
                                        ((currentKit.progress?.cards_mastered || 0) /
                                            Math.max(1, activeFlashcardsList.length)) *
                                        100
                                    }%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* TAB 5: PRACTICE QUESTIONS & AI FORMATIVE EVALUATION */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'practice' && (
                <div className="space-y-6">
                    {/* Header & Category Filters */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                                Multi-Format Practice Questions & Formative Evaluation
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Short, long, conceptual, application, and formula questions evaluated against grounded rubrics.
                            </p>
                        </div>

                        <div className="flex items-center space-x-1.5 overflow-x-auto">
                            {[
                                { id: 'all', label: 'All Questions' },
                                { id: 'short_answer', label: 'Short' },
                                { id: 'long_answer', label: 'Long' },
                                { id: 'conceptual', label: 'Conceptual' },
                                { id: 'application', label: 'Application' },
                                { id: 'formula_based', label: 'Formula' },
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setPracticeCategory(cat.id)}
                                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition shrink-0 ${
                                        practiceCategory === cat.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-5">
                        {((currentKit.practice_questions || []) as PracticeQuestionItem[])
                            .filter(
                                (pq) =>
                                    practiceCategory === 'all' ||
                                    pq.question_type === practiceCategory
                            )
                            .map((pq, idx) => {
                                const evaluation = evaluations[pq.id];
                                const isRevealed = !!revealedModelAnswers[pq.id];
                                const currentAnswer = studentAnswers[pq.id] || '';
                                const isEvaluating = evaluatingQuestionId === pq.id;

                                return (
                                    <div
                                        key={pq.id || idx}
                                        className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-4"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                                                    {pq.question_type.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-500">
                                                    {pq.topic}
                                                </span>
                                            </div>
                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-400">
                                                {pq.difficulty}
                                            </span>
                                        </div>

                                        <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                                            {pq.question}
                                        </h4>

                                        {/* Student Answer Input Box */}
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                Your Draft Answer:
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={currentAnswer}
                                                onChange={(e) =>
                                                    setStudentAnswers((prev) => ({
                                                        ...prev,
                                                        [pq.id]: e.target.value,
                                                    }))
                                                }
                                                placeholder="Write your answer here to evaluate against the professor's core rubrics..."
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                                            />
                                        </div>

                                        {/* Actions: AI Evaluation & Model Answer Toggle */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleEvaluatePractice(pq.id)}
                                                disabled={isEvaluating}
                                                className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0B132B] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-50 transition dark:bg-indigo-600"
                                            >
                                                {isEvaluating ? (
                                                    <>
                                                        <RefreshCw size={13} className="animate-spin" />
                                                        <span>Evaluating with Rubric...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles size={13} />
                                                        <span>Evaluate Answer with AI</span>
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setRevealedModelAnswers((prev) => ({
                                                        ...prev,
                                                        [pq.id]: !prev[pq.id],
                                                    }))
                                                }
                                                className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                            >
                                                {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                                <span>{isRevealed ? 'Hide Model Answer' : 'Show Model Answer & Rubric'}</span>
                                            </button>
                                        </div>

                                        {/* AI Formative Feedback Box */}
                                        {evaluation && (
                                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs dark:border-indigo-950 dark:bg-indigo-950/30 space-y-3 animate-fade-in">
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5 dark:border-indigo-900">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                                                            Score: {evaluation.score} / 10
                                                        </span>
                                                        <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                                                            Formative Diagnostic
                                                        </span>
                                                    </div>
                                                    {/* MANDATORY DISCLAIMER BADGE */}
                                                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                        AI Formative Feedback (Not an authoritative instructor grade)
                                                    </span>
                                                </div>

                                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                    {evaluation.feedback}
                                                </p>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                    <div className="rounded-lg bg-emerald-50/70 p-2.5 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900">
                                                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block mb-1">
                                                            Strengths Detected
                                                        </span>
                                                        <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                                                            {evaluation.strengths.map((s, i) => (
                                                                <li key={i}>• {s}</li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="rounded-lg bg-rose-50/70 p-2.5 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900">
                                                        <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase block mb-1">
                                                            Missed Rubric Points
                                                        </span>
                                                        <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                                                            {(evaluation.missing_key_points || []).map((m: string, i: number) => (
                                                                <li key={i}>• {m}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Model Answer & Key Points (Revealed) */}
                                        {isRevealed && (
                                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/50 space-y-2 animate-fade-in">
                                                <div className="font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-wider">
                                                    Authoritative Model Answer:
                                                </div>
                                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                                    {pq.model_answer}
                                                </p>

                                                {pq.rubric_explanation && (
                                                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                                                        <span className="font-bold text-[10px] text-slate-500 uppercase block mb-1">
                                                            Grading Rubric Rationale:
                                                        </span>
                                                        <p className="text-slate-600 dark:text-slate-400">
                                                            {pq.rubric_explanation}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* TAB 6: EXAM PRIORITY ANALYSIS DASHBOARD */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'exam-priority' && (
                <div className="space-y-6">
                    {/* MANDATORY TOP DISCLAIMER BANNER */}
                    <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200 flex items-center space-x-3 shadow-xs">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                        <div>
                            <span className="font-bold block uppercase text-[11px] tracking-wider">
                                Non-Predictive Syllabus Diagnostic
                            </span>
                            <p className="mt-0.5 leading-relaxed">
                                Exam Priority Analysis reflects lecture coverage and syllabus weighting, not exact future examination questions.
                            </p>
                        </div>
                    </div>

                    {/* Dual Column: Lecture Emphasized Topics vs AI Inferred Priority */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Column 1: Actual Lecture Emphasis */}
                        <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-saas dark:border-indigo-950 dark:bg-slate-900 space-y-4">
                            <div className="flex items-center justify-between border-b border-indigo-100 pb-3 dark:border-indigo-900">
                                <div className="flex items-center space-x-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0B132B] text-white dark:bg-indigo-600">
                                        <GraduationCap size={14} />
                                    </span>
                                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                                        Topics Emphasized in Lecture Notes
                                    </h3>
                                </div>
                                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                                    Lecturer Stated Emphasis
                                </span>
                            </div>

                            <p className="text-xs text-slate-500">
                                Specifically marked by {currentKit.professor || 'the professor'} during board discussions, verbal callouts, or lecture slides.
                            </p>

                            <div className="space-y-3">
                                {((currentKit.exam_priority_analysis?.lecture_emphasis_topics as ExamPriorityTopic[]) || [
                                    {
                                        topic: 'State Machine Replication Safety',
                                        priority_level: 'Critical',
                                        category: 'lecture_emphasis',
                                        source_evidence: 'Explicitly flagged as mandatory midterm question during Section lecture',
                                        frequency_score: 3,
                                        is_lecturer_stated: true,
                                        reasoning: 'Core state machine safety theorem',
                                    },
                                    {
                                        topic: 'Leader Election Split-Vote Resolution',
                                        priority_level: 'High',
                                        category: 'lecture_emphasis',
                                        source_evidence: 'Instructor highlighted randomized election timeouts on blackboard',
                                        frequency_score: 2,
                                        is_lecturer_stated: true,
                                        reasoning: 'Directly tested in previous exam cycles',
                                    },
                                ]).map((item, i) => (
                                    <div
                                        key={i}
                                        className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/20"
                                    >
                                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                                            <span>{item.topic}</span>
                                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] uppercase font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                {item.priority_level}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-slate-600 dark:text-slate-300 italic text-[11px]">
                                            "{item.source_evidence}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Column 2: Inferred AI Priority */}
                        <div className="rounded-2xl border border-purple-200 bg-white p-6 shadow-saas dark:border-purple-950 dark:bg-slate-900 space-y-4">
                            <div className="flex items-center justify-between border-b border-purple-100 pb-3 dark:border-purple-900">
                                <div className="flex items-center space-x-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-600 text-white">
                                        <Brain size={14} />
                                    </span>
                                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                                        Topics Repeated Across Sections
                                    </h3>
                                </div>
                                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300 uppercase">
                                    AI Inferred Priority
                                </span>
                            </div>

                            <p className="text-xs text-slate-500">
                                Inferred based on cross-sectional coverage across Sections A through I and syllabus weightings.
                            </p>

                            <div className="space-y-3">
                                {((currentKit.exam_priority_analysis?.cross_section_recurring_topics as ExamPriorityTopic[]) || [
                                    {
                                        topic: 'Log Matching Property & Induction Proof',
                                        priority_level: 'High',
                                        category: 'cross_section_recurring',
                                        source_evidence: 'Appears in 8 out of 9 section vaults as primary discussion point',
                                        frequency_score: 8,
                                        is_lecturer_stated: false,
                                        reasoning: 'Recurring consensus fundamental across sections',
                                    },
                                    {
                                        topic: 'Joint Consensus for Cluster Membership Changes',
                                        priority_level: 'Medium',
                                        category: 'cross_section_recurring',
                                        source_evidence: 'Frequently cited in homework problems and discussion notes',
                                        frequency_score: 5,
                                        is_lecturer_stated: false,
                                        reasoning: 'Cluster membership transitions',
                                    },
                                ]).map((item, i) => (
                                    <div
                                        key={i}
                                        className="rounded-xl border border-purple-100 bg-purple-50/40 p-3.5 text-xs dark:border-purple-900/60 dark:bg-purple-950/20"
                                    >
                                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                                            <span>{item.topic}</span>
                                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] uppercase font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                                {item.priority_level} ({item.frequency_score} Sections)
                                            </span>
                                        </div>
                                        <p className="mt-1 text-slate-600 dark:text-slate-300 text-[11px]">
                                            {item.source_evidence}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Critical Formulas Table with Exam Frequency */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-4">
                        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                            Critical Formulas & Equations with Historical Exam Frequency
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                                        <th className="py-2.5">Formula / Principle</th>
                                        <th className="py-2.5">Description</th>
                                        <th className="py-2.5">Exam Frequency Weight</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {(
                                        currentKit.exam_priority_analysis?.critical_formulas || [
                                            {
                                                formula: 'Q = floor(N / 2) + 1',
                                                description: 'Quorum Rule for Fault Tolerance',
                                                weight: 'Critical (Every Midterm)',
                                            },
                                            {
                                                formula: 'T_heartbeat << T_election << MTBF',
                                                description: 'Leader Heartbeat Interval Timing Invariant',
                                                weight: 'High Probability',
                                            },
                                            {
                                                formula: 'Attention(Q,K,V) = softmax((QK^T)/sqrt(d_k))V',
                                                description: 'Scaled Dot-Product Attention Core Mechanics',
                                                weight: 'High Probability',
                                            },
                                        ]
                                    ).map((item, i) => (
                                        <tr key={i} className="py-2">
                                            <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                {item.formula}
                                            </td>
                                            <td className="py-3 font-medium text-slate-700 dark:text-slate-300">
                                                {item.description}
                                            </td>
                                            <td className="py-3">
                                                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                                    {item.weight}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Professor References Concepts */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Concepts Appearing in Professor References & Literature
                        </h4>
                        <div className="space-y-2">
                            {(
                                currentKit.exam_priority_analysis?.professor_reference_concepts || [
                                    {
                                        concept: 'Raft Paper Section 5.2',
                                        reference: 'Ongaro & Ousterhout (2014)',
                                        importance: 'Leader Election Safety Invariant Proof',
                                    },
                                    {
                                        concept: 'Paxos Understandability',
                                        reference: 'Lamport Paxos Made Simple',
                                        importance: 'Trade-offs and Invariants',
                                    },
                                    {
                                        concept: 'Distributed Snapshots',
                                        reference: 'Chandy-Lamport',
                                        importance: 'State Machine compaction',
                                    },
                                ]
                            ).map((ref, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300"
                                >
                                    <BookMarked size={14} className="text-indigo-600 shrink-0" />
                                    <span>
                                        {typeof ref === 'string' ? (
                                            ref
                                        ) : (
                                            <>
                                                <strong>{ref.concept}</strong> — {ref.reference} ({ref.importance})
                                            </>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: Edit Study Kit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                                Edit Study Kit
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Kit Title
                                </label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Key Takeaways (one per line)
                                </label>
                                <textarea
                                    rows={4}
                                    value={editTakeaways}
                                    onChange={(e) => setEditTakeaways(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white font-mono"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    One-Page Revision Sheet Text
                                </label>
                                <textarea
                                    rows={4}
                                    value={editOnePage}
                                    onChange={(e) => setEditOnePage(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Last-Minute Summary Text
                                </label>
                                <textarea
                                    rows={3}
                                    value={editLastMinute}
                                    onChange={(e) => setEditLastMinute(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end space-x-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={isSavingEdit}
                                className="rounded-lg bg-[#0B132B] px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-600 dark:bg-indigo-600"
                            >
                                {isSavingEdit ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mx-auto dark:bg-rose-950 dark:text-rose-400 mb-3">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                            Delete Study Kit?
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Are you sure you want to delete <span className="font-bold">"{currentKit.title}"</span>? All quiz attempts and flashcard progress for this kit will be permanently removed.
                        </p>
                        <div className="mt-6 flex items-center justify-center space-x-2.5">
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteKit}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                                Delete Kit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
