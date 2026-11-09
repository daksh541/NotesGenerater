import React, { useState } from 'react';
import {
    Sparkles,
    UploadCloud,
    BookOpen,
    Download,
    ArrowRight,
    FileText,
    CheckCircle2,
    Calendar,
    ChevronRight,
    GraduationCap,
    Clock,
} from 'lucide-react';
import {
    DashboardMetrics,
    MasterNoteContent,
    ProfessorProfile,
    SectionId,
    SubjectModel,
    UploadedSourceItem,
    UserProfile,
    WorkspaceModel,
} from '../../types/lectra';

interface DashboardViewProps {
    userProfile: UserProfile;
    metrics: DashboardMetrics;
    subjects: SubjectModel[];
    recentNotes: MasterNoteContent[];
    professors: ProfessorProfile[];
    workspaces?: WorkspaceModel[];
    uploadHistory?: UploadedSourceItem[];
    currentSection: SectionId;
    onOpenStudio: (initialUploadMode?: 'whiteboard' | 'pdf') => void;
    onOpenVault: () => void;
    onOpenStudyKit: (lectureId?: string) => void;
    onOpenChat?: () => void;
    onViewMasterNote: (note: MasterNoteContent) => void;
    onDownloadNote: (lectureId: string, format: 'pdf' | 'docx' | 'markdown') => void;
    onSelectSubject?: (subject: SubjectModel) => void;
    onRefreshDashboard?: () => void;
    onNotify?: (msg: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
    userProfile,
    metrics,
    subjects,
    recentNotes,
    currentSection,
    onOpenStudio,
    onOpenVault,
    onOpenStudyKit,
    onOpenChat,
    onViewMasterNote,
    onDownloadNote,
    onSelectSubject,
}) => {
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const firstName = userProfile.full_name
        ? userProfile.full_name.split(' ')[0]
        : 'Student';

    const formatDate = (isoString: string) => {
        if (!isoString) return 'Recent';
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return isoString.slice(0, 10);
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return 'Recent';
        }
    };

    // 4–6 most recent Master Notes
    const displayNotes = recentNotes.slice(0, 6);

    // 3 most active subjects
    const displaySubjects = subjects.slice(0, 3);

    const handleDownload = (e: React.MouseEvent, note: MasterNoteContent) => {
        e.stopPropagation();
        setDownloadingId(note.lecture_id);
        onDownloadNote(note.lecture_id, 'pdf');
        setTimeout(() => setDownloadingId(null), 1200);
    };

    return (
        <div className="space-y-7 pb-12 animate-fade-in max-w-6xl mx-auto">
            {/* 1. Compact Welcome Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Welcome back, {firstName}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Your classroom knowledge, organized and ready to study.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    {onOpenChat && (
                        <button
                            type="button"
                            onClick={onOpenChat}
                            className="inline-flex items-center space-x-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-800 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-2xs transition hover:bg-indigo-100 dark:hover:bg-indigo-900/60 focus:outline-none"
                        >
                            <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                            <span>Notebook Chat</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onOpenVault}
                        className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1 px-1"
                    >
                        <span>Section Vault</span>
                        <ArrowRight size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpenStudio()}
                        className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500 focus:outline-none"
                    >
                        <Sparkles size={14} />
                        <span>+ Create Master Notes</span>
                    </button>
                </div>
            </div>

            {/* 2. Main 3-Step Guided Workflow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                    type="button"
                    onClick={() => onOpenStudio('whiteboard')}
                    className="group relative flex flex-col text-left p-4 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-xs transition dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                            1
                        </span>
                        <UploadCloud size={16} className="text-slate-400 group-hover:text-indigo-600 transition" />
                    </div>
                    <div className="mt-3">
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            Upload Materials
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Photos of classroom whiteboards, slides, or reference PDFs
                        </p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => onOpenStudio()}
                    className="group relative flex flex-col text-left p-4 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-xs transition dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                            2
                        </span>
                        <Sparkles size={16} className="text-slate-400 group-hover:text-indigo-600 transition" />
                    </div>
                    <div className="mt-3">
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            Generate Master Notes
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            AI synthesizes formulas, definitions, diagrams & proofs
                        </p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => onOpenStudyKit()}
                    className="group relative flex flex-col text-left p-4 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-xs transition dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                            3
                        </span>
                        <BookOpen size={16} className="text-slate-400 group-hover:text-indigo-600 transition" />
                    </div>
                    <div className="mt-3">
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            Study & Revise
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Practice with MCQs, interactive flashcards & revision sheets
                        </p>
                    </div>
                </button>
            </div>

            {/* 3. Recent Master Notes (Most Prominent Dashboard Section) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Recent Master Notes
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Synthesized notes and study documents from your courses
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onOpenVault}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5 transition"
                    >
                        <span>View All</span>
                        <ChevronRight size={13} />
                    </button>
                </div>

                {displayNotes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                        <FileText size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                            No Master Notes generated yet
                        </p>
                        <button
                            type="button"
                            onClick={() => onOpenStudio()}
                            className="mt-3 inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                        >
                            <Sparkles size={13} />
                            <span>Create First Note</span>
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                        {displayNotes.map((note) => (
                            <div
                                key={note.id}
                                onClick={() => onViewMasterNote(note)}
                                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer"
                            >
                                <div className="flex items-center space-x-3 min-w-0">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                                        <FileText size={15} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-xs text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                                {note.chapter || note.title}
                                            </span>
                                            <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                Sec {note.section}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {note.subject_code}
                                            </span>
                                            <span>•</span>
                                            <span className="truncate">{note.professor}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                            <CheckCircle2 size={12} />
                                            <span>Verified</span>
                                        </span>
                                        <span>•</span>
                                        <span>{formatDate(note.created_at || note.updated_at || '')}</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => handleDownload(e, note)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                                        title="Download PDF"
                                    >
                                        <Download size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 4. Academic Overview (Exactly 3 small statistics: Master Notes Created, Uploaded Materials, Study Kits) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-xs font-medium">Master Notes Created</span>
                        <FileText size={15} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {metrics.total_master_notes || recentNotes.length || 0}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Synced
                        </span>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-xs font-medium">Uploaded Materials</span>
                        <UploadCloud size={15} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {metrics.uploaded_sources || 0}
                        </span>
                        <span className="text-[10px] text-slate-400">Whiteboards & PDFs</span>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-xs font-medium">Study Kits</span>
                        <BookOpen size={15} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {metrics.available_study_kits || 0}
                        </span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            MCQs & Cards
                        </span>
                    </div>
                </div>
            </div>

            {/* 5. Enrolled Subjects (Top 3 most active subjects) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Enrolled Subjects
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Active coursework and syllabus chapters
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onOpenVault}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5 transition"
                    >
                        <span>View All Subjects</span>
                        <ChevronRight size={13} />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {displaySubjects.map((s) => (
                        <div
                            key={s.id}
                            onClick={() => {
                                if (onSelectSubject) onSelectSubject(s);
                            }}
                            className="group p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs transition dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 cursor-pointer"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                    {s.code}
                                </span>
                                <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                    {s.chapters_count} Chapters
                                </span>
                            </div>
                            <h3 className="mt-2 text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                                {s.name}
                            </h3>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                <GraduationCap size={12} />
                                <span className="truncate">{s.teacher}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
