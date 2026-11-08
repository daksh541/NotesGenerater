import React, { useEffect, useState } from 'react';
import {
    Sparkles,
    UploadCloud,
    BookOpen,
    ShieldCheck,
    Download,
    ArrowRight,
    Users,
    FileText,
    Calendar,
    Layers,
    CheckCircle2,
    Eye,
    GraduationCap,
    BookMarked,
    FolderLock,
    HardDrive,
    Lock,
    Globe,
    Plus,
    Trash2,
    Search,
    Link2,
} from 'lucide-react';
import {
    DashboardMetrics,
    MasterNoteContent,
    ProfessorProfile,
    SectionId,
    SourceMaterialType,
    StorageBucketType,
    SubjectModel,
    UploadedSourceItem,
    UserProfile,
    VisibilityType,
    WorkspaceModel,
} from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';

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
    workspaces = [],
    uploadHistory = [],
    currentSection,
    onOpenStudio,
    onOpenVault,
    onOpenStudyKit,
    onViewMasterNote,
    onDownloadNote,
    onSelectSubject,
    onRefreshDashboard,
    onNotify,
}) => {
    const [searchFilter, setSearchFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
    const [sectionFilter, setSectionFilter] = useState<string>('ALL');
    const [localWorkspaces, setLocalWorkspaces] = useState<WorkspaceModel[]>(workspaces);
    const [localUploads, setLocalUploads] = useState<UploadedSourceItem[]>(uploadHistory);

    // Workspace creation state
    const [showNewWorkspace, setShowNewWorkspace] = useState(false);
    const [wsTitle, setWsTitle] = useState('');
    const [wsSubjectId, setWsSubjectId] = useState(subjects[0]?.id || 'subj_cs244');
    const [wsSection, setWsSection] = useState<SectionId>(currentSection);
    const [wsVisibility, setWsVisibility] = useState<VisibilityType>('private');
    const [wsCreating, setWsCreating] = useState(false);

    // Direct Supabase Storage Bucket upload state
    const [selectedBucket, setSelectedBucket] = useState<StorageBucketType>('private-student-uploads');
    const [selectedSourceType, setSelectedSourceType] = useState<SourceMaterialType>('whiteboard');
    const [uploadingStorage, setUploadingStorage] = useState(false);
    const [storageError, setStorageError] = useState<string | null>(null);

    useEffect(() => {
        setLocalWorkspaces(workspaces);
    }, [workspaces]);

    useEffect(() => {
        if (uploadHistory && uploadHistory.length > 0) {
            setLocalUploads(uploadHistory);
        } else {
            lectraApi
                .listUploadedSources()
                .then((items) => setLocalUploads(items))
                .catch(() => {});
        }
    }, [uploadHistory]);

    const filteredNotes = recentNotes.filter((n) => {
        if (subjectFilter !== 'ALL' && n.subject_code !== subjectFilter) return false;
        if (sectionFilter !== 'ALL' && n.section !== sectionFilter) return false;
        if (
            searchFilter.trim() &&
            !n.title.toLowerCase().includes(searchFilter.toLowerCase()) &&
            !n.chapter.toLowerCase().includes(searchFilter.toLowerCase()) &&
            !n.subject_code.toLowerCase().includes(searchFilter.toLowerCase())
        ) {
            return false;
        }
        return true;
    });

    const filteredUploads = localUploads.filter((u) => {
        if (!searchFilter.trim()) return true;
        const fname = (u.file_name || u.original_filename || '').toLowerCase();
        const snippet = (u.extracted_text_snippet || '').toLowerCase();
        return fname.includes(searchFilter.toLowerCase()) || snippet.includes(searchFilter.toLowerCase());
    });

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wsTitle.trim()) return;
        setWsCreating(true);
        try {
            const res = await lectraApi.createWorkspace({
                title: wsTitle.trim(),
                name: wsTitle.trim(),
                subject_id: wsSubjectId,
                section: wsSection,
                visibility: wsVisibility,
                university: userProfile.university,
                semester: userProfile.semester || 'Fall 2026',
            });
            setLocalWorkspaces((prev) => [res.workspace, ...prev]);
            setWsTitle('');
            setShowNewWorkspace(false);
            if (onNotify) onNotify(`Workspace "${res.workspace.title || res.workspace.name}" created.`);
            if (onRefreshDashboard) onRefreshDashboard();
        } catch (err: any) {
            setStorageError(err?.response?.data?.detail || 'Could not create workspace.');
        } finally {
            setWsCreating(false);
        }
    };

    const handleDeleteWorkspace = async (wsId: string) => {
        try {
            await lectraApi.deleteWorkspace(wsId);
            setLocalWorkspaces((prev) => prev.filter((w) => w.id !== wsId));
            if (onNotify) onNotify('Workspace deleted.');
            if (onRefreshDashboard) onRefreshDashboard();
        } catch (err: any) {
            setStorageError(err?.response?.data?.detail || 'RLS Policy: Only workspace owners can delete private workspaces.');
        }
    };

    const handleDirectStorageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingStorage(true);
        setStorageError(null);
        try {
            const res = await lectraApi.uploadToStorageBucket({
                file,
                workspace_id: localWorkspaces[0]?.id || 'ws_main',
                bucket: selectedBucket,
                source_type: selectedSourceType,
                visibility: selectedBucket === 'shared-academic-materials' ? 'section' : 'private',
            });
            setLocalUploads((prev) => [res.source, ...prev]);
            if (onNotify) onNotify(`Uploaded "${file.name}" to Supabase bucket "${selectedBucket}".`);
            if (onRefreshDashboard) onRefreshDashboard();
        } catch (err: any) {
            setStorageError(err?.response?.data?.detail || 'File upload failed.');
        } finally {
            setUploadingStorage(false);
            e.target.value = '';
        }
    };

    const handleOpenSignedUrl = async (src: UploadedSourceItem) => {
        setStorageError(null);
        try {
            const bucket = (src.bucket_id || 'private-student-uploads') as StorageBucketType;
            const path = src.storage_path || src.file_path;
            const signed = await lectraApi.createSignedUrl(bucket, path, 3600);
            window.open(signed.signed_url, '_blank', 'noopener,noreferrer');
            if (onNotify) onNotify('Generated HMAC-SHA256 Signed URL (valid 1 hour).');
        } catch (err: any) {
            setStorageError(err?.response?.data?.detail || 'RLS Policy: Unauthorized access to private file.');
        }
    };

    const handleDeleteSource = async (sourceId: string) => {
        setStorageError(null);
        try {
            await lectraApi.deleteUploadedSource(sourceId);
            setLocalUploads((prev) => prev.filter((s) => s.id !== sourceId));
            if (onNotify) onNotify('Deleted uploaded file from Supabase Storage.');
            if (onRefreshDashboard) onRefreshDashboard();
        } catch (err: any) {
            setStorageError(err?.response?.data?.detail || 'RLS Policy: Cannot delete another student’s file.');
        }
    };
    const formatDate = (isoString: string) => {
        if (!isoString) return 'Oct 24, 2026';
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return isoString.slice(0, 10);
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return 'Oct 24, 2026';
        }
    };

    return (
        <div className="space-y-8 pb-16 animate-fade-in">
            {/* 1. Welcome Banner */}
            <div className="rounded-2xl border border-slate-800 bg-[#0B132B] p-6 sm:p-8 text-white shadow-saas-md">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="space-y-2">
                        <div className="inline-flex items-center space-x-2 rounded-md border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>
                                {userProfile.university} • Section {currentSection} Workspace
                            </span>
                        </div>
                        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl text-white">
                            Welcome back, {userProfile.full_name}
                        </h1>
                        <p className="text-sm text-slate-300">
                            Your academic knowledge, organized in one place.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onOpenStudio()}
                            className="inline-flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500"
                        >
                            <Sparkles size={15} />
                            <span>Generate Master Notes</span>
                        </button>
                        <button
                            type="button"
                            onClick={onOpenVault}
                            className="inline-flex items-center space-x-2 rounded-lg border border-slate-700 bg-[#152042] px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                        >
                            <ShieldCheck size={15} />
                            <span>Browse Section Vault</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Key Academic Statistics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-saas transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Master Notes Generated
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                            <FileText size={16} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                            {metrics.total_master_notes}
                        </span>
                        <span className="inline-flex items-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={12} className="mr-1" />
                            Verified
                        </span>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-saas transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Uploaded Sources
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <UploadCloud size={16} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                            {metrics.uploaded_sources}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                            Whiteboards & PDFs
                        </span>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-saas transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Study Kits Created
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                            <BookOpen size={16} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                            {metrics.available_study_kits}
                        </span>
                        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                            MCQs & Flashcards
                        </span>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-saas transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Community Contributions
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                            {metrics.community_contributions}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                            {metrics.total_upvotes} peer upvotes
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Quick Actions */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Quick Actions
                    </h2>
                    <span className="text-[11px] font-medium text-slate-400">
                        Core Studio & Vault Workflows
                    </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <button
                        type="button"
                        onClick={() => onOpenStudio('whiteboard')}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-saas transition hover:border-indigo-500/60 hover:shadow-saas-md dark:border-slate-800 dark:bg-slate-900"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[#0B132B] transition group-hover:bg-[#0B132B] group-hover:text-white dark:bg-slate-800 dark:text-slate-200">
                            <UploadCloud size={17} />
                        </div>
                        <div className="mt-3.5">
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                                Upload Whiteboard
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                                Digitize classroom board photos
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => onOpenStudio('pdf')}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-saas transition hover:border-indigo-500/60 hover:shadow-saas-md dark:border-slate-800 dark:bg-slate-900"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-950 dark:text-indigo-400">
                            <FileText size={17} />
                        </div>
                        <div className="mt-3.5">
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                                Upload Reference PDF
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                                Official textbooks & syllabi
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => onOpenStudio()}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-saas transition hover:border-indigo-500/60 hover:shadow-saas-md dark:border-slate-800 dark:bg-slate-900"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-950 dark:text-indigo-400">
                            <Sparkles size={17} />
                        </div>
                        <div className="mt-3.5">
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                                Generate Master Notes
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                                6-stage multimodal synthesis
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenVault}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-saas transition hover:border-indigo-500/60 hover:shadow-saas-md dark:border-slate-800 dark:bg-slate-900"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-400">
                            <ShieldCheck size={17} />
                        </div>
                        <div className="mt-3.5">
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                                Browse Section Vault
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                                Compare Sections A through I
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => onOpenStudyKit()}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-saas transition hover:border-indigo-500/60 hover:shadow-saas-md dark:border-slate-800 dark:bg-slate-900"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-indigo-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300">
                            <BookOpen size={17} />
                        </div>
                        <div className="mt-3.5">
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                                Create Study Kit
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                                MCQs, flashcards & exam sheets
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* 4. Subject Cards */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Enrolled Subjects
                    </h2>
                    <span className="text-[11px] font-medium text-slate-400">
                        Active in Section {currentSection}
                    </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {subjects.map((subj) => (
                        <div
                            key={subj.id}
                            onClick={() => onSelectSubject && onSelectSubject(subj)}
                            className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-saas transition hover:border-indigo-400 hover:shadow-saas-md dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center rounded-md bg-[#0B132B] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-white dark:bg-indigo-600">
                                        {subj.code}
                                    </span>
                                    <span className="inline-flex items-center space-x-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                        <Layers size={11} />
                                        <span>Section {currentSection}</span>
                                    </span>
                                </div>
                                <h3 className="mt-3 font-display text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition">
                                    {subj.name}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                    {subj.description || 'Core departmental academic course.'}
                                </p>
                            </div>

                            <div className="mt-5 space-y-2 border-t border-slate-100 pt-3.5 dark:border-slate-800 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 flex items-center gap-1.5">
                                        <GraduationCap size={13} className="text-slate-400" />
                                        <span>Professor</span>
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {subj.teacher}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 flex items-center gap-1.5">
                                        <BookMarked size={13} className="text-slate-400" />
                                        <span>Chapters</span>
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {subj.chapters_count} Chapters
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-0.5">
                                    <span className="text-slate-500">Sections Enrolled</span>
                                    <div className="flex space-x-1">
                                        {subj.active_sections.slice(0, 5).map((sec) => (
                                            <span
                                                key={sec}
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                    sec === currentSection
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                }`}
                                            >
                                                {sec}
                                            </span>
                                        ))}
                                        {subj.active_sections.length > 5 && (
                                            <span className="text-[10px] font-medium text-slate-400 self-center">
                                                +{subj.active_sections.length - 5}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 5. Recent Notes Table with Database Search & Filters */}
            <div className="rounded-xl border border-slate-200/90 bg-white shadow-saas dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                            Recent Notes
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Verified Master Notes synthesized from classroom boards and professor references
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search size={13} className="text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                                type="search"
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                placeholder="Filter notes & files..."
                                className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <select
                            aria-label="Filter by subject"
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                            <option value="ALL">All Subjects</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.code}>
                                    {s.code}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter by section"
                            value={sectionFilter}
                            onChange={(e) => setSectionFilter(e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                            <option value="ALL">All Sections (A–I)</option>
                            {(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as SectionId[]).map((sec) => (
                                <option key={sec} value={sec}>
                                    Section {sec}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => onOpenStudio()}
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 ml-1"
                        >
                            <span>Open Studio</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                                <th className="px-6 py-3">Chapter Name</th>
                                <th className="px-4 py-3">Subject</th>
                                <th className="px-4 py-3">Professor</th>
                                <th className="px-4 py-3">Section</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Download</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredNotes.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                                        No master notes match the current filter. Try clearing the search or filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredNotes.map((note) => (
                                    <tr
                                        key={note.id}
                                        onClick={() => onViewMasterNote(note)}
                                        className="group cursor-pointer transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/50"
                                    >
                                        <td className="px-6 py-3.5">
                                            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition">
                                                {note.chapter}
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                                {note.title}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                                {note.subject_code}
                                            </span>
                                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                                                {note.subject_name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                                            {note.professor}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center space-x-1">
                                                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                    Sec {note.section}
                                                </span>
                                                {note.source_sections.length > 1 && (
                                                    <span className="text-[10px] font-medium text-slate-400">
                                                        (+{note.source_sections.filter((s) => s !== note.section).join(',')})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                                            <div className="inline-flex items-center space-x-1">
                                                <Calendar size={12} className="text-slate-400" />
                                                <span>{formatDate(note.updated_at)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-400">
                                                <CheckCircle2 size={11} className="mr-1" />
                                                Source Verified
                                            </span>
                                        </td>
                                        <td
                                            className="px-6 py-3.5 text-right whitespace-nowrap"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="inline-flex items-center space-x-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => onViewMasterNote(note)}
                                                    className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                                                >
                                                    <Eye size={12} />
                                                    <span>Open</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onDownloadNote(note.lecture_id, 'pdf')}
                                                    className="inline-flex items-center space-x-1 rounded-lg bg-[#0B132B] px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition"
                                                    title="Download PDF"
                                                >
                                                    <Download size={12} />
                                                    <span>PDF</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {storageError && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 flex items-center justify-between"
                >
                    <span>{storageError}</span>
                    <button
                        type="button"
                        onClick={() => setStorageError(null)}
                        className="text-red-500 hover:text-red-800 font-bold"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* 6. Workspaces & Upload History (Supabase Storage Buckets + RLS) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Workspaces List */}
                <div className="rounded-xl border border-slate-200/90 bg-white shadow-saas dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FolderLock size={15} className="text-indigo-600" />
                                <span>Lecture Workspaces ({localWorkspaces.length})</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                RLS-protected private and section-shared academic workspaces
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowNewWorkspace((prev) => !prev)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#0B132B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
                        >
                            <Plus size={13} />
                            <span>New Workspace</span>
                        </button>
                    </div>

                    {showNewWorkspace && (
                        <form
                            onSubmit={handleCreateWorkspace}
                            className="border-b border-slate-100 bg-slate-50/70 p-4 space-y-3"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <input
                                    type="text"
                                    required
                                    value={wsTitle}
                                    onChange={(e) => setWsTitle(e.target.value)}
                                    placeholder="Workspace title (e.g., Lecture 8 Paxos)"
                                    className="sm:col-span-2 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                                />
                                <select
                                    value={wsVisibility}
                                    onChange={(e) => setWsVisibility(e.target.value as VisibilityType)}
                                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                                >
                                    <option value="private">Private (Owner RLS)</option>
                                    <option value="section">Section Shared</option>
                                    <option value="public">Public Vault</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <select
                                        value={wsSubjectId}
                                        onChange={(e) => setWsSubjectId(e.target.value)}
                                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                                    >
                                        {subjects.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.code} — {s.name}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={wsSection}
                                        onChange={(e) => setWsSection(e.target.value as SectionId)}
                                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                                    >
                                        {(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as SectionId[]).map(
                                            (sec) => (
                                                <option key={sec} value={sec}>
                                                    Sec {sec}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={wsCreating}
                                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {wsCreating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {localWorkspaces.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                                No workspaces found. Create one above to organize your lecture captures.
                            </div>
                        ) : (
                            localWorkspaces.map((ws) => (
                                <div
                                    key={ws.id}
                                    className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition"
                                >
                                    <div className="min-w-0 pr-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-900 truncate">
                                                {ws.title || ws.name}
                                            </span>
                                            <span
                                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                    ws.visibility === 'private'
                                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}
                                            >
                                                {ws.visibility === 'private' ? (
                                                    <Lock size={10} />
                                                ) : (
                                                    <Globe size={10} />
                                                )}
                                                <span>{ws.visibility || 'private'}</span>
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            Section {ws.section || currentSection} • {ws.semester} •{' '}
                                            {ws.lecture_date || formatDate(ws.created_at)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {ws.user_id === userProfile.id && ws.id !== 'ws_main' && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteWorkspace(ws.id)}
                                                title="Delete Workspace"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Upload History & Supabase Storage Buckets */}
                <div className="rounded-xl border border-slate-200/90 bg-white shadow-saas dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <HardDrive size={15} className="text-indigo-600" />
                                <span>Upload History & Supabase Storage ({filteredUploads.length})</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Secure buckets with HMAC-SHA256 signed URLs & ownership RLS
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <select
                                aria-label="Target storage bucket"
                                value={selectedBucket}
                                onChange={(e) => setSelectedBucket(e.target.value as StorageBucketType)}
                                className="px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-slate-50"
                            >
                                <option value="private-student-uploads">Bucket: Private Uploads</option>
                                <option value="shared-academic-materials">Bucket: Shared Materials</option>
                                <option value="generated-documents">Bucket: Generated Docs</option>
                                <option value="generated-diagrams">Bucket: Generated Diagrams</option>
                            </select>
                            <select
                                aria-label="Source material type"
                                value={selectedSourceType}
                                onChange={(e) =>
                                    setSelectedSourceType(e.target.value as SourceMaterialType)
                                }
                                className="px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-slate-50"
                            >
                                <option value="whiteboard">Whiteboard</option>
                                <option value="blackboard">Blackboard</option>
                                <option value="handwritten_notes">Handwritten</option>
                                <option value="reference_pdf">Reference PDF</option>
                            </select>
                            <label className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 cursor-pointer transition">
                                {uploadingStorage ? (
                                    <progress aria-label="Uploading file" className="loading-spinner" />
                                ) : (
                                    <UploadCloud size={12} />
                                )}
                                <span>Upload</span>
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                                    onChange={handleDirectStorageUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {filteredUploads.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                                No uploaded files found in Supabase Storage. Upload a whiteboard image or PDF above.
                            </div>
                        ) : (
                            filteredUploads.map((src) => (
                                <div
                                    key={src.id}
                                    className="px-6 py-3 flex items-center justify-between hover:bg-slate-50/80 transition"
                                >
                                    <div className="min-w-0 pr-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-900 truncate">
                                                {src.file_name || src.original_filename}
                                            </span>
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                                                {src.bucket_id || 'private-student-uploads'}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                            {src.source_type.replace('_', ' ')} •{' '}
                                            {Math.max(1, Math.round((src.file_size_bytes || 1024) / 1024))} KB •{' '}
                                            {formatDate(src.created_at)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenSignedUrl(src)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                                            title="Open via HMAC Signed URL"
                                        >
                                            <Link2 size={11} />
                                            <span>Signed URL</span>
                                        </button>
                                        {src.user_id === userProfile.id && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSource(src.id)}
                                                title="Delete File"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
