import React, { useState, useEffect } from 'react';
import { TimelineItem } from '../../types/stellegent';
import { stellegentApi } from '../../services/stellegentApi';
import { Calendar, Clock, BookOpen, ArrowRight, GitFork, User, Sparkles } from 'lucide-react';

interface KnowledgeTimelineViewProps {
    onSelectLecture: (lectureId: string) => void;
}

export const KnowledgeTimelineView: React.FC<KnowledgeTimelineViewProps> = ({ onSelectLecture }) => {
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTimeline();
    }, []);

    const loadTimeline = async () => {
        try {
            const data = await stellegentApi.getTimeline();
            setTimeline(data);
        } catch (err) {
            console.error('Failed to load timeline:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="p-12 text-center text-xs text-slate-400">Loading chronological timeline...</div>;
    }

    if (timeline.length === 0) {
        return (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Clock size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Your Knowledge Timeline is empty</p>
                <p className="text-xs text-slate-400 mt-1">Capture your first whiteboard lecture to start tracking chronological study progression.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Knowledge Timeline</h2>
                    <p className="text-xs text-slate-500">Chronological learning sequence across semesters and subjects</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    {timeline.length} Recorded Sessions
                </span>
            </div>

            {/* Vertical Timeline */}
            <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {timeline.map((item, idx) => (
                    <div key={idx} className="relative group">
                        {/* Timeline Bullet */}
                        <div
                            className="absolute -left-6 top-1.5 w-6 h-6 rounded-full border-4 border-white dark:border-slate-950 flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: item.subject_color || '#6366f1' }}
                        />

                        {/* Card */}
                        <div
                            onClick={() => onSelectLecture(item.lecture_id)}
                            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 cursor-pointer shadow-sm transition-all space-y-3 group-hover:shadow-md"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center space-x-2">
                                    <span
                                        className="text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full"
                                        style={{ backgroundColor: item.subject_color || '#6366f1' }}
                                    >
                                        {item.subject_name}
                                    </span>
                                    {item.semester && (
                                        <span className="text-xs text-slate-400">({item.semester})</span>
                                    )}
                                </div>

                                <div className="flex items-center space-x-3 text-xs text-slate-400">
                                    {item.lecture_date && (
                                        <span className="flex items-center space-x-1">
                                            <Calendar size={12} />
                                            <span>{item.lecture_date}</span>
                                        </span>
                                    )}
                                    {item.teacher && (
                                        <span className="flex items-center space-x-1">
                                            <User size={12} />
                                            <span>{item.teacher}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {item.title}
                                </h3>
                                <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                            </div>

                            {item.summary && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                    {item.summary}
                                </p>
                            )}

                            {/* Takeaways snippet */}
                            {item.takeaways && item.takeaways.length > 0 && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                    <Sparkles size={12} />
                                    <span className="truncate">Key Takeaway: {item.takeaways[0]}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
