import React, { useState } from 'react';
import { User, Lock, Mail, Sparkles, X, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { stellegentApi } from '../../services/stellegentApi';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<'student' | 'researcher' | 'educator'>('student');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (mode === 'register') {
                const res = await stellegentApi.register({
                    email,
                    password,
                    full_name: fullName,
                    role,
                });
                onAuthSuccess(res);
            } else {
                const res = await stellegentApi.login({
                    email,
                    password,
                });
                onAuthSuccess(res);
            }
            onClose();
        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err?.response?.data?.detail || 'Authentication failed. Please check credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Register or login demo account
            let res;
            try {
                res = await stellegentApi.login({ email: 'demo@stellegent.ai', password: 'stellegent123' });
            } catch {
                res = await stellegentApi.register({
                    email: 'demo@stellegent.ai',
                    password: 'stellegent123',
                    full_name: 'Stellegent Scholar',
                    role: 'student',
                });
            }
            onAuthSuccess(res);
            onClose();
        } catch (err: any) {
            console.error('Demo login error:', err);
            setError('Demo login failed. You can sign up with any email.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {mode === 'login' ? 'Sign in to Stellegent' : 'Create an Account'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Turn everyday knowledge into intelligence</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 text-xs font-semibold">
                    <button
                        onClick={() => setMode('login')}
                        className={`flex-1 py-3 text-center border-b-2 transition-all ${mode === 'login' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => setMode('register')}
                        className={`flex-1 py-3 text-center border-b-2 transition-all ${mode === 'register' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Register
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                            {error}
                        </div>
                    )}

                    {mode === 'register' && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g. Alex Rivera"
                                required
                                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@university.edu"
                            required
                            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {mode === 'register' && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Role</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['student', 'researcher', 'educator'] as const).map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRole(r)}
                                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize border transition-all ${role === r ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all mt-2"
                    >
                        {isLoading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>

                    {/* Quick Demo Access Button */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                        <button
                            type="button"
                            onClick={handleDemoLogin}
                            disabled={isLoading}
                            className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center space-x-1.5 transition-colors"
                        >
                            <Sparkles size={14} className="text-amber-500" />
                            <span>One-Click Instant Demo Login</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
