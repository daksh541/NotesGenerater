import React, { useState } from 'react';
import {
    Layers,
    Mail,
    Lock,
    User,
    Building2,
    BookOpen,
    ArrowRight,
    CheckCircle2,
    KeyRound,
    ArrowLeft,
    ShieldCheck,
} from 'lucide-react';
import { SectionId, UserProfile } from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';

export type AuthMode = 'login' | 'signup' | 'forgot-password';

interface AuthViewProps {
    initialMode?: AuthMode;
    onAuthSuccess: (user: UserProfile) => void;
    onCancel?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
    initialMode = 'login',
    onAuthSuccess,
    onCancel,
}) => {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('alex.rivera@stanford.edu');
    const [password, setPassword] = useState('LectraPass123!');
    const [fullName, setFullName] = useState('Alex Rivera');
    const [university, setUniversity] = useState('Stanford University');
    const [course, setCourse] = useState('B.S. Computer Science & AI');
    const [semester, setSemester] = useState('Fall 2026');
    const [subject, setSubject] = useState('CS-244 • Distributed Systems & Cloud Computing');
    const [section, setSection] = useState<SectionId>('A');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetSent, setResetSent] = useState(false);

    const sectionsList: SectionId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (mode === 'forgot-password') {
            if (!email.trim()) {
                setError('Please enter your university email address.');
                return;
            }
            setLoading(true);
            try {
                if (resetSent && resetToken.trim() && newPassword.trim()) {
                    await lectraApi.resetPassword(resetToken.trim(), newPassword);
                    setResetSent(false);
                    setResetToken('');
                    setPassword(newPassword);
                    setMode('login');
                } else {
                    const res = await lectraApi.forgotPassword(email.trim());
                    if (res.reset_token) {
                        setResetToken(res.reset_token);
                    }
                    setResetSent(true);
                }
            } catch (err: any) {
                setError(err.response?.data?.detail || 'Password recovery failed.');
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        try {
            if (mode === 'login') {
                const res = await lectraApi.login(email, password);
                onAuthSuccess(res.user);
            } else if (mode === 'signup') {
                const res = await lectraApi.register({
                    email,
                    password,
                    full_name: fullName,
                    university,
                    course,
                    semester,
                    subject,
                    section,
                });
                onAuthSuccess(res.user);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[82vh] flex items-center justify-center py-8 animate-fade-in">
            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-slate-200/90 bg-white shadow-saas-lg overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                {/* Left Brand Panel */}
                <div className="lg:col-span-5 bg-[#0B132B] p-8 text-white flex flex-col justify-between">
                    <div>
                        <div className="flex items-center space-x-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                                <Layers size={18} />
                            </div>
                            <span className="font-display text-lg font-bold tracking-tight">LECTRA</span>
                        </div>

                        <h2 className="mt-8 font-display text-2xl font-bold leading-snug text-white">
                            One Classroom. Nine Sections. One Master Notebook.
                        </h2>
                        <p className="mt-3 text-xs leading-relaxed text-slate-300">
                            Synthesize classroom whiteboard derivations, handwritten notes, and official professor PDFs into source-verified academic Master Notes.
                        </p>
                    </div>

                    <div className="mt-8 space-y-3 border-t border-slate-800 pt-6 text-xs text-slate-300">
                        <div className="flex items-center space-x-2">
                            <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
                            <span>Cross-section harmonization across Sections A–I</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle2 size={15} className="text-indigo-400 shrink-0" />
                            <span>Grounded in official university syllabi & papers</span>
                        </div>
                    </div>
                </div>

                {/* Right Form Panel */}
                <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
                    {/* Mode Switch Tabs */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 dark:border-slate-800">
                        <div className="flex space-x-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('login');
                                    setError(null);
                                    setResetSent(false);
                                }}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                    mode === 'login'
                                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                                }`}
                            >
                                Log In
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('signup');
                                    setError(null);
                                    setResetSent(false);
                                }}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                    mode === 'signup'
                                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                                }`}
                            >
                                Sign Up
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('forgot-password');
                                    setError(null);
                                    setResetSent(false);
                                }}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                    mode === 'forgot-password'
                                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                                }`}
                            >
                                Forgot Password
                            </button>
                        </div>

                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            >
                                <ArrowLeft size={13} />
                                <span>Back</span>
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                            {error}
                        </div>
                    )}

                    {mode === 'forgot-password' && resetSent ? (
                        <form onSubmit={handleSubmit} className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 space-y-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                            <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 size={22} className="shrink-0" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Password Reset Token Dispatched
                                </h3>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                Enter the recovery token dispatched to <strong>{email}</strong> and your new password below.
                            </p>
                            <div>
                                <label htmlFor="authview-reset-token" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Recovery Token
                                </label>
                                <input
                                    id="authview-reset-token"
                                    type="text"
                                    required
                                    value={resetToken}
                                    onChange={(e) => setResetToken(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label htmlFor="authview-new-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    New Password
                                </label>
                                <input
                                    id="authview-new-password"
                                    type="password"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    aria-describedby="authview-new-password-rules"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                                <p id="authview-new-password-rules" className="mt-1 text-[11px] text-slate-500">
                                    Must be at least 8 characters long.
                                </p>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setResetSent(false);
                                        setMode('login');
                                    }}
                                    className="text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300"
                                >
                                    Return to Login
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0B132B] px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-600"
                                >
                                    <span>{loading ? 'Updating...' : 'Confirm Password Reset'}</span>
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                                    {mode === 'login' && 'Sign in to your LECTRA Workspace'}
                                    {mode === 'signup' && 'Create your Academic Account & Onboarding'}
                                    {mode === 'forgot-password' && 'Reset your Account Password'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {mode === 'login' &&
                                        'Access your section vault, studio uploads, and study kits.'}
                                    {mode === 'signup' &&
                                        'Complete onboarding with your university, course, semester, subject, and section (A–I).'}
                                    {mode === 'forgot-password' &&
                                        'Enter your registered university email to receive a password reset token.'}
                                </p>
                            </div>

                            {mode === 'signup' && (
                                <div>
                                    <label htmlFor="authview-fullname" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Student Full Name
                                    </label>
                                    <div className="relative">
                                        <User
                                            size={14}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        />
                                        <input
                                            id="authview-fullname"
                                            type="text"
                                            required
                                            autoComplete="name"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label htmlFor="authview-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    University Email
                                </label>
                                <div className="relative">
                                    <Mail
                                        size={14}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                        id="authview-email"
                                        type="email"
                                        required
                                        autoComplete="username"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@university.edu"
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                    />
                                </div>
                            </div>

                            {mode !== 'forgot-password' && (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label htmlFor="authview-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Password
                                        </label>
                                        {mode === 'login' && (
                                            <button
                                                type="button"
                                                onClick={() => setMode('forgot-password')}
                                                className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                                            >
                                                Forgot password?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Lock
                                            size={14}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        />
                                        <input
                                            id="authview-password"
                                            type="password"
                                            required
                                            minLength={8}
                                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                            aria-describedby={mode === 'signup' ? 'authview-password-rules' : undefined}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    {mode === 'signup' && (
                                        <p id="authview-password-rules" className="mt-1 text-[11px] text-slate-500">
                                            Must be at least 8 characters long and include a mix of letters and numbers.
                                        </p>
                                    )}
                                </div>
                            )}

                            {mode === 'signup' && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="authview-university" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            University
                                        </label>
                                        <div className="relative">
                                            <Building2
                                                size={13}
                                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                            />
                                            <input
                                                id="authview-university"
                                                type="text"
                                                value={university}
                                                onChange={(e) => setUniversity(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="authview-course" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Course / Major
                                        </label>
                                        <div className="relative">
                                            <BookOpen
                                                size={13}
                                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                            />
                                            <input
                                                id="authview-course"
                                                type="text"
                                                value={course}
                                                onChange={(e) => setCourse(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="authview-semester" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Semester
                                        </label>
                                        <input
                                            id="authview-semester"
                                            type="text"
                                            value={semester}
                                            onChange={(e) => setSemester(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-2.5 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="authview-subject" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Subject
                                        </label>
                                        <input
                                            id="authview-subject"
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-2.5 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="authview-section" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Classroom Section (A–I)
                                        </label>
                                        <select
                                            id="authview-section"
                                            value={section}
                                            onChange={(e) => setSection(e.target.value as SectionId)}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        >
                                            {sectionsList.map((s) => (
                                                <option key={s} value={s}>
                                                    Section {s}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 flex w-full items-center justify-center space-x-2 rounded-lg bg-[#0B132B] hover:bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 dark:bg-indigo-600"
                            >
                                {mode === 'forgot-password' ? <KeyRound size={14} /> : <ArrowRight size={14} />}
                                <span>
                                    {loading
                                        ? 'Processing...'
                                        : mode === 'login'
                                        ? 'Sign In to LECTRA'
                                        : mode === 'signup'
                                        ? 'Create Academic Account'
                                        : 'Send Recovery Link'}
                                </span>
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
