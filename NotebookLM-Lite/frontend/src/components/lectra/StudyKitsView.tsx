import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { StudyKit } from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';

interface StudyKitsViewProps {
    studyKits: StudyKit[];
    initialLectureId?: string;
    onViewMasterNote?: (lectureId: string) => void;
}

export const StudyKitsView: React.FC<StudyKitsViewProps> = ({
    studyKits,
    initialLectureId,
    onViewMasterNote,
}) => {
    const [selectedKitIndex, setSelectedKitIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<
        'mcqs' | 'flashcards' | 'quiz' | 'takeaways' | 'revision'
    >('mcqs');

    // Sync initial selection
    useEffect(() => {
        if (initialLectureId && studyKits.length > 0) {
            const idx = studyKits.findIndex((k) => k.lecture_id === initialLectureId);
            if (idx !== -1) setSelectedKitIndex(idx);
        }
    }, [initialLectureId, studyKits]);

    const currentKit = studyKits[selectedKitIndex] || studyKits[0];

    // MCQ Generator state
    const [selectedMcqOption, setSelectedMcqOption] = useState<Record<string, number>>({});
    const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

    // Flashcard deck state
    const [cardIndex, setCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [cardStatus, setCardStatus] = useState<Record<string, 'mastered' | 'needs_review'>>({});

    // Timed Practice Quiz state
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
    const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
    const [quizSecondsRemaining, setQuizSecondsRemaining] = useState(600);
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizResult, setQuizResult] = useState<any>(null);

    // Key Takeaways state
    const [masteredTakeaways, setMasteredTakeaways] = useState<Record<number, boolean>>({});
    const [copiedTakeaways, setCopiedTakeaways] = useState(false);

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

    if (!currentKit) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-16 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                <BookOpen size={36} className="mx-auto mb-3 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                    No Study Kits Available
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                    Generate a Master Note in the AI Notes Studio to automatically create a Study Kit.
                </p>
            </div>
        );
    }

    const currentCard = currentKit.flashcards[cardIndex] || currentKit.flashcards[0];

    const handleSelectOption = (mcqId: string, optIndex: number) => {
        setSelectedMcqOption((prev) => ({ ...prev, [mcqId]: optIndex }));
    };

    const handleNextCard = () => {
        setIsFlipped(false);
        setCardIndex((prev) => (prev + 1) % currentKit.flashcards.length);
    };

    const handlePrevCard = () => {
        setIsFlipped(false);
        setCardIndex(
            (prev) => (prev - 1 + currentKit.flashcards.length) % currentKit.flashcards.length
        );
    };

    const handleStartQuiz = () => {
        setQuizStarted(true);
        setQuizSubmitted(false);
        setQuizAnswers({});
        setQuizCurrentIndex(0);
        setQuizSecondsRemaining(600);
        setQuizResult(null);
    };

    const handleQuizSubmit = async () => {
        setQuizSubmitted(true);
        const timeTaken = 600 - quizSecondsRemaining;
        try {
            const res = await lectraApi.submitQuiz(currentKit.lecture_id, quizAnswers, timeTaken);
            setQuizResult(res);
        } catch (err) {
            console.error('Quiz submit failed:', err);
        }
    };

    const handleCopyTakeaways = () => {
        navigator.clipboard.writeText(currentKit.key_takeaways.join('\n• '));
        setCopiedTakeaways(true);
        setTimeout(() => setCopiedTakeaways(false), 2000);
    };

    const filteredMcqs = currentKit.mcqs.filter(
        (m) => difficultyFilter === 'all' || m.difficulty === difficultyFilter
    );

    return (
        <div className="space-y-6 pb-16 animate-fade-in">
            {/* Header & Kit Switcher */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-200/80 pb-5 dark:border-slate-800">
                <div>
                    <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <Sparkles size={15} />
                        <span>Active Recall & Exam Mastery Suite</span>
                    </div>
                    <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                        Study Kits
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-500">
                        MCQ Generator, Flashcards, Timed Practice Quiz, Key Takeaways, and Exam Revision Sheets.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-500">Active Kit:</span>
                        <select
                            value={selectedKitIndex}
                            onChange={(e) => {
                                setSelectedKitIndex(Number(e.target.value));
                                setCardIndex(0);
                                setIsFlipped(false);
                                setQuizStarted(false);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        >
                            {studyKits.map((k, idx) => (
                                <option key={k.id} value={idx}>
                                    {k.title} ({k.subject_name})
                                </option>
                            ))}
                        </select>
                    </div>

                    {onViewMasterNote && (
                        <button
                            type="button"
                            onClick={() => onViewMasterNote(currentKit.lecture_id)}
                            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <ExternalLink size={13} />
                            <span>View Master Note</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 5 Separate Sub-Interfaces Navigation */}
            <div className="flex items-center space-x-1.5 overflow-x-auto rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                {[
                    {
                        id: 'mcqs',
                        label: `MCQ Generator (${currentKit.mcqs.length})`,
                        icon: HelpCircle,
                    },
                    {
                        id: 'flashcards',
                        label: `Flashcards (${currentKit.flashcards.length})`,
                        icon: Brain,
                    },
                    { id: 'quiz', label: 'Practice Quiz', icon: Timer },
                    {
                        id: 'takeaways',
                        label: `Key Takeaways (${currentKit.key_takeaways.length})`,
                        icon: Lightbulb,
                    },
                    { id: 'revision', label: 'Exam Revision Sheet', icon: FileText },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
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

            {/* INTERFACE 1: MCQ Generator */}
            {activeTab === 'mcqs' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-5 py-3.5 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                                MCQ Generator • {currentKit.chapter}
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Select an option to verify your understanding and view grounded explanations
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

            {/* INTERFACE 2: Flashcards */}
            {activeTab === 'flashcards' && (
                <div className="max-w-2xl mx-auto space-y-5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>
                            Flashcard {cardIndex + 1} of {currentKit.flashcards.length}
                        </span>
                        <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {currentCard.topic_tag}
                        </span>
                    </div>

                    <div
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="cursor-pointer min-h-[260px] rounded-2xl border border-slate-200/90 bg-white p-8 shadow-saas-md dark:border-slate-800 dark:bg-slate-900 transition hover:border-indigo-400 flex flex-col justify-between text-center"
                    >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            {isFlipped ? 'Verified Answer & Proof Context' : 'Prompt Question (Click to Flip)'}
                        </div>

                        <div className="my-auto py-6">
                            {isFlipped ? (
                                <div className="space-y-3 animate-fade-in">
                                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                                        {currentCard.answer}
                                    </h3>
                                    {currentCard.explanation && (
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            {currentCard.explanation}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                                    {currentCard.question}
                                </h3>
                            )}
                        </div>

                        <div className="text-[11px] text-slate-400 font-medium">
                            Click anywhere on card to flip
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handlePrevCard}
                            className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        >
                            <ChevronLeft size={15} />
                            <span>Previous</span>
                        </button>

                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setCardStatus((prev) => ({ ...prev, [currentCard.id]: 'needs_review' }))
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    cardStatus[currentCard.id] === 'needs_review'
                                        ? 'bg-amber-600 text-white'
                                        : 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400'
                                }`}
                            >
                                Needs Review
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setCardStatus((prev) => ({ ...prev, [currentCard.id]: 'mastered' }))
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    cardStatus[currentCard.id] === 'mastered'
                                        ? 'bg-emerald-600 text-white'
                                        : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400'
                                }`}
                            >
                                Mastered
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextCard}
                            className="inline-flex items-center space-x-1 rounded-lg bg-[#0B132B] hover:bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition dark:bg-indigo-600"
                        >
                            <span>Next</span>
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            )}

            {/* INTERFACE 3: Timed Practice Quiz */}
            {activeTab === 'quiz' && (
                <div className="space-y-6">
                    {!quizStarted ? (
                        <div className="rounded-xl border border-slate-200/90 bg-white p-8 text-center shadow-saas dark:border-slate-800 dark:bg-slate-900 max-w-xl mx-auto">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mx-auto dark:bg-indigo-950 dark:text-indigo-400 mb-4">
                                <Timer size={24} />
                            </div>
                            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                                {currentKit.title} • Timed Assessment
                            </h2>
                            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                                Simulate midterm conditions across {currentKit.mcqs.length} high-yield questions derived from your classroom section and reference PDFs.
                            </p>
                            <div className="mt-5 grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl dark:bg-slate-800">
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                        Time Limit
                                    </span>
                                    <span className="font-bold text-slate-800 dark:text-white">10 Minutes</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                        Target Mastery
                                    </span>
                                    <span className="font-bold text-slate-800 dark:text-white">70% to Pass</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleStartQuiz}
                                className="mt-6 w-full rounded-lg bg-[#0B132B] hover:bg-indigo-600 py-3 text-xs font-semibold text-white shadow-xs transition dark:bg-indigo-600"
                            >
                                Start Practice Quiz
                            </button>
                        </div>
                    ) : quizSubmitted ? (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="rounded-xl border border-slate-200/90 bg-white p-8 text-center shadow-saas dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mx-auto dark:bg-emerald-950 dark:text-emerald-400 mb-3">
                                    <Award size={26} />
                                </div>
                                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                                    Score: {quizResult?.percentage}%
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Answered {quizResult?.score} of {quizResult?.total} correctly in{' '}
                                    {quizResult?.time_taken_seconds}s
                                </p>

                                {quizResult?.topic_performance && (
                                    <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800 text-left">
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                            Topic Performance Breakdown
                                        </h4>
                                        <div className="space-y-2">
                                            {Object.entries(quizResult.topic_performance).map(
                                                ([topic, stats]: any) => (
                                                    <div
                                                        key={topic}
                                                        className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg dark:bg-slate-800"
                                                    >
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {topic}
                                                        </span>
                                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                                            {stats.correct} / {stats.total} (
                                                            {((stats.correct / stats.total) * 100).toFixed(0)}%)
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleStartQuiz}
                                    className="mt-6 rounded-lg bg-[#0B132B] px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600 transition dark:bg-indigo-600"
                                >
                                    Retake Practice Quiz
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto space-y-5">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                                <div className="text-xs font-bold text-slate-800 dark:text-white">
                                    Question {quizCurrentIndex + 1} of {currentKit.mcqs.length}
                                </div>
                                <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3 py-1 rounded-lg">
                                    <Timer size={14} />
                                    <span>{formatTimer(quizSecondsRemaining)}</span>
                                </div>
                            </div>

                            {(() => {
                                const q = currentKit.mcqs[quizCurrentIndex];
                                const selected = quizAnswers[q.id];
                                return (
                                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-4">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                                            {q.question}
                                        </h3>
                                        <div className="space-y-2">
                                            {q.options.map((opt, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() =>
                                                        setQuizAnswers((prev) => ({ ...prev, [q.id]: idx }))
                                                    }
                                                    className={`flex w-full items-center space-x-3 rounded-lg border p-3 text-left text-xs transition ${
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

                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setQuizCurrentIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={quizCurrentIndex === 0}
                                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    Previous
                                </button>

                                {quizCurrentIndex < currentKit.mcqs.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => setQuizCurrentIndex((prev) => prev + 1)}
                                        className="rounded-lg bg-[#0B132B] px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-600 dark:bg-indigo-600"
                                    >
                                        Next Question
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleQuizSubmit}
                                        className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                                    >
                                        Submit Quiz
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* INTERFACE 4: Key Takeaways */}
            {activeTab === 'takeaways' && (
                <div className="rounded-xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                Essential Chapter Insights
                            </span>
                            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                                Key Takeaways • {currentKit.chapter}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Check off takeaways as you master each core principle from {currentKit.subject_name}.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyTakeaways}
                            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <Copy size={13} />
                            <span>{copiedTakeaways ? 'Copied All!' : 'Copy Takeaways'}</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {currentKit.key_takeaways.map((takeaway, idx) => {
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
                                    className={`flex cursor-pointer items-start justify-between rounded-xl border p-4 transition ${
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
                                        <div>
                                            <p
                                                className={`text-xs font-medium leading-relaxed ${
                                                    isChecked
                                                        ? 'line-through text-slate-400'
                                                        : 'text-slate-800 dark:text-slate-200'
                                                }`}
                                            >
                                                {takeaway}
                                            </p>
                                            <span className="mt-1 inline-block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                                Synthesized across classroom board & syllabus
                                            </span>
                                        </div>
                                    </div>
                                    <span className="ml-4 shrink-0 text-[10px] font-semibold text-slate-400">
                                        {isChecked ? 'Mastered' : 'Mark Read'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* INTERFACE 5: Exam Revision Sheet */}
            {activeTab === 'revision' && (
                <div className="rounded-xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                One-Page Condensed Cram Sheet
                            </span>
                            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                                Exam Revision Sheet • {currentKit.chapter}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0B132B] px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-600 dark:bg-indigo-600 transition"
                        >
                            <Printer size={13} />
                            <span>Print Revision Sheet</span>
                        </button>
                    </div>

                    {/* Core Definitions & Critical Formulas */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Core Definitions
                            </h3>
                            {(currentKit.revision_sheet?.core_definitions || []).map((def, i) => (
                                <div
                                    key={i}
                                    className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                                >
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        {def.term}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {def.definition}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Critical Formulas
                            </h3>
                            {(currentKit.revision_sheet?.critical_formulas || []).map((eq, i) => (
                                <div
                                    key={i}
                                    className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                                >
                                    <div className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                        {eq.latex_or_text}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                        {eq.explanation}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* High Probability Exam Questions */}
                    {currentKit.revision_sheet?.high_probability_questions && (
                        <div className="space-y-3 pt-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                High-Probability Midterm & Final Questions
                            </h3>
                            <div className="space-y-2.5">
                                {currentKit.revision_sheet.high_probability_questions.map((hp, i) => (
                                    <div
                                        key={i}
                                        className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/40"
                                    >
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            Q: {hp.question}
                                        </div>
                                        <div className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                                Model Answer:{' '}
                                            </span>
                                            {hp.answer}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Professor Tips */}
                    {currentKit.revision_sheet?.professor_tips && (
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs dark:border-indigo-900 dark:bg-indigo-950/40">
                            <h4 className="font-bold text-indigo-950 dark:text-indigo-300 uppercase text-[10px] tracking-wider mb-1.5">
                                Professor Exam Warnings & Grading Tips
                            </h4>
                            <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                                {currentKit.revision_sheet.professor_tips.map((tip, i) => (
                                    <li key={i}>• {tip}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
