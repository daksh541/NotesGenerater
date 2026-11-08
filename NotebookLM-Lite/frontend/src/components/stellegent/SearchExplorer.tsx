import React, { useState, useEffect } from 'react';
import { Subject, CrossLectureConnection } from '../../types/stellegent';
import { stellegentApi } from '../../services/stellegentApi';
import { Search, Filter, BookOpen, GitFork, Calendar, User, ArrowRight, Sparkles, Tag } from 'lucide-react';

interface SearchExplorerProps {
    subjects: Subject[];
    onSelectLecture: (lectureId: string) => void;
}

export const SearchExplorer: React.FC<SearchExplorerProps> = ({ subjects, onSelectLecture }) => {
    const [query, setQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [teacherFilter, setTeacherFilter] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [connections, setConnections] = useState<CrossLectureConnection[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<'search' | 'connections'>('search');

    useEffect(() => {
        handleSearch();
        loadConnections();
    }, [selectedSubject, teacherFilter]);

    const handleSearch = async () => {
        setIsSearching(true);
        try {
            const data = await stellegentApi.searchKnowledge({
                q: query.trim() || undefined,
                subject_id: selectedSubject || undefined,
                teacher: teacherFilter.trim() || undefined,
            });
            setResults(data);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const loadConnections = async () => {
        try {
            const conns = await stellegentApi.listConnections();
            setConnections(conns);
        } catch (err) {
            console.error('Failed to load connections:', err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Bar & Mode Switcher */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                            <Search size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Knowledge Search & Cross-Lecture Links</h2>
                            <p className="text-xs text-slate-500">Query transcribed text, teacher formulas, and connected topics</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                        <button
                            onClick={() => setActiveTab('search')}
                            className={`px-3.5 py-1.5 rounded-lg transition-colors ${activeTab === 'search' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Lecture Search ({results.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('connections')}
                            className={`px-3.5 py-1.5 rounded-lg transition-colors ${activeTab === 'connections' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Cross-Lecture Links ({connections.length})
                        </button>
                    </div>
                </div>

                {/* Filter Inputs */}
                {activeTab === 'search' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="relative md:col-span-1">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search definitions, equations, keywords..."
                                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">All Subjects</option>
                                {subjects.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={teacherFilter}
                                onChange={(e) => setTeacherFilter(e.target.value)}
                                placeholder="Filter by teacher..."
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                onClick={handleSearch}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                            >
                                Search
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Results Display */}
            {activeTab === 'search' ? (
                <div className="space-y-3">
                    {results.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <Search size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No matching lectures found</p>
                            <p className="text-xs text-slate-400 mt-0.5">Try a different keyword or reset filters.</p>
                        </div>
                    ) : (
                        results.map((r, i) => (
                            <div
                                key={i}
                                onClick={() => onSelectLecture(r.lecture_id)}
                                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 cursor-pointer shadow-sm transition-all group space-y-2.5"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span
                                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                                            style={{ backgroundColor: r.subject_color || '#6366f1' }}
                                        >
                                            {r.subject_name || 'General Knowledge'}
                                        </span>
                                        {r.teacher && (
                                            <span className="flex items-center space-x-1 text-xs text-slate-500">
                                                <User size={12} />
                                                <span>{r.teacher}</span>
                                            </span>
                                        )}
                                        {r.lecture_date && (
                                            <span className="flex items-center space-x-1 text-xs text-slate-400">
                                                <Calendar size={12} />
                                                <span>{r.lecture_date}</span>
                                            </span>
                                        )}
                                    </div>
                                    <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>

                                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {r.lecture_title}
                                </h3>

                                {r.note_summary && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                        {r.note_summary}
                                    </p>
                                )}

                                {r.transcription_snippet && (
                                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-[11px] text-slate-500 line-clamp-2">
                                        Matched snippet: {r.transcription_snippet}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* Cross-Lecture Connections */
                <div className="space-y-4">
                    {connections.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <GitFork size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No cross-lecture connections found yet</p>
                            <p className="text-xs text-slate-400 mt-0.5">As you capture multiple lectures in the same subject, Stellegent discovers conceptual links.</p>
                        </div>
                    ) : (
                        connections.map((conn, i) => (
                            <div
                                key={i}
                                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                                        <Sparkles size={14} />
                                        <span>Shared Concept: {conn.concept_name}</span>
                                    </div>
                                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                                        Suggested Connection
                                    </span>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                    {conn.explanation}
                                </p>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                                    <button
                                        onClick={() => onSelectLecture(conn.source_lecture_id)}
                                        className="font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 flex items-center space-x-1 truncate max-w-[45%]"
                                    >
                                        <BookOpen size={13} className="shrink-0 text-indigo-500" />
                                        <span className="truncate">{conn.source_lecture_title}</span>
                                    </button>

                                    <span className="text-slate-400 text-[11px] font-mono">⟷</span>

                                    <button
                                        onClick={() => onSelectLecture(conn.target_lecture_id)}
                                        className="font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 flex items-center space-x-1 truncate max-w-[45%]"
                                    >
                                        <BookOpen size={13} className="shrink-0 text-indigo-500" />
                                        <span className="truncate">{conn.target_lecture_title}</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
