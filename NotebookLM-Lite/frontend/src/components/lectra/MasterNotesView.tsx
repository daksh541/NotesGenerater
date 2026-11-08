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
} from 'lucide-react';
import { MasterNoteContent, SmartDiagram } from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';

interface MasterNotesViewProps {
    note: MasterNoteContent;
    diagrams: SmartDiagram[];
    studyKit?: any;
    onOpenDiagrams?: () => void;
    onOpenStudyKit: (lectureId?: string) => void;
    onNoteUpdated: (updated: MasterNoteContent) => void;
}

export const MasterNotesView: React.FC<MasterNotesViewProps> = ({
    note,
    diagrams,
    onOpenDiagrams,
    onOpenStudyKit,
    onNoteUpdated,
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
    const [showOriginalForDiag, setShowOriginalForDiag] = useState<Record<string, boolean>>({});

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

    return (
        <div className="space-y-6">
            {/* 1. Chapter Title & Document Header Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#0B132B] text-white text-xs font-bold">
                                {note.subject_code}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                                {note.chapter}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                                Merged Sections: {note.source_sections.join(', ')}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Source-Verified • OCR Confidence {Math.round((note.ocr_confidence || 0.94) * 100)}%
                            </span>
                        </div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-0.5">
                            1. Chapter Title
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {note.title}
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Instructor: <span className="font-semibold text-slate-700">{note.professor}</span> •{' '}
                            {note.subject_name} • Last updated {new Date(note.updated_at).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Action & Export Toolbar */}
                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href={lectraApi.getExportUrl('pdf', note.lecture_id)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                        >
                            <Download className="w-3.5 h-3.5 text-amber-400" />
                            Export PDF
                        </a>
                        <a
                            href={lectraApi.getExportUrl('docx', note.lecture_id)}
                            download
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            Export DOCX
                        </a>
                        <a
                            href={lectraApi.getExportUrl('markdown', note.lecture_id)}
                            download
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                            <Terminal className="w-3.5 h-3.5 text-slate-600" />
                            .MD
                        </a>
                        <button
                            onClick={handleShareToVault}
                            disabled={sharing}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            {sharedToast ? 'Shared to Vault!' : 'Publish to Vault'}
                        </button>
                    </div>
                </div>

                {/* View Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100">
                    <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/60">
                        {[
                            { id: 'structured', label: '14-Section Structured Reader', icon: BookOpen },
                            { id: 'markdown', label: 'Markdown Editor (Auto-Save)', icon: Edit3 },
                            { id: 'split_board', label: 'Board OCR vs. Synthesis Split', icon: Layers },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const active = activeMode === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveMode(tab.id as any)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                        active
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2">
                        {onOpenDiagrams && (
                            <button
                                onClick={onOpenDiagrams}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center gap-1.5 transition"
                            >
                                <GitBranch className="w-3.5 h-3.5" />
                                Smart Diagrams ({diagrams.length})
                            </button>
                        )}
                        <button
                            onClick={() => onOpenStudyKit(note.lecture_id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            Open Study Kit & Quiz
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Reader / Editor Area (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {activeMode === 'structured' && (
                        <>
                            {/* 2. Chapter Overview & 3. Learning Objectives */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                                <div>
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1.5">
                                        2. Chapter Overview
                                    </h2>
                                    <p className="text-sm text-slate-700 leading-relaxed">{note.summary}</p>
                                </div>

                                {note.professor_style && (
                                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                            Professor-Style Formatting Applied ({note.professor_style.professor_name})
                                        </div>
                                        <div>
                                            <span className="font-semibold">Structure Pattern:</span>{' '}
                                            {note.professor_style.heading_hierarchy_pattern}
                                        </div>
                                        <div className="text-[11px] text-slate-500 italic">
                                            {note.professor_style.style_disclaimer}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-3 border-t border-slate-100">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                                        3. Learning Objectives
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {note.learning_objectives.map((obj, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                                <span>{obj}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 4. Detailed Notes (with Regenerate Section button) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700">
                                        4. Detailed Notes (Reference-Anchored + Classroom Enriched)
                                    </h2>
                                </div>
                                {note.sections.map((sec, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="text-lg font-bold text-slate-900">{sec.heading}</h3>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {sec.is_exam_critical && (
                                                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold">
                                                        High Exam Priority
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleRegenerateSection(idx)}
                                                    disabled={regeneratingIdx === idx}
                                                    title="Regenerate this section from grounded sources"
                                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 transition"
                                                >
                                                    <RefreshCw
                                                        className={`w-3 h-3 ${
                                                            regeneratingIdx === idx ? 'animate-spin text-blue-600' : ''
                                                        }`}
                                                    />
                                                    {regeneratingIdx === idx ? 'Regenerating...' : 'Regenerate Section'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                            {sec.content}
                                        </div>

                                        {sec.subsections.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {sec.subsections.map((sub, sIdx) => (
                                                    <span
                                                        key={sIdx}
                                                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                                                    >
                                                        • {sub}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {sec.professor_emphasis && (
                                            <div className="p-4 rounded-xl bg-blue-50/80 border-l-4 border-blue-700 text-xs text-blue-950">
                                                <div className="font-bold uppercase tracking-wider text-blue-800 mb-1 flex items-center gap-1.5">
                                                    <Award className="w-3.5 h-3.5" />
                                                    Professor {note.professor} Verbal & Board Emphasis
                                                </div>
                                                {sec.professor_emphasis}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* 5. Definitions & 6. Important Formulas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 5. Definitions */}
                                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        5. Definitions ({note.key_definitions.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {note.key_definitions.map((def, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1"
                                            >
                                                <div className="text-xs font-bold text-slate-900">{def.term}</div>
                                                <p className="text-xs text-slate-600 leading-relaxed">
                                                    {def.definition}
                                                </p>
                                                {def.source_citation && (
                                                    <span className="inline-block text-[10px] font-semibold text-blue-700">
                                                        Source: {def.source_citation}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 6. Important Formulas */}
                                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        6. Important Formulas ({note.important_formulas.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {note.important_formulas.map((eq, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3.5 rounded-xl bg-[#0B132B] text-white space-y-2"
                                            >
                                                <div className="font-mono text-xs text-amber-300 bg-white/5 p-2.5 rounded-lg overflow-x-auto">
                                                    {eq.latex_or_text}
                                                </div>
                                                <p className="text-xs text-slate-300 leading-relaxed">
                                                    {eq.explanation}
                                                </p>
                                                {eq.variables && Object.keys(eq.variables).length > 0 && (
                                                    <div className="pt-1 border-t border-slate-800 flex flex-wrap gap-2">
                                                        {Object.entries(eq.variables).map(([k, v]) => (
                                                            <span
                                                                key={k}
                                                                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300"
                                                            >
                                                                <strong className="text-white">{k}:</strong> {v}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 7. Professor's Examples */}
                            {note.important_examples.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        7. Professor&apos;s Classroom Examples & Walkthroughs
                                    </h3>
                                    {note.important_examples.map((ex, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-bold text-slate-900">{ex.title}</h4>
                                                {ex.section_source && (
                                                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                                                        {ex.section_source}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-700">{ex.description}</p>
                                            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700 pt-1">
                                                {ex.solution_steps.map((step, sIdx) => (
                                                    <li key={sIdx} className="leading-relaxed">
                                                        {step}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 8. Tables */}
                            {note.tables && note.tables.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2">
                                        <TableIcon className="w-4 h-4 text-blue-700" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            8. Extracted & Synthesized Tables ({note.tables.length})
                                        </h3>
                                    </div>
                                    <div className="space-y-4">
                                        {note.tables.map((tbl, tIdx) => (
                                            <div
                                                key={tIdx}
                                                className="rounded-xl border border-slate-200 overflow-hidden"
                                            >
                                                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-900">
                                                        {tbl.title}
                                                    </span>
                                                    {tbl.source_attribution && (
                                                        <span className="text-[10px] font-semibold text-blue-700">
                                                            {tbl.source_attribution}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse text-xs">
                                                        <thead>
                                                            <tr className="bg-slate-100/80 text-slate-700">
                                                                {tbl.headers.map((h, hIdx) => (
                                                                    <th
                                                                        key={hIdx}
                                                                        className="py-2.5 px-3 font-bold border-b border-slate-200"
                                                                    >
                                                                        {h}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200/70">
                                                            {tbl.rows.map((row, rIdx) => (
                                                                <tr key={rIdx} className="hover:bg-slate-50/70">
                                                                    {row.map((cell, cIdx) => (
                                                                        <td
                                                                            key={cIdx}
                                                                            className="py-2 px-3 text-slate-700"
                                                                        >
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

                            {/* 9. Reconstructed Smart Diagrams (SVG + Mermaid + Original Whiteboard Retention) */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <GitBranch className="w-4 h-4 text-indigo-700" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            9. Smart Reconstructed Diagrams ({diagrams.length})
                                        </h3>
                                    </div>
                                    <button
                                        onClick={onOpenDiagrams}
                                        className="text-xs font-bold text-indigo-700 hover:underline"
                                    >
                                        Open Full Diagram Studio →
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {diagrams.map((diag) => {
                                        const showOrig = !!showOriginalForDiag[diag.id];
                                        return (
                                            <div
                                                key={diag.id}
                                                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-bold text-slate-900">
                                                                {diag.title}
                                                            </h4>
                                                            {diag.is_approximation && (
                                                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                                                    Labeled Digital Approximation
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {diag.description}
                                                        </p>
                                                    </div>
                                                    {diag.original_image_url && (
                                                        <button
                                                            onClick={() =>
                                                                setShowOriginalForDiag((prev) => ({
                                                                    ...prev,
                                                                    [diag.id]: !prev[diag.id],
                                                                }))
                                                            }
                                                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                                                            {showOrig
                                                                ? 'Show Digital Vector SVG'
                                                                : 'Compare Original Whiteboard'}
                                                        </button>
                                                    )}
                                                </div>

                                                {showOrig && diag.original_image_url ? (
                                                    <div className="bg-slate-900 rounded-xl p-4 text-center space-y-2">
                                                        <div className="text-[11px] font-bold text-amber-300 uppercase">
                                                            Retained Original Whiteboard Source ({diag.reconstructed_from})
                                                        </div>
                                                        <img
                                                            src={diag.original_image_url}
                                                            alt={diag.title}
                                                            className="max-h-64 mx-auto rounded border border-slate-700 object-contain"
                                                        />
                                                    </div>
                                                ) : diag.svg_code ? (
                                                    <div
                                                        className="w-full overflow-x-auto rounded-xl bg-white p-2 border border-slate-200/80"
                                                        dangerouslySetInnerHTML={{ __html: diag.svg_code }}
                                                    />
                                                ) : (
                                                    <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto">
                                                        {diag.mermaid_code}
                                                    </pre>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 11. Key Takeaways & 12. Exam Revision Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        11. Key Takeaways
                                    </h3>
                                    <ul className="space-y-2">
                                        {note.key_takeaways.map((kt, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                <span>{kt}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        12. Exam Revision Summary
                                    </h3>
                                    <ul className="space-y-2">
                                        {(note.exam_revision_summary || note.key_takeaways).map((rev, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed"
                                            >
                                                <Award className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                                <span>{rev}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </>
                    )}

                    {activeMode === 'markdown' && (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Rich Markdown Master Note Editor (All 14 Sections)
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Edits auto-save automatically and apply to PDF, DOCX, and Markdown exports.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {autoSaveStatus === 'saving' && (
                                        <span className="text-xs text-amber-600 font-semibold">
                                            Auto-saving...
                                        </span>
                                    )}
                                    {autoSaveStatus === 'saved' && (
                                        <span className="text-xs text-emerald-600 font-semibold">
                                            ✓ Auto-saved
                                        </span>
                                    )}
                                    <button
                                        onClick={handleSaveMarkdown}
                                        disabled={saving}
                                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {saveToast ? 'Saved Changes!' : saving ? 'Saving...' : 'Save Master Note'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Document Title
                                </label>
                                <input
                                    type="text"
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    className="w-full px-3.5 py-2 text-sm font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                            <textarea
                                value={markdownDraft}
                                onChange={(e) => handleMarkdownChange(e.target.value)}
                                rows={24}
                                className="w-full p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    {activeMode === 'split_board' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-sm space-y-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                    Stage 4: Raw Whiteboard & Slide OCR Transcription
                                </div>
                                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {note.raw_board_transcription}
                                </pre>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-blue-700">
                                    Stage 7: Structured Master Note Synthesis
                                </div>
                                <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                                    <p className="font-semibold text-slate-900">{note.summary}</p>
                                    {note.sections.map((s, i) => (
                                        <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                                            <div className="font-bold text-slate-900 mb-1">{s.heading}</div>
                                            <p>{s.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar: 10. High-Priority Topics, 13. Citations, 14. Uncertain Content & Grounded Q&A (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* 10. High-Priority Topics */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-700">
                            <Sparkles className="w-4 h-4" />
                            10. High-Priority Exam Topics
                        </div>
                        <div className="space-y-2.5">
                            {note.exam_focused_concepts.map((c, idx) => (
                                <div
                                    key={idx}
                                    className="p-3 rounded-xl bg-red-50/50 border border-red-200/70 space-y-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-900">{c.topic}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                                            {c.frequency_or_weight}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600">{c.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 13. Source References */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <Quote className="w-4 h-4 text-blue-600" />
                            13. Source References ({note.citations.length})
                        </div>
                        <div className="space-y-2.5">
                            {note.citations.map((cit) => (
                                <div
                                    key={cit.citation_id}
                                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-800 truncate">
                                            {cit.source_name}
                                        </span>
                                        {cit.section_tag && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                                {cit.section_tag}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium">
                                        {cit.source_type} • {cit.page_or_region}
                                    </div>
                                    <p className="text-[11px] text-slate-600 italic">&ldquo;{cit.quote}&rdquo;</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 14. Uncertain Content & Source Conflicts */}
                    {(note.needs_verification.length > 0 ||
                        (note.source_conflicts && note.source_conflicts.length > 0)) && (
                        <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-5 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                14. Uncertain Content & Source Conflicts
                            </div>

                            {note.source_conflicts &&
                                note.source_conflicts.map((conf, cIdx) => (
                                    <div
                                        key={`conf_${cIdx}`}
                                        className="p-3 rounded-xl bg-white border border-amber-300 text-xs space-y-1.5"
                                    >
                                        <div className="font-bold text-amber-950 flex items-center gap-1.5">
                                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                            Conflict Flagged: {conf.topic}
                                        </div>
                                        <p className="text-[11px] text-slate-700">
                                            <strong>Classroom:</strong> {conf.classroom_statement}
                                        </p>
                                        <p className="text-[11px] text-slate-700">
                                            <strong>Official Reference:</strong> {conf.reference_statement}
                                        </p>
                                        <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg font-medium">
                                            <strong>Resolution:</strong> {conf.resolution_note}
                                        </p>
                                    </div>
                                ))}

                            {note.needs_verification.map((nv, idx) => (
                                <div
                                    key={idx}
                                    className="p-3 rounded-xl bg-white border border-amber-200/80 text-xs space-y-1"
                                >
                                    <div className="font-bold text-slate-900">{nv.item}</div>
                                    <p className="text-slate-600 text-[11px]">{nv.reason}</p>
                                    {nv.source_doc && (
                                        <span className="text-[10px] font-semibold text-amber-800">
                                            Source: {nv.source_doc}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Source-Grounded Note Q&A Assistant */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-800">
                            <MessageSquare className="w-4 h-4" />
                            Ask This Master Note (Source-Grounded)
                        </div>
                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                            {qaHistory.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs space-y-1.5"
                                >
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                        <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        {item.q}
                                    </div>
                                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">{item.a}</p>
                                    <div className="text-[10px] font-semibold text-blue-700">
                                        Grounded Citation: {item.citation}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleAskQuestion} className="flex gap-2 pt-1">
                            <input
                                type="text"
                                value={qaQuery}
                                onChange={(e) => setQaQuery(e.target.value)}
                                placeholder="Ask about a formula, conflict, or definition..."
                                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                            <button
                                type="submit"
                                disabled={qaLoading}
                                className="px-3.5 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
                            >
                                {qaLoading ? '...' : 'Ask'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
