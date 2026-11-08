import React, { useState } from 'react';
import { StructuredNote } from '../../types/stellegent';
import { stellegentApi } from '../../services/stellegentApi';
import {
    Edit3,
    Save,
    RotateCcw,
    Check,
    Sparkles,
    BookOpen,
    Calculator,
    ListOrdered,
    CheckCircle2,
    Copy,
    Download,
    Share2,
    FileText,
    CheckSquare,
    Square,
    ExternalLink
} from 'lucide-react';

interface StructuredNotesViewProps {
    note?: StructuredNote;
    lectureId: string;
    onNoteUpdated: (updated: StructuredNote) => void;
}

export const StructuredNotesView: React.FC<StructuredNotesViewProps> = ({ note, lectureId, onNoteUpdated }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(note?.title || '');
    const [editSummary, setEditSummary] = useState(note?.summary || '');
    const [markdownOverride, setMarkdownOverride] = useState(note?.user_markdown_override || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [completedTakeaways, setCompletedTakeaways] = useState<Record<number, boolean>>({});
    const [activeFilter, setActiveFilter] = useState<'all' | 'tier1' | 'tier2' | 'tier3' | 'math'>('all');

    if (!note) {
        return (
            <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <BookOpen size={40} className="mx-auto mb-3 text-indigo-400 animate-pulse" />
                <p className="text-base font-bold text-slate-700 dark:text-slate-200">Notes are being synthesized...</p>
                <p className="text-xs text-slate-400 mt-1">Multi-tier verified notes will appear here once vision processing finishes.</p>
            </div>
        );
    }

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updated = await stellegentApi.updateNote(lectureId, {
                title: editTitle,
                summary: editSummary,
                user_markdown_override: markdownOverride || undefined,
            });
            onNoteUpdated(updated);
            setIsEditing(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (err) {
            console.error('Failed to update note:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = () => {
        setEditTitle(note.title);
        setEditSummary(note.summary);
        setMarkdownOverride(note.user_markdown_override || '');
        setIsEditing(false);
    };

    const handleCopyText = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const toggleTakeaway = (idx: number) => {
        setCompletedTakeaways(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header and Editor Controls */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                            Verified Academic Notes
                        </span>
                        {saveSuccess && (
                            <span className="flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                                <Check size={14} />
                                <span>Saved successfully</span>
                            </span>
                        )}
                    </div>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="mt-2 text-xl font-bold px-3 py-1.5 rounded-xl border border-indigo-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-full max-w-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    ) : (
                        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {note.title}
                        </h1>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleDiscard}
                                disabled={isSaving}
                                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <RotateCcw size={14} />
                                <span>Discard</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
                            >
                                <Save size={14} />
                                <span>{isSaving ? 'Saving...' : 'Save Notes'}</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => {
                                setEditTitle(note.title);
                                setEditSummary(note.summary);
                                setMarkdownOverride(note.user_markdown_override || '');
                                setIsEditing(true);
                            }}
                            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                        >
                            <Edit3 size={14} />
                            <span>Edit Notes</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Filter Navigation Bar */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400'}`}
                >
                    All Sections
                </button>
                <button
                    onClick={() => setActiveFilter('tier1')}
                    className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${activeFilter === 'tier1' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400'}`}
                >
                    Tier 1: Board Verbatim
                </button>
                <button
                    onClick={() => setActiveFilter('tier2')}
                    className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${activeFilter === 'tier2' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400'}`}
                >
                    Tier 2: AI Structure
                </button>
                <button
                    onClick={() => setActiveFilter('math')}
                    className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${activeFilter === 'math' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400'}`}
                >
                    Formulas & Math
                </button>
                <button
                    onClick={() => setActiveFilter('tier3')}
                    className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${activeFilter === 'tier3' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400'}`}
                >
                    Tier 3: Context & Insights
                </button>
            </div>

            {/* Lecture Summary Card */}
            {(activeFilter === 'all' || activeFilter === 'tier2') && (
                <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                            Executive Overview
                        </span>
                        <button
                            onClick={() => handleCopyText(note.summary, 999)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                        >
                            <Copy size={12} />
                            <span>{copiedIndex === 999 ? 'Copied' : 'Copy'}</span>
                        </button>
                    </div>
                    {isEditing ? (
                        <textarea
                            value={editSummary}
                            onChange={(e) => setEditSummary(e.target.value)}
                            rows={3}
                            className="w-full text-sm p-3.5 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    ) : (
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                            {note.summary}
                        </p>
                    )}
                </div>
            )}

            {/* TIER 1: Verbatim Transcribed Board Content */}
            {(activeFilter === 'all' || activeFilter === 'tier1') && (
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center space-x-2.5">
                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                    1. Source Whiteboard Transcription (Verbatim)
                                </h2>
                                <p className="text-[11px] text-slate-400">Exact OCR transcription of instructor chalkboard text without alterations</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-900">
                                Raw Sensor Truth
                            </span>
                            <button
                                onClick={() => handleCopyText(note.original_transcription, 1001)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 text-xs font-semibold flex items-center space-x-1"
                                title="Copy raw transcription"
                            >
                                <Copy size={13} />
                                <span className="hidden sm:inline">{copiedIndex === 1001 ? 'Copied' : 'Copy Raw'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto">
                        {note.original_transcription || 'No verbatim transcription available.'}
                    </div>
                </div>
            )}

            {/* TIER 2: AI-Organized Notes & Structure */}
            {(activeFilter === 'all' || activeFilter === 'tier2' || activeFilter === 'math') && (
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center space-x-2.5">
                            <span className="w-3 h-3 rounded-full bg-indigo-500" />
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                    Tier 2: AI-Organized Conceptual Structure
                                </h2>
                                <p className="text-[11px] text-slate-400">Categorized hierarchy: definitions, equations, sections, and algorithms</p>
                            </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-900">
                            Pedagogical Structure
                        </span>
                    </div>

                    {/* Key Definitions Grid */}
                    {note.key_definitions && note.key_definitions.length > 0 && activeFilter !== 'math' && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                                <BookOpen size={14} className="text-indigo-500" />
                                <span>Key Definitions & Glossary</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {note.key_definitions.map((def, i) => (
                                    <div
                                        key={i}
                                        className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{def.term}</span>
                                            {def.context && (
                                                <span className="text-[10px] text-slate-400 italic font-medium">{def.context}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">{def.definition}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Equations and Formulas */}
                    {note.equations_and_formulas && note.equations_and_formulas.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                                <Calculator size={14} className="text-emerald-500" />
                                <span>Mathematical Formulas & Governing Equations</span>
                            </h3>
                            <div className="grid grid-cols-1 gap-3.5">
                                {note.equations_and_formulas.map((eq, i) => (
                                    <div
                                        key={i}
                                        className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 inline-block shadow-sm">
                                                {eq.latex_or_text}
                                            </div>
                                            <button
                                                onClick={() => handleCopyText(eq.latex_or_text, 200 + i)}
                                                className="px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 transition-colors flex items-center space-x-1"
                                            >
                                                <Copy size={11} />
                                                <span>{copiedIndex === 200 + i ? 'Copied' : 'Copy LaTeX'}</span>
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{eq.explanation}</p>
                                        {eq.variables && Object.keys(eq.variables).length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1 border-t border-emerald-100 dark:border-emerald-900/50">
                                                {Object.entries(eq.variables).map(([k, v], vIdx) => (
                                                    <span key={vIdx} className="text-[10px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                                                        <strong className="text-emerald-600 dark:text-emerald-400">{k}</strong>: {v}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step-by-Step Sections */}
                    {note.sections && note.sections.length > 0 && activeFilter !== 'math' && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                                <ListOrdered size={14} className="text-indigo-500" />
                                <span>Detailed Lecture Modules</span>
                            </h3>
                            <div className="space-y-3.5">
                                {note.sections.map((s, idx) => (
                                    <div key={idx} className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                            {s.heading}
                                        </h4>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {s.content}
                                        </p>
                                        {s.subsections && s.subsections.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {s.subsections.map((sub, sIdx) => (
                                                    <span key={sIdx} className="text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                                                        {sub}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Interactive Key Takeaways Checklist */}
                    {note.key_takeaways && note.key_takeaways.length > 0 && activeFilter !== 'math' && (
                        <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                            <h3 className="text-xs font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                                <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                                <span>Exam & Revision Mastery Checklist</span>
                            </h3>
                            <div className="space-y-2">
                                {note.key_takeaways.map((t, i) => {
                                    const isDone = Boolean(completedTakeaways[i]);
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => toggleTakeaway(i)}
                                            className={`flex items-start space-x-2.5 p-2 rounded-xl cursor-pointer transition-all ${isDone ? 'bg-indigo-100/70 dark:bg-indigo-900/40 line-through opacity-75' : 'hover:bg-white/60 dark:hover:bg-slate-900/60'}`}
                                        >
                                            {isDone ? (
                                                <CheckSquare size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                                            ) : (
                                                <Square size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                                            )}
                                            <span className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                                                {t}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TIER 3: AI-Added Explanations & Supplementary Context */}
            {(activeFilter === 'all' || activeFilter === 'tier3') && (
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-purple-100 dark:border-purple-900/40">
                        <div className="flex items-center space-x-2.5">
                            <Sparkles size={17} className="text-purple-500" />
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                                    3. AI-Added Explanations & Expanded Context
                                </h2>
                                <p className="text-[11px] text-slate-400">Supplementary context, proofs, and real-world practical applications</p>
                            </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-900">
                            Supplementary Material
                        </span>
                    </div>
                    <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {note.ai_added_explanations || 'No additional AI explanations generated.'}
                    </div>
                </div>
            )}
        </div>
    );
};
