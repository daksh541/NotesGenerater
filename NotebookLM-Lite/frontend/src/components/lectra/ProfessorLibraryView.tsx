import React, { useState, useEffect } from 'react';
import {
    GraduationCap,
    Sparkles,
    Search,
    Mail,
    BookOpen,
    Layers,
    FileText,
    Star,
} from 'lucide-react';
import { ProfessorProfile } from '../../types/lectra';

interface ProfessorLibraryViewProps {
    professors: ProfessorProfile[];
    onSelectProfessorForNotes: (professorName: string) => void;
}

export const ProfessorLibraryView: React.FC<ProfessorLibraryViewProps> = ({
    professors,
    onSelectProfessorForNotes,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProf, setSelectedProf] = useState<ProfessorProfile | null>(
        professors[0] || null
    );

    useEffect(() => {
        if (!selectedProf && professors.length > 0) {
            setSelectedProf(professors[0]);
        }
    }, [professors, selectedProf]);

    const filtered = professors.filter(
        (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.subjects_taught.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const activeProf = selectedProf || filtered[0] || professors[0];

    return (
        <div className="space-y-6 pb-16 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-200/80 pb-5 dark:border-slate-800">
                <div>
                    <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <GraduationCap size={15} />
                        <span>Faculty Pedagogical Profiles & Terminology Index</span>
                    </div>
                    <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                        Professor Library
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Inspect faculty teaching styles, preferred notations, active sections taught, and exam focus areas.
                    </p>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search faculty or department..."
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                {/* Left 4 Cols: Faculty Directory */}
                <div className="space-y-2.5 lg:col-span-4">
                    <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Department Faculty ({filtered.length})
                    </div>
                    {filtered.map((prof) => {
                        const isSelected = activeProf?.id === prof.id;
                        return (
                            <div
                                key={prof.id}
                                onClick={() => setSelectedProf(prof)}
                                className={`cursor-pointer rounded-xl border p-4 transition ${
                                    isSelected
                                        ? 'border-indigo-600 bg-indigo-50/40 shadow-saas dark:border-indigo-500 dark:bg-indigo-950/30'
                                        : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    {prof.avatar_url ? (
                                        <img
                                            src={prof.avatar_url}
                                            alt={prof.name}
                                            className="h-11 w-11 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0B132B] text-white font-bold">
                                            {prof.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {prof.name}
                                        </h3>
                                        <div className="text-[11px] text-slate-500 truncate">
                                            {prof.title} • {prof.department}
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                            {prof.sections_taught.map((sec) => (
                                                <span
                                                    key={sec}
                                                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                >
                                                    Sec {sec}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right 8 Cols: Detailed Faculty Dossier */}
                {activeProf && (
                    <div className="space-y-6 lg:col-span-8">
                        <div className="rounded-xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-6">
                            {/* Dossier Header */}
                            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-100 pb-5 dark:border-slate-800">
                                <div className="flex items-center space-x-4">
                                    {activeProf.avatar_url && (
                                        <img
                                            src={activeProf.avatar_url}
                                            alt={activeProf.name}
                                            className="h-14 w-14 rounded-xl object-cover shadow-xs"
                                        />
                                    )}
                                    <div>
                                        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                                            {activeProf.name}
                                        </h2>
                                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                            {activeProf.title} • {activeProf.department}
                                        </p>
                                        {activeProf.email && (
                                            <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                                                <Mail size={11} />
                                                <span>{activeProf.email}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => onSelectProfessorForNotes(activeProf.name)}
                                    className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0B132B] hover:bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition dark:bg-indigo-600 dark:hover:bg-indigo-500"
                                >
                                    <Sparkles size={14} />
                                    <span>Synthesize Notes with {activeProf.name.split(' ').pop()}</span>
                                </button>
                            </div>

                            {/* Courses & Active Sections */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                                    <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase text-slate-400">
                                        <BookOpen size={12} />
                                        <span>Courses Taught</span>
                                    </div>
                                    <div className="mt-1.5 space-y-1">
                                        {activeProf.subjects_taught.map((s, i) => (
                                            <div key={i} className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                {s}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                                    <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase text-slate-400">
                                        <Layers size={12} />
                                        <span>Classroom Sections</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {activeProf.sections_taught.map((sec) => (
                                            <span
                                                key={sec}
                                                className="rounded bg-[#0B132B] px-2 py-0.5 text-xs font-semibold text-white dark:bg-indigo-600"
                                            >
                                                Section {sec}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                                    <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase text-slate-400">
                                        <FileText size={12} />
                                        <span>Reference Corpus</span>
                                    </div>
                                    <div className="mt-1.5 font-display text-xl font-bold text-slate-900 dark:text-white">
                                        {activeProf.reference_materials_count} Documents
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        Syllabi, papers & slide decks
                                    </div>
                                </div>
                            </div>

                            {/* Observed Teaching Style */}
                            <div>
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Observed Teaching Style & Lecture Delivery
                                </h4>
                                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 leading-relaxed">
                                    {activeProf.teaching_style}
                                </div>
                            </div>

                            {/* Preferred Terminology Mappings */}
                            <div>
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Preferred Terminology Mappings
                                </h4>
                                <div className="space-y-2">
                                    {Object.entries(activeProf.preferred_terminology).map(
                                        ([standard, profTerm]) => (
                                            <div
                                                key={standard}
                                                className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50/60 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/50"
                                            >
                                                <span className="font-mono text-slate-500">
                                                    {standard.replace(/_/g, ' ')}
                                                </span>
                                                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                                                    → "{profTerm}"
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Exam Focus Topics */}
                            <div>
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    High-Frequency Midterm & Final Exam Topics
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {activeProf.exam_focus_topics.map((topic, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center space-x-1 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
                                        >
                                            <Star size={12} className="text-amber-500 fill-amber-500" />
                                            <span>{topic}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Formatting Preferences */}
                            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Grading & Formatting Preferences
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {activeProf.formatting_preferences}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
