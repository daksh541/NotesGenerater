import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Sparkles, BookOpen, Layers, ShieldCheck } from 'lucide-react';
import { ProcessingJob, ProcessingStatus } from '../../../types/stellegent';
import { stellegentApi } from '../../../services/stellegentApi';

interface ProcessingStatusScreenProps {
    isOpen: boolean;
    lectureId: string;
    onCompleted: (lectureId: string) => void;
    onCancel: () => void;
}

export const ProcessingStatusScreen: React.FC<ProcessingStatusScreenProps> = ({
    isOpen,
    lectureId,
    onCompleted,
    onCancel
}) => {
    const [job, setJob] = useState<ProcessingJob | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !lectureId) return;

        let isMounted = true;
        let pollTimer: NodeJS.Timeout;

        const checkStatus = async () => {
            try {
                const data = await stellegentApi.getLectureStatus(lectureId);
                if (!isMounted) return;
                setJob(data);

                if (data.stage === ProcessingStatus.COMPLETED) {
                    setTimeout(() => {
                        if (isMounted) onCompleted(lectureId);
                    }, 800);
                    return;
                }

                if (data.stage === ProcessingStatus.FAILED) {
                    setError(data.error_message || 'Processing failed. You can retry with a tap.');
                    return;
                }

                // Continue polling every 1.5 seconds while pending/in-progress
                pollTimer = setTimeout(checkStatus, 1500);
            } catch (err: any) {
                if (!isMounted) return;
                console.error('Status polling error:', err);
                // Keep polling with slight backoff unless cancelled
                pollTimer = setTimeout(checkStatus, 2500);
            }
        };

        checkStatus();

        return () => {
            isMounted = false;
            clearTimeout(pollTimer);
        };
    }, [isOpen, lectureId]);

    const handleRetry = async () => {
        setIsRetrying(true);
        setError(null);
        try {
            await stellegentApi.retryLecture(lectureId);
            // Re-trigger polling
            const fresh = await stellegentApi.getLectureStatus(lectureId);
            setJob(fresh);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Failed to restart processing. Check connection.');
        } finally {
            setIsRetrying(false);
        }
    };

    const handleRetryOffline = async () => {
        setIsRetrying(true);
        setError(null);
        try {
            await stellegentApi.retryLecture(lectureId, true);
            const fresh = await stellegentApi.getLectureStatus(lectureId);
            setJob(fresh);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Failed to start offline processing.');
        } finally {
            setIsRetrying(false);
        }
    };


    if (!isOpen) return null;

    const stages = [
        {
            key: 'preprocessing',
            label: 'Image & Contrast Enhancement',
            desc: 'Auto-correcting EXIF orientation and marker lines',
            icon: Sparkles,
            isComplete: (job?.progress ?? 0) >= 20 || job?.stage === ProcessingStatus.COMPLETED,
            isCurrent: job?.stage === ProcessingStatus.PREPROCESSING || job?.stage === ProcessingStatus.PENDING
        },
        {
            key: 'extracting',
            label: 'Multimodal Vision & OCR',
            desc: 'Extracting handwritten terms, equations, and diagrams',
            icon: ShieldCheck,
            isComplete: (job?.progress ?? 0) >= 45 || job?.stage === ProcessingStatus.COMPLETED,
            isCurrent: job?.stage === ProcessingStatus.EXTRACTING
        },
        {
            key: 'notes',
            label: 'Structured Notes Synthesis',
            desc: 'Formatting executive summary, topics, and definitions',
            icon: BookOpen,
            isComplete: (job?.progress ?? 0) >= 70 || job?.stage === ProcessingStatus.COMPLETED,
            isCurrent: job?.stage === ProcessingStatus.GENERATING_NOTES
        },
        {
            key: 'diagrams',
            label: 'Mermaid Diagram Generation',
            desc: 'Creating interactive flowcharts and concept maps',
            icon: Layers,
            isComplete: (job?.progress ?? 0) >= 90 || job?.stage === ProcessingStatus.COMPLETED,
            isCurrent: job?.stage === ProcessingStatus.GENERATING_DIAGRAMS
        }
    ];

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 safe-top safe-bottom select-none animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-6 overflow-hidden">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md">
                        {job?.stage === ProcessingStatus.COMPLETED ? (
                            <CheckCircle2 size={32} className="text-emerald-500 animate-bounce" />
                        ) : job?.stage === ProcessingStatus.FAILED ? (
                            <AlertCircle size={32} className="text-rose-500" />
                        ) : (
                            <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                        )}
                    </div>

                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {job?.stage === ProcessingStatus.COMPLETED
                            ? 'Processing Complete!'
                            : job?.stage === ProcessingStatus.FAILED
                            ? 'Processing Interrupted'
                            : 'AI Synthesizing Lecture'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {job?.stage === ProcessingStatus.COMPLETED
                            ? 'Your notes, diagrams, and flashcards are ready.'
                            : job?.stage === ProcessingStatus.FAILED
                            ? error || 'An error occurred during vision analysis.'
                            : 'Transforming whiteboard captures into structured knowledge...'}
                    </p>
                </div>

                {/* Overall Progress Bar */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <span>Pipeline Progress</span>
                        <span>{job?.progress ?? 10}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 rounded-full"
                            style={{ width: `${Math.max(8, job?.progress ?? 10)}%` }}
                        />
                    </div>
                </div>

                {/* Pipeline Stage Cards */}
                <div className="space-y-3">
                    {stages.map((stg) => {
                        const Icon = stg.icon;
                        return (
                            <div
                                key={stg.key}
                                className={`flex items-start space-x-3 p-3 rounded-2xl border transition-all ${
                                    stg.isComplete
                                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-slate-200'
                                        : stg.isCurrent
                                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-white'
                                        : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 text-slate-400'
                                }`}
                            >
                                <div
                                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                        stg.isComplete
                                            ? 'bg-emerald-500 text-white'
                                            : stg.isCurrent
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                    }`}
                                >
                                    {stg.isComplete ? (
                                        <CheckCircle2 size={16} />
                                    ) : stg.isCurrent ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Icon size={15} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold truncate">{stg.label}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                        {stg.desc}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Action Controls */}
                <div className="pt-2">
                    {job?.stage === ProcessingStatus.FAILED ? (
                        <div className="space-y-2 w-full">
                            <button
                                onClick={handleRetryOffline}
                                disabled={isRetrying}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98]"
                            >
                                <Sparkles size={15} />
                                <span>⚡ Process with Fast Local Pipeline (Zero Credits)</span>
                            </button>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleRetry}
                                    disabled={isRetrying}
                                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-sm"
                                >
                                    {isRetrying ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <>
                                            <RefreshCw size={14} />
                                            <span>Retry Cloud API</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : job?.stage === ProcessingStatus.COMPLETED ? (

                        <button
                            onClick={() => onCompleted(lectureId)}
                            className="w-full py-3 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/30"
                        >
                            <span>Open Notes & Diagrams</span>
                            <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={onCancel}
                            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                            Keep processing in background
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
