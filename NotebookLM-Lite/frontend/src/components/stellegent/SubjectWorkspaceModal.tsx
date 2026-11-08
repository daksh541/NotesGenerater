import React, { useState } from 'react';
import { Subject } from '../../types/stellegent';
import { stellegentApi } from '../../services/stellegentApi';
import { BookOpen, X, Plus } from 'lucide-react';

interface SubjectWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubjectCreated: (subject: Subject) => void;
}

const PRESET_COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
];

export const SubjectWorkspaceModal: React.FC<SubjectWorkspaceModalProps> = ({
    isOpen,
    onClose,
    onSubjectCreated,
}) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [teacher, setTeacher] = useState('');
    const [semester, setSemester] = useState('Fall 2026');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(PRESET_COLORS[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please provide a subject or course name.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const newSubj = await stellegentApi.createSubject({
                name: name.trim(),
                code: code.trim() || undefined,
                teacher: teacher.trim() || undefined,
                semester: semester.trim() || undefined,
                description: description.trim() || undefined,
                color,
            });
            onSubjectCreated(newSubj);
            onClose();
        } catch (err: any) {
            console.error('Create subject error:', err);
            setError(err?.response?.data?.detail || 'Failed to create subject.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: color }}
                        >
                            <BookOpen size={16} />
                        </div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Create Subject / Course</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Subject Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Linear Algebra & Optimization"
                            required
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Course Code</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="e.g. MATH 240"
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Semester</label>
                            <input
                                type="text"
                                value={semester}
                                onChange={(e) => setSemester(e.target.value)}
                                placeholder="e.g. Fall 2026"
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Instructor / Teacher</label>
                        <input
                            type="text"
                            value={teacher}
                            onChange={(e) => setTeacher(e.target.value)}
                            placeholder="e.g. Prof. Strang"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-1.5">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Color Tag</label>
                        <div className="flex items-center space-x-2">
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm"
                        >
                            {isLoading ? 'Creating...' : 'Create Subject'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
