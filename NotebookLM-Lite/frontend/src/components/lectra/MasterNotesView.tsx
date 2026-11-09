import React, { useState, useEffect, useRef } from 'react';
import {
    BookOpen,
    Download,
    Share2,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    FileText,
    Edit3,
    Save,
    MessageSquare,
    Quote,
    Award,
    Terminal,
    GitBranch,
    HelpCircle,
    ChevronRight,
    RefreshCw,
    Table as TableIcon,
    Eye,
    Layers,
    ShieldAlert,
    ChevronDown,
    PanelRightClose,
    PanelRightOpen,
    List,
    ExternalLink,
    Check,
} from 'lucide-react';
import { MasterNoteContent, SmartDiagram } from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';

interface MasterNotesViewProps {
    note: MasterNoteContent;
    diagrams: SmartDiagram[];
    studyKit?: any;
    allNotes?: MasterNoteContent[];
    onSelectNote?: (note: MasterNoteContent) => void;
    onOpenDiagrams?: () => void;
    onOpenStudyKit: (lectureId?: string) => void;
    onNoteUpdated: (updated: MasterNoteContent) => void;
    onOpenChat?: (note: MasterNoteContent) => void;
}

export const MasterNotesView: React.FC<MasterNotesViewProps> = ({
    note,
    diagrams,
    studyKit,
    allNotes = [],
    onSelectNote,
    onOpenDiagrams,
    onOpenStudyKit,
    onNoteUpdated,
    onOpenChat,
}) => {
    const [activeMode, setActiveMode] = useState<'structured' | 'markdown' | 'split_board'>('structured');
    const [markdownDraft, setMarkdownDraft] = useState(
        note.user_markdown_override || note.ai_synthesized_markdown
    );
    const [titleDraft, setTitleDraft] = useState(note.title);
    const [saving, setSaving] = useState(false);
    const [saveToast, setSaveToast] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
    const [sharing, setSharing] = useState(false);
    const [sharedToast, setSharedToast] = useState(false);
    const [showNotesSwitcher, setShowNotesSwitcher] = useState(false);
    const [showOriginalForDiag, setShowOriginalForDiag] = useState<Record<string, boolean>>({});

    // Collapsible Right Panel State (Ask AI & Sources)
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [rightPanelTab, setRightPanelTab] = useState<'ask_ai' | 'sources'>('ask_ai');

    // Export Dropdown State
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Active TOC anchor
    const [activeSectionId, setActiveSectionId] = useState<string>('sec-overview');

    // Grounded Q&A Assistant state
    const [qaQuery, setQaQuery] = useState('');
    const [qaLoading, setQaLoading] = useState(false);
    const [qaHistory, setQaHistory] = useState<
        { q: string; a: string; citation: string; confidence?: number }[]
    >([
        {
            q: 'What did the professor emphasize most for the upcoming exam?',
            a:
                note.sections[0]?.professor_emphasis ||
                `Professor ${note.professor} emphasized verifying safety invariants and quorum intersection before substituting numerical bounds.`,
            citation: `${note.citations[0]?.source_name || 'Classroom Whiteboard'} (${
                note.citations[0]?.page_or_region || 'Center Board'
            })`,
            confidence: note.ocr_confidence || 0.94,
        },
    ]);

    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setMarkdownDraft(note.user_markdown_override || note.ai_synthesized_markdown);
        setTitleDraft(note.title);
    }, [note.id, note.ai_synthesized_markdown, note.user_markdown_override, note.title]);

    const handleMarkdownChange = (newMd: string) => {
        setMarkdownDraft(newMd);
        setAutoSaveStatus('saving');
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                const res = await lectraApi.updateMasterNote(note.lecture_id, {
                    title: titleDraft,
                    user_markdown_override: newMd,
                });
                onNoteUpdated(res.note);
                setAutoSaveStatus('saved');
            } catch {
                setAutoSaveStatus('idle');
            }
        }, 900);
    };

    const handleSaveMarkdown = async () => {
        setSaving(true);
        try {
            const res = await lectraApi.updateMasterNote(note.lecture_id, {
                title: titleDraft,
                user_markdown_override: markdownDraft,
            });
            onNoteUpdated(res.note);
            setSaveToast(true);
            setAutoSaveStatus('saved');
            setTimeout(() => setSaveToast(false), 2500);
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerateSection = async (idx: number) => {
        setRegeneratingIdx(idx);
        try {
            const res = await lectraApi.regenerateSection(note.lecture_id, idx);
            onNoteUpdated(res.note);
        } finally {
            setRegeneratingIdx(null);
        }
    };

    const handleShareToVault = async () => {
        setSharing(true);
        try {
            await lectraApi.shareToVault({
                lecture_id: note.lecture_id,
                title: note.title,
                chapter: note.chapter,
                subject_code: note.subject_code,
                section: note.section,
                summary: note.summary,
                explicit_permission_granted: true,
            });
            setSharedToast(true);
            setTimeout(() => setSharedToast(false), 3000);
        } finally {
            setSharing(false);
        }
    };

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!qaQuery.trim() || qaLoading) return;
        const q = qaQuery.trim();
        setQaQuery('');
        setQaLoading(true);
        try {
            const res = await lectraApi.askNoteQuestion(note.lecture_id, q);
            setQaHistory((prev) => [
                ...prev,
                {
                    q,
                    a: res.answer,
                    citation: res.primary_citation,
                    confidence: res.ocr_confidence,
                },
            ]);
        } catch {
            setQaHistory((prev) => [
                ...prev,
                {
                    q,
                    a: `Grounded in ${note.title} (${note.chapter}): ${note.summary}`,
                    citation: note.citations[0]?.source_name || 'Verified Master Note',
                },
            ]);
        } finally {
            setQaLoading(false);
        }
    };

    const scrollToSection = (id: string) => {
        setActiveSectionId(id);
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const tocItems = [
        { id: 'sec-overview', label: 'Chapter Overview' },
        { id: 'sec-notes', label: 'Detailed Notes' },
        ...(note.key_definitions.length > 0 ? [{ id: 'sec-definitions', label: 'Definitions' }] : []),
        ...(note.important_formulas.length > 0 ? [{ id: 'sec-formulas', label: 'Key Formulas' }] : []),
        ...(note.important_examples.length > 0 ? [{ id: 'sec-examples', label: 'Examples' }] : []),
        ...(note.tables && note.tables.length > 0 ? [{ id: 'sec-tables', label: 'Tables' }] : []),
        ...(diagrams.length > 0 ? [{ id: 'sec-diagrams', label: 'Smart Diagrams' }] : []),
        ...(note.exam_focused_concepts.length > 0 ? [{ id: 'sec-exam', label: 'Exam Focus Topics' }] : []),
        ...(note.citations.length > 0 ? [{ id: 'sec-citations', label: 'Source References' }] : []),
    ];

    return (
        <div className="space-y-5 max-w-7xl mx-auto pb-16 animate-fade-in">
            {/* Top Minimal Academic Document Header */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold mb-1.5">
                            <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {note.subject_code}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {note.chapter}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                Sec {note.section}
                            </span>
                            {allNotes.length > 1 && onSelectNote && (
                                <div className="relative inline-block">
                                    <button
                                        type="button"
                                        onClick={() => setShowNotesSwitcher(!showNotesSwitcher)}
                                        className="inline-flex items-center space-x-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition text-[11px]"
                                    >
                                        <span>Switch Note</span>
                                        <ChevronDown size={11} />
                                    </button>
                                    {showNotesSwitcher && (
                                        <div className="absolute left-0 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                                            <div className="px-2 py-1 text-[10px] font-semibold uppercase text-slate-400">
                                                My Master Notes
                                            </div>
                                            {allNotes.map((n) => (
                                                <button
                                                    key={n.id}
                                                    type="button"
                                                    onClick={() => {
                                                        onSelectNote(n);
                                                        setShowNotesSwitcher(false);
                                                    }}
                                                    className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition truncate"
                                                >
                                                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                                                        {n.chapter || n.title}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {n.subject_code} • Sec {n.section}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 size={12} />
                                <span>Verified • OCR {Math.round((note.ocr_confidence || 0.94) * 100)}%</span>
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                            {note.title}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Prof. {note.professor} • {note.subject_name} • Last revised {new Date(note.updated_at).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Simple Clean Toolbar: Edit, Share, Ask AI, Export, Study Kit */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Mode Switcher */}
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-800">
                            <button
                                type="button"
                                onClick={() => setActiveMode('structured')}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                    activeMode === 'structured'
                                        ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                Reader
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveMode('markdown')}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                    activeMode === 'markdown'
                                        ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                Edit Markdown
                            </button>
                        </div>

                        {/* Toggle Right Panel (Ask AI & Sources) */}
                        <button
                            type="button"
                            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                            className={`inline-flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                                isRightPanelOpen
                                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                            }`}
                        >
                            <MessageSquare size={13} />
                            <span>Ask AI / Sources</span>
                        </button>

                        {/* Share to Section Vault */}
                        <button
                            type="button"
                            onClick={handleShareToVault}
                            disabled={sharing}
                            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition"
                        >
                            <Share2 size={13} />
                            <span>{sharedToast ? 'Published!' : 'Share to Vault'}</span>
                        </button>

                        {/* Export Menu */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-2xs transition"
                            >
                                <Download size={13} />
                                <span>Export</span>
                                <ChevronDown size={12} className="text-slate-400" />
                            </button>

                            {showExportMenu && (
                                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                                    <a
                                        href={lectraApi.getExportUrl('pdf', note.lecture_id)}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={() => setShowExportMenu(false)}
                                        className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        <FileText size={13} className="text-indigo-600" />
                                        <span>Download PDF</span>
                                    </a>
                                    <a
                                        href={lectraApi.getExportUrl('docx', note.lecture_id)}
                                        download
                                        onClick={() => setShowExportMenu(false)}
                                        className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        <FileText size={13} className="text-indigo-600" />
                                        <span>Download DOCX</span>
                                    </a>
                                    <a
                                        href={lectraApi.getExportUrl('markdown', note.lecture_id)}
                                        download
                                        onClick={() => setShowExportMenu(false)}
                                        className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        <Terminal size={13} className="text-indigo-600" />
                                        <span>Download Markdown (.md)</span>
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Quick Jump to Study Kit */}
                        <button
                            type="button"
                            onClick={() => onOpenStudyKit(note.lecture_id)}
                            className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-2xs transition"
                        >
                            <Sparkles size={13} />
                            <span>Study Kit</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Document Reading Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* 1. Compact Left Table of Contents Outline (~3 cols) */}
                <div className="hidden lg:block lg:col-span-3 sticky top-20">
                    <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                            <List size={13} />
                            <span>Table of Contents</span>
                        </div>
                        <nav className="space-y-0.5">
                            {tocItems.map((item) => {
                                const isActive = activeSectionId === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => scrollToSection(item.id)}
                                        className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition truncate ${
                                            isActive
                                                ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950 dark:text-indigo-300'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* 2. Main Document Area (6 to 9 cols depending on Right Panel) */}
                <div className={`${isRightPanelOpen ? 'lg:col-span-6' : 'lg:col-span-9'} space-y-5`}>
                    {activeMode === 'structured' && (
                        <>
                            {/* Chapter Overview & Learning Objectives */}
                            <div
                                id="sec-overview"
                                className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
                            >
                                <div>
                                    <h2 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5">
                                        Chapter Overview
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                        {note.summary}
                                    </p>
                                </div>

                                {note.learning_objectives.length > 0 && (
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                            Learning Objectives
                                        </h3>
                                        <div className="space-y-1.5">
                                            {note.learning_objectives.map((obj, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300"
                                                >
                                                    <CheckCircle2 size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                                                    <span>{obj}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Detailed Notes */}
                            <div id="sec-notes" className="space-y-4">
                                {note.sections.map((sec, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                                {sec.heading}
                                            </h3>
                                            <div className="flex items-center space-x-2 shrink-0">
                                                {sec.is_exam_critical && (
                                                    <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                                        Exam Critical
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRegenerateSection(idx)}
                                                    disabled={regeneratingIdx === idx}
                                                    className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                                    title="Regenerate Section"
                                                >
                                                    <RefreshCw
                                                        size={13}
                                                        className={regeneratingIdx === idx ? 'animate-spin text-indigo-600' : ''}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                            {sec.content}
                                        </div>

                                        {sec.professor_emphasis && (
                                            <div className="rounded-lg bg-indigo-50/70 p-3 text-xs text-indigo-950 border-l-3 border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-200">
                                                <div className="font-semibold text-[11px] mb-0.5">
                                                    Prof. {note.professor}'s Emphasis:
                                                </div>
                                                <p>{sec.professor_emphasis}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Definitions */}
                            {note.key_definitions.length > 0 && (
                                <div
                                    id="sec-definitions"
                                    className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
                                >
                                    <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        Definitions
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {note.key_definitions.map((def, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40 space-y-1"
                                            >
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {def.term}
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                                    {def.definition}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Important Formulas */}
                            {note.important_formulas.length > 0 && (
                                <div
                                    id="sec-formulas"
                                    className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
                                >
                                    <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        Key Formulas & Theorems
                                    </h3>
                                    <div className="space-y-3">
                                        {note.important_formulas.map((eq, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-lg border border-slate-200 bg-slate-950 p-3.5 text-white dark:border-slate-800 space-y-1.5"
                                            >
                                                <div className="font-mono text-xs text-amber-300">
                                                    {eq.latex_or_text}
                                                </div>
                                                <p className="text-xs text-slate-300">
                                                    {eq.explanation}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tables */}
                            {note.tables && note.tables.length > 0 && (
                                <div
                                    id="sec-tables"
                                    className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
                                >
                                    <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        Synthesized Tables
                                    </h3>
                                    <div className="space-y-4">
                                        {note.tables.map((tbl, tIdx) => (
                                            <div
                                                key={tIdx}
                                                className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-800"
                                            >
                                                <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                                    {tbl.title}
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                                                            <tr>
                                                                {tbl.headers.map((h, hIdx) => (
                                                                    <th key={hIdx} className="p-2.5 font-semibold">
                                                                        {h}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {tbl.rows.map((row, rIdx) => (
                                                                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                                    {row.map((cell, cIdx) => (
                                                                        <td key={cIdx} className="p-2.5 text-slate-700 dark:text-slate-300">
                                                                            {cell}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Smart Diagrams */}
                            {diagrams.length > 0 && (
                                <div
                                    id="sec-diagrams"
                                    className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
                                >
                                    <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        Reconstructed Smart Diagrams
                                    </h3>
                                    <div className="space-y-4">
                                        {diagrams.map((diag) => (
                                            <div
                                                key={diag.id}
                                                className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 space-y-2"
                                            >
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {diag.title}
                                                </h4>
                                                <p className="text-[11px] text-slate-500">
                                                    {diag.description}
                                                </p>
                                                {diag.svg_code ? (
                                                    <div
                                                        className="w-full overflow-x-auto rounded-lg bg-white p-2 border border-slate-100 dark:border-slate-800"
                                                        dangerouslySetInnerHTML={{ __html: diag.svg_code }}
                                                    />
                                                ) : (
                                                    <pre className="p-3 rounded-lg bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto">
                                                        {diag.mermaid_code}
                                                    </pre>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Markdown Editor Mode with Auto-Save */}
                    {activeMode === 'markdown' && (
                        <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">
                                    Markdown Editor
                                </span>
                                <div className="flex items-center space-x-2">
                                    {autoSaveStatus === 'saving' && (
                                        <span className="text-[11px] text-amber-600 font-medium">Auto-saving...</span>
                                    )}
                                    {autoSaveStatus === 'saved' && (
                                        <span className="text-[11px] text-emerald-600 font-medium">✓ Saved</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleSaveMarkdown}
                                        disabled={saving}
                                        className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                                    >
                                        <Save size={13} />
                                        <span>Save</span>
                                    </button>
                                </div>
                            </div>

                            <input
                                type="text"
                                value={titleDraft}
                                onChange={(e) => setTitleDraft(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />

                            <textarea
                                value={markdownDraft}
                                onChange={(e) => handleMarkdownChange(e.target.value)}
                                rows={24}
                                className="w-full rounded-lg border border-slate-200 p-4 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                            />
                        </div>
                    )}
                </div>

                {/* 3. Collapsible Right Side Panel (Ask AI & Citations) (~3 cols) */}
                {isRightPanelOpen && (
                    <div className="lg:col-span-3 sticky top-20 space-y-3">
                        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                            {/* Panel Tab Switcher */}
                            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setRightPanelTab('ask_ai')}
                                    className={`flex-1 rounded-md py-1 text-[11px] font-semibold transition ${
                                        rightPanelTab === 'ask_ai'
                                            ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-700 dark:text-indigo-300'
                                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                                    }`}
                                >
                                    Ask AI
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRightPanelTab('sources')}
                                    className={`flex-1 rounded-md py-1 text-[11px] font-semibold transition ${
                                        rightPanelTab === 'sources'
                                            ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-700 dark:text-indigo-300'
                                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                                    }`}
                                >
                                    Sources ({note.citations.length})
                                </button>
                            </div>

                            {/* Ask AI Tab */}
                            {rightPanelTab === 'ask_ai' && (
                                <div className="space-y-3">
                                    {onOpenChat && (
                                        <button
                                            type="button"
                                            onClick={() => onOpenChat(note)}
                                            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-800 py-1.5 px-2 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                                        >
                                            <Sparkles size={13} />
                                            <span>Open in Notebook Chat (Full Grounded RAG)</span>
                                        </button>
                                    )}
                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                        {qaHistory.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800/60 space-y-1"
                                            >
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {item.q}
                                                </div>
                                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                                    {item.a}
                                                </p>
                                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400">
                                                    Ref: {item.citation}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <form onSubmit={handleAskQuestion} className="flex gap-1.5">
                                        <input
                                            type="text"
                                            value={qaQuery}
                                            onChange={(e) => setQaQuery(e.target.value)}
                                            placeholder="Ask about this note..."
                                            className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                        <button
                                            type="submit"
                                            disabled={qaLoading}
                                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                                        >
                                            {qaLoading ? '...' : 'Ask'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Sources Tab */}
                            {rightPanelTab === 'sources' && (
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                    {note.citations.map((cit) => (
                                        <div
                                            key={cit.citation_id}
                                            className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/50 space-y-1"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                    {cit.source_name}
                                                </span>
                                                <span className="text-[9px] rounded bg-indigo-50 px-1 py-0.2 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                    {cit.section_tag || 'Official'}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {cit.page_or_region}
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                                                &ldquo;{cit.quote}&rdquo;
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
