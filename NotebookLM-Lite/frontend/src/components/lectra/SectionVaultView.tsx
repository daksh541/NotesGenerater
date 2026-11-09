import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Search,
    ThumbsUp,
    Download,
    AlertCircle,
    GitCompare,
    CheckCircle2,
    X,
    RotateCcw,
    Calendar,
    Clock,
    Layers,
    Share2,
    BookOpen,
    HelpCircle,
    Sparkles,
    FileText,
    CheckSquare,
    AlertTriangle,
    Eye,
} from 'lucide-react';
import {
    DuplicateCheckResult,
    ProfessorProfile,
    SectionComparisonResult,
    SectionId,
    SectionVaultNote,
    SharingScope,
    SubjectModel,
    VerificationStatus,
    VisibilityType,
} from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';

interface SectionVaultViewProps {
    currentSection: SectionId;
    subjects: SubjectModel[];
    professors?: ProfessorProfile[];
    onSelectNote: (lectureId: string) => void;
    onDownloadNote: (lectureId: string, format: 'pdf' | 'docx' | 'markdown') => void;
}

export const SectionVaultView: React.FC<SectionVaultViewProps> = ({
    currentSection,
    subjects,
    professors = [],
    onSelectNote,
    onDownloadNote,
}) => {
    // Filter & Search states
    const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('');
    const [selectedProfessorFilter, setSelectedProfessorFilter] = useState<string>('');
    const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('');
    const [lectureDateFilter, setLectureDateFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [verificationFilter, setVerificationFilter] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('newest');

    // Data states
    const [notes, setNotes] = useState<SectionVaultNote[]>([]);
    const [loading, setLoading] = useState(true);

    // Cross-Section Comparison modal state
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [compareSubject, setCompareSubject] = useState('CS-244');
    const [compareChapter, setCompareChapter] = useState('Chapter 4: Consensus in Fault-Tolerant Clusters');
    const [selectedCompareSections, setSelectedCompareSections] = useState<SectionId[]>(['A', 'C']);
    const [comparisonResult, setComparisonResult] = useState<SectionComparisonResult | null>(null);
    const [comparing, setComparing] = useState(false);
    const [activeCompareTab, setActiveCompareTab] = useState<'topics' | 'definitions' | 'formulas' | 'examples' | 'diagrams' | 'emphasis' | 'additional'>('topics');

    // Share Note Modal state
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareTitle, setShareTitle] = useState('');
    const [shareChapter, setShareChapter] = useState('');
    const [shareSubjectCode, setShareSubjectCode] = useState(subjects[0]?.code || 'CS-244');
    const [shareSection, setShareSection] = useState<SectionId>(currentSection);
    const [shareSummary, setShareSummary] = useState('');
    const [shareScope, setShareScope] = useState<SharingScope>('all_sections');
    const [shareAllowedSections, setShareAllowedSections] = useState<SectionId[]>(['A', 'B', 'C']);
    const [shareOfficialSource, setShareOfficialSource] = useState('');
    const [shareSourcesCount, setShareSourcesCount] = useState(2);
    const [shareExplicitPermission, setShareExplicitPermission] = useState(false);
    const [sharingSubmitting, setSharingSubmitting] = useState(false);
    const [shareErrorMessage, setShareErrorMessage] = useState('');
    const [shareSuccessMessage, setShareSuccessMessage] = useState('');

    // Duplicate Check Warning state
    const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
    const [duplicateCheckDismissed, setDuplicateCheckDismissed] = useState(false);

    // Report Note Modal state
    const [reportingNoteId, setReportingNoteId] = useState<string | null>(null);
    const [reportReason, setReportReason] = useState('');
    const [reportSuccess, setReportSuccess] = useState(false);

    const sectionsList: SectionId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

    const fetchVaultNotes = async () => {
        setLoading(true);
        try {
            const res = await lectraApi.getVaultNotes({
                section: selectedSectionFilter !== 'ALL' ? selectedSectionFilter : undefined,
                subject: selectedSubjectFilter || undefined,
                chapter: selectedChapterFilter || undefined,
                professor: selectedProfessorFilter || undefined,
                lecture_date: lectureDateFilter || undefined,
                verification_status: verificationFilter || undefined,
                search: searchQuery || undefined,
                sort_by: sortBy || 'newest',
            });
            setNotes(res.notes);
        } catch (err) {
            console.error('Failed to load vault notes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVaultNotes();
    }, [
        selectedSectionFilter,
        selectedSubjectFilter,
        selectedProfessorFilter,
        selectedChapterFilter,
        lectureDateFilter,
        verificationFilter,
        searchQuery,
        sortBy,
    ]);

    // Unique chapters & professors for filters
    const uniqueChapters = Array.from(new Set(notes.map((n) => n.chapter).filter(Boolean)));
    const uniqueProfessors =
        professors.length > 0
            ? professors.map((p) => p.name)
            : Array.from(new Set(notes.map((n) => n.professor).filter(Boolean)));

    const handleUpvote = async (noteId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await lectraApi.upvoteVaultNote(noteId);
            setNotes((prev) =>
                prev.map((n) => (n.id === noteId ? { ...n, upvotes: res.upvotes } : n))
            );
        } catch (err) {
            console.error('Failed to upvote:', err);
        }
    };

    const handleRunComparison = async () => {
        if (selectedCompareSections.length === 0) return;
        setComparing(true);
        try {
            const res = await lectraApi.compareSections(
                compareSubject,
                compareChapter,
                selectedCompareSections
            );
            setComparisonResult(res);
        } catch (err) {
            console.error('Comparison failed:', err);
        } finally {
            setComparing(false);
        }
    };

    const handleReportSubmit = async () => {
        if (!reportingNoteId || !reportReason.trim()) return;
        try {
            await lectraApi.reportVaultNote(reportingNoteId, reportReason);
            setReportSuccess(true);
            setTimeout(() => {
                setReportSuccess(false);
                setReportingNoteId(null);
                setReportReason('');
            }, 1800);
        } catch (err) {
            console.error('Report failed:', err);
        }
    };

    const handleResetFilters = () => {
        setSelectedSectionFilter('ALL');
        setSelectedSubjectFilter('');
        setSelectedProfessorFilter('');
        setSelectedChapterFilter('');
        setLectureDateFilter('');
        setVerificationFilter('');
        setSearchQuery('');
        setSortBy('newest');
    };

    const handlePreCheckDuplicate = async () => {
        if (!shareSubjectCode || !shareChapter) return;
        try {
            const dup = await lectraApi.checkDuplicate({
                subject_code: shareSubjectCode,
                chapter: shareChapter,
                section: shareSection,
                summary: shareSummary,
            });
            setDuplicateResult(dup);
            setDuplicateCheckDismissed(false);
        } catch (err) {
            console.error('Duplicate check error:', err);
        }
    };

    const handleShareSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShareErrorMessage('');
        setShareSuccessMessage('');

        if (!shareExplicitPermission) {
            setShareErrorMessage('Explicit permission must be granted before sharing notes.');
            return;
        }

        if (!shareTitle.trim() || !shareChapter.trim() || !shareSummary.trim()) {
            setShareErrorMessage('Please fill in title, chapter, and summary.');
            return;
        }

        // Run duplicate check if not yet checked
        if (!duplicateResult) {
            try {
                const dup = await lectraApi.checkDuplicate({
                    subject_code: shareSubjectCode,
                    chapter: shareChapter,
                    section: shareSection,
                    summary: shareSummary,
                });
                if (dup.is_potential_duplicate && !duplicateCheckDismissed) {
                    setDuplicateResult(dup);
                    return;
                }
            } catch (err) {
                console.error('Duplicate check failed:', err);
            }
        }

        setSharingSubmitting(true);
        try {
            const lectureId = `lec_${Date.now()}`;
            await lectraApi.shareToVault({
                lecture_id: lectureId,
                title: shareTitle,
                chapter: shareChapter,
                subject_code: shareSubjectCode,
                section: shareSection,
                summary: shareSummary,
                visibility: shareScope === 'private' ? 'private' as VisibilityType : 'section' as VisibilityType,
                sharing_scope: shareScope,
                allowed_sections: shareScope === 'selected_sections' ? shareAllowedSections : [],
                explicit_permission_granted: shareExplicitPermission,
                official_source_reference: shareOfficialSource || undefined,
                sources_count: shareSourcesCount,
            });

            setShareSuccessMessage('Note successfully shared to the Section Vault with explicit permission!');
            fetchVaultNotes();
            setTimeout(() => {
                setShowShareModal(false);
                setShareSuccessMessage('');
                setShareTitle('');
                setShareChapter('');
                setShareSummary('');
                setShareOfficialSource('');
                setShareExplicitPermission(false);
                setDuplicateResult(null);
            }, 1800);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message || 'Failed to share note to vault';
            setShareErrorMessage(msg);
        } finally {
            setSharingSubmitting(false);
        }
    };

    const toggleCompareSection = (sec: SectionId) => {
        if (selectedCompareSections.includes(sec)) {
            if (selectedCompareSections.length > 1) {
                setSelectedCompareSections(selectedCompareSections.filter((s) => s !== sec));
            }
        } else {
            setSelectedCompareSections([...selectedCompareSections, sec]);
        }
    };

    const toggleAllowedSection = (sec: SectionId) => {
        if (shareAllowedSections.includes(sec)) {
            setShareAllowedSections(shareAllowedSections.filter((s) => s !== sec));
        } else {
            setShareAllowedSections([...shareAllowedSections, sec]);
        }
    };

    const renderVerificationBadge = (status: VerificationStatus) => {
        switch (status) {
            case 'source_verified':
                return (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <CheckCircle2 size={10} className="mr-1 text-emerald-600" />
                        Source Verified
                    </span>
                );
            case 'community_reviewed':
                return (
                    <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400">
                        <ShieldCheck size={10} className="mr-1 text-indigo-600" />
                        Community Reviewed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                        Unverified
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 pb-16 animate-fade-in">
            {/* Header Banner */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-200/80 pb-5 dark:border-slate-800">
                <div>
                    <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <ShieldCheck size={15} />
                        <span>Sections A through I • Collaborative Academic Repository</span>
                    </div>
                    <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                        Section Vault
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Browse, filter, and compare peer-reviewed and source-verified Master Notes across all nine classroom sections without exposing private student workspaces.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                        <RotateCcw size={13} />
                        <span>Reset Filters</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowCompareModal(true);
                            handleRunComparison();
                        }}
                        className="inline-flex items-center space-x-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
                    >
                        <GitCompare size={14} />
                        <span>Compare Sections</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowShareModal(true)}
                        className="inline-flex items-center space-x-2 rounded-lg bg-[#0B132B] hover:bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition dark:bg-indigo-600 dark:hover:bg-indigo-500"
                    >
                        <Share2 size={14} />
                        <span>Share Notes to Vault</span>
                    </button>
                </div>
            </div>

            {/* Section Filters (A through I) */}
            <div className="flex items-center space-x-1.5 overflow-x-auto rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                <button
                    type="button"
                    onClick={() => setSelectedSectionFilter('ALL')}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition shrink-0 ${
                        selectedSectionFilter === 'ALL'
                            ? 'bg-[#0B132B] text-white dark:bg-indigo-600'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                >
                    All Sections (A–I)
                </button>
                {sectionsList.map((sec) => (
                    <button
                        key={sec}
                        type="button"
                        onClick={() => setSelectedSectionFilter(sec)}
                        className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0 ${
                            selectedSectionFilter === sec
                                ? 'bg-[#0B132B] text-white dark:bg-indigo-600'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                    >
                        <span>Section {sec}</span>
                        {sec === currentSection && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Your Section" />
                        )}
                    </button>
                ))}
            </div>

            {/* Search + Subject, Chapter, Professor, Date, and Sort Filters */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div className="relative lg:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notes, chapters, topics, formulas..."
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                </div>

                {/* Subject Filter */}
                <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    aria-label="Filter by Subject"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                    <option value="">All Subjects</option>
                    {subjects.map((s) => (
                        <option key={s.id} value={s.code}>
                            {s.code} — {s.name}
                        </option>
                    ))}
                </select>

                {/* Chapter Filter */}
                <select
                    value={selectedChapterFilter}
                    onChange={(e) => setSelectedChapterFilter(e.target.value)}
                    aria-label="Filter by Chapter"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                    <option value="">All Chapters</option>
                    {uniqueChapters.map((chap) => (
                        <option key={chap} value={chap}>
                            {chap}
                        </option>
                    ))}
                </select>

                {/* Professor Filter */}
                <select
                    value={selectedProfessorFilter}
                    onChange={(e) => setSelectedProfessorFilter(e.target.value)}
                    aria-label="Filter by Professor"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                    <option value="">All Professors</option>
                    {uniqueProfessors.map((prof) => (
                        <option key={prof} value={prof}>
                            {prof}
                        </option>
                    ))}
                </select>

                {/* Sort Filter */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort Options"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                    <option value="newest">Sort: Newest Uploads</option>
                    <option value="upvotes">Sort: Most Upvoted</option>
                    <option value="lecture_date">Sort: Lecture Date</option>
                    <option value="sources">Sort: Most Sources</option>
                </select>
            </div>

            {/* Lecture Date Filter & Verification Status Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
                        <Calendar size={13} />
                        Lecture Date:
                    </span>
                    <input
                        type="date"
                        value={lectureDateFilter}
                        onChange={(e) => setLectureDateFilter(e.target.value)}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    />
                    {lectureDateFilter && (
                        <button
                            type="button"
                            onClick={() => setLectureDateFilter('')}
                            className="text-[10px] text-slate-400 hover:text-slate-600"
                        >
                            Clear date
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">
                        Verification Tier:
                    </span>
                    {[
                        { id: '', label: 'All Tiers' },
                        { id: 'source_verified', label: 'Source Verified' },
                        { id: 'community_reviewed', label: 'Community Reviewed' },
                        { id: 'unverified', label: 'Unverified' },
                    ].map((tier) => (
                        <button
                            key={tier.id}
                            type="button"
                            onClick={() => setVerificationFilter(tier.id)}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                                verificationFilter === tier.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                            }`}
                        >
                            {tier.label}
                        </button>
                    ))}
                </div>

                <span className="text-[11px] font-medium text-slate-500">
                    Showing {notes.length} verified note{notes.length === 1 ? '' : 's'}
                </span>
            </div>

            {/* Note Cards Grid */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent" />
                    <p className="mt-3 text-xs font-medium text-slate-500">
                        Querying verified notes across Sections A through I...
                    </p>
                </div>
            ) : notes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
                    <BookOpen size={36} className="mx-auto text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                        No vault notes found
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                        Try clearing active filters or share notes from your classroom section.
                    </p>
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-4 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                    >
                        Reset All Filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            onClick={() => onSelectNote(note.lecture_id)}
                            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-saas transition-all hover:border-indigo-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
                        >
                            <div>
                                {/* Top Badges: Section, Verification, Sources Count */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center space-x-1.5">
                                        <span className="rounded-md bg-[#0B132B] px-2 py-0.5 text-[11px] font-bold text-white dark:bg-indigo-600">
                                            Section {note.section}
                                        </span>
                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {note.subject_code}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <span
                                            className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                            title="Number of multi-modal sources synthesized"
                                        >
                                            <Layers size={10} className="mr-1 text-slate-500" />
                                            {note.sources_count || 1} {note.sources_count === 1 ? 'src' : 'sources'}
                                        </span>
                                        {renderVerificationBadge(note.verification_status)}
                                    </div>
                                </div>

                                {/* Chapter and Professor */}
                                <h3 className="mt-3 font-display text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white transition">
                                    {note.chapter || note.title}
                                </h3>
                                <div className="mt-1 text-xs font-medium text-slate-500 flex items-center justify-between">
                                    <span>Prof: <strong className="text-slate-700 dark:text-slate-300">{note.professor}</strong></span>
                                </div>

                                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                    {note.summary}
                                </p>

                                {note.official_source_reference && (
                                    <div className="mt-2 rounded bg-emerald-50/70 p-1.5 text-[10px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
                                        <span className="font-bold">Official Reference:</span> {note.official_source_reference}
                                    </div>
                                )}

                                <div className="mt-3 flex flex-wrap gap-1">
                                    {note.tags.map((t, idx) => (
                                        <span
                                            key={idx}
                                            className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                        >
                                            #{t}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Card Footer: Contributor, Dates, Upvotes, Download */}
                            <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        {note.contributor_avatar ? (
                                            <img
                                                src={note.contributor_avatar}
                                                alt={note.contributor_name}
                                                className="h-6 w-6 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                                                {note.contributor_name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="text-[11px]">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {note.contributor_name}
                                            </span>
                                            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                                <span title="Lecture Date" className="flex items-center gap-0.5">
                                                    <Calendar size={10} />
                                                    {note.lecture_date}
                                                </span>
                                                <span title="Upload Date" className="flex items-center gap-0.5">
                                                    <Clock size={10} />
                                                    {note.upload_date ? note.upload_date.slice(0, 10) : note.created_at.slice(0, 10)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="flex items-center space-x-1.5"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCompareSubject(note.subject_code);
                                                setCompareChapter(note.chapter || note.title);
                                                setShowCompareModal(true);
                                                handleRunComparison();
                                            }}
                                            className="inline-flex items-center space-x-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 transition"
                                            title="Compare with other sections"
                                        >
                                            <GitCompare size={12} />
                                            <span>Compare</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => handleUpvote(note.id, e)}
                                            className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                                            title="Upvote verified notes"
                                        >
                                            <ThumbsUp size={12} />
                                            <span>{note.upvotes}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onDownloadNote(note.lecture_id, 'pdf')}
                                            className="rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-500 transition"
                                            title="Download PDF"
                                        >
                                            <Download size={13} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setReportingNoteId(note.id)}
                                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 transition"
                                            title="Report Inaccuracy"
                                        >
                                            <AlertCircle size={13} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal 1: 7-Dimensional Cross-Section Comparison Tool */}
            {showCompareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                            <div>
                                <div className="flex items-center space-x-2 text-xs font-bold uppercase text-indigo-600">
                                    <GitCompare size={15} />
                                    <span>Cross-Section Comparison Engine (Phase 4)</span>
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                                    Multi-Section Academic Comparison Across Sections A–I
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCompareModal(false)}
                                className="rounded-lg p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Pedagogical Integrity Notice */}
                        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-2.5 text-xs text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300 flex items-start gap-2">
                            <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                            <span>
                                <strong>Academic Pedagogical Principle:</strong> Variations across classroom sections reflect instructors' deliberate emphasis differences (e.g. theoretical derivations vs system implementation tradeoffs), not errors.
                            </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 bg-slate-50 p-3.5 rounded-xl dark:bg-slate-800/60">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Subject
                                </label>
                                <select
                                    value={compareSubject}
                                    onChange={(e) => setCompareSubject(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
                                >
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.code}>
                                            {s.code} ({s.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Chapter
                                </label>
                                <input
                                    type="text"
                                    value={compareChapter}
                                    onChange={(e) => setCompareChapter(e.target.value)}
                                    placeholder="Chapter name..."
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Select Sections to Compare
                                </label>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {sectionsList.map((sec) => (
                                        <button
                                            key={sec}
                                            type="button"
                                            onClick={() => toggleCompareSection(sec)}
                                            className={`rounded px-2 py-0.5 text-xs font-bold transition ${
                                                selectedCompareSections.includes(sec)
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900'
                                            }`}
                                        >
                                            Sec {sec}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                            <button
                                type="button"
                                onClick={handleRunComparison}
                                disabled={comparing || selectedCompareSections.length === 0}
                                className="inline-flex items-center space-x-2 rounded-lg bg-[#0B132B] px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
                            >
                                <GitCompare size={13} />
                                <span>{comparing ? 'Synthesizing Comparison...' : 'Compare Selected Sections'}</span>
                            </button>
                        </div>

                        {comparisonResult && (
                            <div className="mt-5 space-y-5">
                                {/* Common Concepts & Cross-Section Takeaways */}
                                <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                                    <h4 className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                        <span>Shared Core Principles & Common Invariants</span>
                                    </h4>
                                    <ul className="mt-2 space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                                        {(comparisonResult.common_concepts?.length ? comparisonResult.common_concepts : comparisonResult.shared_core_concepts).map((concept, idx) => (
                                            <li key={idx} className="flex items-start space-x-2">
                                                <span className="font-bold text-emerald-600">•</span>
                                                <span>{concept}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* 7 Dimensions Tabs */}
                                <div className="flex border-b border-slate-200 overflow-x-auto dark:border-slate-800 text-xs font-semibold gap-1">
                                    {[
                                        { id: 'topics', label: '1. Topics Covered' },
                                        { id: 'definitions', label: '2. Definitions' },
                                        { id: 'formulas', label: '3. Formulas' },
                                        { id: 'examples', label: '4. Examples' },
                                        { id: 'diagrams', label: '5. Diagrams' },
                                        { id: 'emphasis', label: '6. Professor Emphasis' },
                                        { id: 'additional', label: '7. Additional Explanations' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveCompareTab(tab.id as any)}
                                            className={`px-3 py-2 border-b-2 whitespace-nowrap transition ${
                                                activeCompareTab === tab.id
                                                    ? 'border-indigo-600 text-indigo-600 font-bold'
                                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Contents per Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedCompareSections.map((sec) => {
                                        const secKey = `Section ${sec}`;
                                        return (
                                            <div
                                                key={sec}
                                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                            >
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3 dark:border-slate-800">
                                                    <span className="rounded bg-[#0B132B] px-2 py-0.5 text-xs font-bold text-white dark:bg-indigo-600">
                                                        Section {sec}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        Pedagogical Profile
                                                    </span>
                                                </div>

                                                {/* Tab 1: Topics */}
                                                {activeCompareTab === 'topics' && (
                                                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                        {(comparisonResult.topics_covered?.[secKey] || []).map((t, idx) => (
                                                            <li key={idx} className="flex items-start gap-1.5">
                                                                <span className="text-indigo-600 font-bold">•</span>
                                                                <span>{t}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {/* Tab 2: Definitions */}
                                                {activeCompareTab === 'definitions' && (
                                                    <div className="space-y-2 text-xs">
                                                        {(comparisonResult.definitions?.[secKey] || []).map((def, idx) => (
                                                            <div key={idx} className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                                <strong className="text-slate-900 dark:text-white">{def.term}:</strong>{' '}
                                                                <span className="text-slate-600 dark:text-slate-300">{def.definition}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Tab 3: Formulas */}
                                                {activeCompareTab === 'formulas' && (
                                                    <div className="space-y-2 text-xs">
                                                        {(comparisonResult.formulas?.[secKey] || []).map((f, idx) => (
                                                            <div key={idx} className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                                <div className="font-bold text-slate-900 dark:text-white">{f.name}</div>
                                                                <div className="mt-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-700">
                                                                    {f.formula}
                                                                </div>
                                                                {f.notes && <div className="mt-1 text-[11px] text-slate-500">{f.notes}</div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Tab 4: Examples */}
                                                {activeCompareTab === 'examples' && (
                                                    <div className="space-y-2 text-xs">
                                                        {(comparisonResult.examples?.[secKey] || []).map((ex, idx) => (
                                                            <div key={idx} className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                                <div className="font-bold text-slate-900 dark:text-white">{ex.title}</div>
                                                                <div className="mt-1 text-slate-600 dark:text-slate-300">{ex.description}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Tab 5: Diagrams */}
                                                {activeCompareTab === 'diagrams' && (
                                                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                        {(comparisonResult.diagrams?.[secKey] || []).map((d, idx) => (
                                                            <li key={idx} className="flex items-start gap-1.5 p-1.5 rounded bg-slate-50 dark:bg-slate-800">
                                                                <span className="text-indigo-600 font-bold">📊</span>
                                                                <span>{d}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {/* Tab 6: Professor Emphasis */}
                                                {activeCompareTab === 'emphasis' && (
                                                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                        {(comparisonResult.professor_emphasis?.[secKey] || comparisonResult.professor_emphasis_differences?.[secKey] || []).map((emp, idx) => (
                                                            <li key={idx} className="flex items-start gap-1.5">
                                                                <span className="text-amber-500 font-bold">★</span>
                                                                <span>{emp}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {/* Tab 7: Additional Lecture Explanations */}
                                                {activeCompareTab === 'additional' && (
                                                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                        {(comparisonResult.additional_lecture_explanations?.[secKey] || comparisonResult.section_specific_explanations?.[secKey] || []).map((exp, idx) => (
                                                            <li key={idx} className="flex items-start gap-1.5">
                                                                <span className="text-indigo-600 font-bold">•</span>
                                                                <span>{exp}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Unique Insights across Compared Sections */}
                                {comparisonResult.unique_insights && (
                                    <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                                        <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                                            <Sparkles size={14} className="text-indigo-600" />
                                            <span>Unique Pedagogical Insights by Section</span>
                                        </h4>
                                        <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                            {Object.entries(comparisonResult.unique_insights).map(([secLabel, insights]) => (
                                                <div key={secLabel} className="p-2 rounded bg-white/70 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/30">
                                                    <strong className="text-indigo-700 dark:text-indigo-400">{secLabel}:</strong>
                                                    <ul className="mt-1 list-disc list-inside text-slate-700 dark:text-slate-300 space-y-0.5">
                                                        {insights.map((ins, i) => (
                                                            <li key={i}>{ins}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal 2: Share Notes to Vault (with Scope, Permissions & Duplicate Detection) */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                                    <Share2 size={18} className="text-indigo-600" />
                                    <span>Share Master Notes to Vault</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Configure audience, official references, and permissions to collaborate across Sections A–I.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowShareModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {shareSuccessMessage ? (
                            <div className="py-8 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
                                {shareSuccessMessage}
                            </div>
                        ) : (
                            <form onSubmit={handleShareSubmit} className="mt-4 space-y-4">
                                {shareErrorMessage && (
                                    <div className="rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200 flex items-center gap-2">
                                        <AlertTriangle size={15} />
                                        <span>{shareErrorMessage}</span>
                                    </div>
                                )}

                                {/* Duplicate Warning Banner */}
                                {duplicateResult?.is_potential_duplicate && !duplicateCheckDismissed && (
                                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                        <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200">
                                            <AlertTriangle size={16} className="text-amber-600" />
                                            <span>Potential Duplicate Detected ({Math.round(duplicateResult.confidence_score * 100)}% Match)</span>
                                        </div>
                                        <p className="mt-1 text-slate-700 dark:text-slate-300">
                                            {duplicateResult.warning_message}
                                        </p>
                                        <ul className="mt-1.5 list-disc list-inside text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5">
                                            {duplicateResult.matching_reasons.map((r, i) => (
                                                <li key={i}>{r}</li>
                                            ))}
                                        </ul>
                                        <div className="mt-2.5 flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDuplicateCheckDismissed(true)}
                                                className="rounded bg-amber-600 hover:bg-amber-700 px-3 py-1 text-xs font-semibold text-white transition"
                                            >
                                                Proceed & Share Anyway
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Note Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={shareTitle}
                                            onChange={(e) => setShareTitle(e.target.value)}
                                            placeholder="e.g. Raft Consensus Safety Invariants"
                                            required
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Chapter Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={shareChapter}
                                            onChange={(e) => setShareChapter(e.target.value)}
                                            onBlur={handlePreCheckDuplicate}
                                            placeholder="e.g. Chapter 4: Consensus in Fault-Tolerant Clusters"
                                            required
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Subject Code
                                        </label>
                                        <select
                                            value={shareSubjectCode}
                                            onChange={(e) => setShareSubjectCode(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                                        >
                                            {subjects.map((s) => (
                                                <option key={s.id} value={s.code}>
                                                    {s.code} — {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Contributing Section
                                        </label>
                                        <select
                                            value={shareSection}
                                            onChange={(e) => setShareSection(e.target.value as SectionId)}
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                                        >
                                            {sectionsList.map((s) => (
                                                <option key={s} value={s}>
                                                    Section {s}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Sources Integrated
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={12}
                                            value={shareSourcesCount}
                                            onChange={(e) => setShareSourcesCount(parseInt(e.target.value) || 1)}
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Executive Synthesis Summary *
                                    </label>
                                    <textarea
                                        value={shareSummary}
                                        onChange={(e) => setShareSummary(e.target.value)}
                                        rows={3}
                                        placeholder="Summarize the core mathematical invariants, blackboard demonstrations, and derivations..."
                                        required
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                                    />
                                </div>

                                {/* Sharing Scope */}
                                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40">
                                    <label className="block text-xs font-bold text-slate-900 dark:text-white">
                                        Sharing Audience & Scope
                                    </label>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {[
                                            { id: 'all_sections', title: 'All Nine Sections (A–I)', desc: 'Open academic master note for all students' },
                                            { id: 'selected_sections', title: 'Selected Sections', desc: 'Share with specific partner sections' },
                                            { id: 'course', title: 'Enrolled Course Students', desc: 'Restricted to enrolled course participants' },
                                            { id: 'private', title: 'Private Workspace', desc: 'Keep in personal notebook only' },
                                        ].map((opt) => (
                                            <label
                                                key={opt.id}
                                                className={`flex items-start space-x-2 p-2.5 rounded-lg border cursor-pointer transition ${
                                                    shareScope === opt.id
                                                        ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/40'
                                                        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="share_scope"
                                                    value={opt.id}
                                                    checked={shareScope === opt.id}
                                                    onChange={() => setShareScope(opt.id as SharingScope)}
                                                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <div>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{opt.title}</div>
                                                    <div className="text-[10px] text-slate-500">{opt.desc}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>

                                    {shareScope === 'selected_sections' && (
                                        <div className="mt-3 p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                            <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Select Allowed Sections:
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {sectionsList.map((sec) => (
                                                    <label key={sec} className="inline-flex items-center space-x-1 text-xs">
                                                        <input
                                                            type="checkbox"
                                                            checked={shareAllowedSections.includes(sec)}
                                                            onChange={() => toggleAllowedSection(sec)}
                                                            className="rounded text-indigo-600"
                                                        />
                                                        <span>Section {sec}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Official Source Reference for Source Verified Status */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Official Source Reference (Optional, grants <span className="text-emerald-600 font-bold">Source Verified</span> status)
                                    </label>
                                    <input
                                        type="text"
                                        value={shareOfficialSource}
                                        onChange={(e) => setShareOfficialSource(e.target.value)}
                                        placeholder="e.g. Ongaro & Ousterhout (2014) §5.2, or Tanenbaum Ch 8.3"
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                                    />
                                    <p className="mt-0.5 text-[10px] text-slate-500">
                                        Notes without an official textbook/paper citation are designated Community Reviewed or Unverified until audited.
                                    </p>
                                </div>

                                {/* Mandatory Explicit Permission Checkbox */}
                                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                                    <label className="flex items-start space-x-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={shareExplicitPermission}
                                            onChange={(e) => setShareExplicitPermission(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                            <strong>Explicit Sharing Certification:</strong> I grant explicit permission to share these academic notes in accordance with university honor code and verify that no private workspace personal records are exposed.
                                        </span>
                                    </label>
                                </div>

                                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowShareModal(false)}
                                        className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sharingSubmitting || !shareExplicitPermission}
                                        className="inline-flex items-center space-x-2 rounded-lg bg-[#0B132B] hover:bg-indigo-600 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
                                    >
                                        <Share2 size={13} />
                                        <span>{sharingSubmitting ? 'Sharing...' : 'Share to Section Vault'}</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Modal 3: Report Inaccuracy Modal */}
            {reportingNoteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                                <AlertCircle size={16} className="text-amber-500" />
                                <span>Report Inaccurate Note</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setReportingNoteId(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {reportSuccess ? (
                            <div className="py-6 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={32} className="mx-auto mb-2" />
                                Report logged for peer verification review.
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <p className="text-xs text-slate-500">
                                    Describe any equation errors, transcription mistakes, or conflicting explanations:
                                </p>
                                <textarea
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    rows={4}
                                    placeholder="e.g. On page 2, the quorum equation omitted the floor operator..."
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                                />
                                <div className="flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setReportingNoteId(null)}
                                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReportSubmit}
                                        disabled={!reportReason.trim()}
                                        className="rounded-lg bg-[#0B132B] px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
                                    >
                                        Submit Report
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
