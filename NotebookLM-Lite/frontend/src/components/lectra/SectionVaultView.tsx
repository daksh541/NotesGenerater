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
} from 'lucide-react';
import {
    ProfessorProfile,
    SectionComparisonResult,
    SectionId,
    SectionVaultNote,
    SubjectModel,
    VerificationStatus,
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
    const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('');
    const [selectedProfessorFilter, setSelectedProfessorFilter] = useState<string>('');
    const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [verificationFilter, setVerificationFilter] = useState<string>('');
    const [notes, setNotes] = useState<SectionVaultNote[]>([]);
    const [loading, setLoading] = useState(true);

    // Cross-Section Comparison modal state
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [compareSec1, setCompareSec1] = useState<SectionId>('A');
    const [compareSec2, setCompareSec2] = useState<SectionId>('C');
    const [compareSubject, setCompareSubject] = useState('CS-244');
    const [comparisonResult, setComparisonResult] = useState<SectionComparisonResult | null>(null);
    const [comparing, setComparing] = useState(false);

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
                professor: selectedProfessorFilter || undefined,
                verification_status: verificationFilter || undefined,
                search: searchQuery || undefined,
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
        verificationFilter,
        searchQuery,
    ]);

    // Extract unique chapters & professors for client filter refinement
    const uniqueChapters = Array.from(new Set(notes.map((n) => n.chapter)));
    const uniqueProfessors =
        professors.length > 0
            ? professors.map((p) => p.name)
            : Array.from(new Set(notes.map((n) => n.professor)));

    const displayedNotes = notes.filter((n) => {
        if (selectedChapterFilter && n.chapter !== selectedChapterFilter) return false;
        return true;
    });

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
        setComparing(true);
        try {
            const res = await lectraApi.compareSections(compareSubject, 'Core Syllabus', [
                compareSec1,
                compareSec2,
            ]);
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
        setVerificationFilter('');
        setSearchQuery('');
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
                        Browse, filter, and compare peer-reviewed and source-verified Master Notes across all nine classroom sections.
                    </p>
                </div>

                <div className="flex items-center space-x-2.5">
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
                        className="inline-flex items-center space-x-2 rounded-lg bg-[#0B132B] hover:bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition dark:bg-indigo-600 dark:hover:bg-indigo-500"
                    >
                        <GitCompare size={14} />
                        <span>Compare Sections</span>
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

            {/* Search + Subject, Professor, Chapter & Verification Filters */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="relative lg:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notes, topics, or tags..."
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
            </div>

            {/* Verification Status Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">
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
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                            }`}
                        >
                            {tier.label}
                        </button>
                    ))}
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                    Showing {displayedNotes.length} note{displayedNotes.length === 1 ? '' : 's'}
                </span>
            </div>

            {/* Notes Grid */}
            {loading ? (
                <div className="py-16 text-center text-xs text-slate-400">
                    Loading Section Vault notes...
                </div>
            ) : displayedNotes.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                    <ShieldCheck size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        No notes match the selected filters
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Try clearing a filter or switching back to All Sections (A–I).
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {displayedNotes.map((note) => (
                        <div
                            key={note.id}
                            onClick={() => onSelectNote(note.lecture_id)}
                            className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-saas transition hover:border-indigo-400 hover:shadow-saas-md dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1.5">
                                        <span className="rounded-md bg-[#0B132B] px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-indigo-600">
                                            Section {note.section}
                                        </span>
                                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {note.subject_code}
                                        </span>
                                    </div>
                                    {renderVerificationBadge(note.verification_status)}
                                </div>

                                <h3 className="mt-3 font-display text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition line-clamp-1">
                                    {note.title}
                                </h3>
                                <div className="mt-1 text-xs font-medium text-slate-500">
                                    {note.chapter} • <span className="text-slate-700 dark:text-slate-300">{note.professor}</span>
                                </div>
                                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {note.summary}
                                </p>

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
                                            <span className="text-slate-400 block text-[10px]">
                                                {note.lecture_date}
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        className="flex items-center space-x-1.5"
                                        onClick={(e) => e.stopPropagation()}
                                    >
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
                                            className="rounded-lg bg-[#0B132B] p-1.5 text-white hover:bg-indigo-600 dark:bg-indigo-600 transition"
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

            {/* Modal 1: Cross-Section Comparison Tool */}
            {showCompareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                            <div>
                                <div className="flex items-center space-x-2 text-xs font-bold uppercase text-indigo-600">
                                    <GitCompare size={15} />
                                    <span>Cross-Section Comparison Engine</span>
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                                    Compare Professor Explanations & Section Emphasis
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

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4 bg-slate-50 p-3.5 rounded-xl dark:bg-slate-800/60">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                    Subject
                                </label>
                                <select
                                    value={compareSubject}
                                    onChange={(e) => setCompareSubject(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
                                >
                                    <option value="CS-244">CS-244 (Distributed Systems)</option>
                                    <option value="CS-224N">CS-224N (Deep Learning)</option>
                                    <option value="CS-161">CS-161 (Algorithms)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                    Section 1
                                </label>
                                <select
                                    value={compareSec1}
                                    onChange={(e) => setCompareSec1(e.target.value as SectionId)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
                                >
                                    {sectionsList.map((s) => (
                                        <option key={s} value={s}>
                                            Section {s}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                    Section 2
                                </label>
                                <select
                                    value={compareSec2}
                                    onChange={(e) => setCompareSec2(e.target.value as SectionId)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
                                >
                                    {sectionsList.map((s) => (
                                        <option key={s} value={s}>
                                            Section {s}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={handleRunComparison}
                                    disabled={comparing}
                                    className="w-full rounded-lg bg-[#0B132B] hover:bg-indigo-600 py-2 text-xs font-semibold text-white transition dark:bg-indigo-600"
                                >
                                    {comparing ? 'Analyzing...' : 'Run Comparison'}
                                </button>
                            </div>
                        </div>

                        {comparisonResult && (
                            <div className="mt-6 space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Shared Core Concepts ({comparisonResult.shared_core_concepts.length})
                                    </h4>
                                    <div className="space-y-1.5">
                                        {comparisonResult.shared_core_concepts.map((concept, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center space-x-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-800 dark:bg-slate-800/60 dark:text-slate-200 font-medium"
                                            >
                                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                                <span>{concept}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
                                        <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-300 uppercase">
                                            Section {compareSec1} Emphasis
                                        </h5>
                                        <ul className="mt-2 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                                            {(
                                                comparisonResult.section_specific_explanations[
                                                    `Section ${compareSec1}`
                                                ] || []
                                            ).map((exp, i) => (
                                                <li key={i} className="flex items-start space-x-1.5">
                                                    <span className="text-indigo-600 font-bold">•</span>
                                                    <span>{exp}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                                        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase">
                                            Section {compareSec2} Emphasis
                                        </h5>
                                        <ul className="mt-2 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                                            {(
                                                comparisonResult.section_specific_explanations[
                                                    `Section ${compareSec2}`
                                                ] || []
                                            ).map((exp, i) => (
                                                <li key={i} className="flex items-start space-x-1.5">
                                                    <span className="text-indigo-600 font-bold">•</span>
                                                    <span>{exp}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal 2: Report Inaccuracy Modal */}
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
