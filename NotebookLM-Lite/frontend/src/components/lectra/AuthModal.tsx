import React, { useEffect, useState } from 'react';
import {
    AcademicCatalog,
    SectionId,
    UserProfile,
} from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';
import {
    CheckCircle2,
    Eye,
    EyeOff,
    GraduationCap,
    KeyRound,
    Lock,
    Mail,
    ShieldCheck,
    Sparkles,
    UserCheck,
    X,
} from 'lucide-react';

export type AuthModalMode = 'login' | 'signup' | 'forgot' | 'reset' | 'verify' | 'onboarding';

interface AuthModalProps {
    isOpen: boolean;
    initialMode?: AuthModalMode;
    currentUser: UserProfile | null;
    onClose?: () => void;
    onAuthSuccess: (user: UserProfile, message: string) => void;
    requireAuth?: boolean;
}

const SECTIONS: SectionId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const SEMESTERS = ['Fall 2026', 'Spring 2027', 'Summer 2027', 'Fall 2027'];

export const AuthModal: React.FC<AuthModalProps> = ({
    isOpen,
    initialMode = 'login',
    currentUser,
    onClose,
    onAuthSuccess,
    requireAuth = false,
}) => {
    const [mode, setMode] = useState<AuthModalMode>(initialMode);
    const [catalog, setCatalog] = useState<AcademicCatalog | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Form fields
    const [email, setEmail] = useState(currentUser?.email || 'alex.rivera@stanford.edu');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState(currentUser?.full_name || '');
    const [universityId, setUniversityId] = useState(currentUser?.university_id || 'univ_stanford');
    const [universityName, setUniversityName] = useState(currentUser?.university || 'Stanford University');
    const [courseId, setCourseId] = useState(currentUser?.course_id || 'crs_cs_bs');
    const [courseName, setCourseName] = useState(currentUser?.course || 'B.S. Computer Science & AI');
    const [semester, setSemester] = useState(currentUser?.semester || 'Fall 2026');
    const [subjectId, setSubjectId] = useState(currentUser?.subject_id || 'subj_cs244');
    const [subjectName, setSubjectName] = useState(
        currentUser?.subject || 'Distributed Systems & Cloud Computing'
    );
    const [section, setSection] = useState<SectionId>(currentUser?.section || 'A');

    // Tokens for verification / reset
    const [verificationToken, setVerificationToken] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        setMode(initialMode);
        setError(null);
        setInfoMessage(null);
    }, [initialMode, isOpen]);

    useEffect(() => {
        if (currentUser) {
            setFullName(currentUser.full_name || '');
            setEmail(currentUser.email || '');
            setUniversityId(currentUser.university_id || 'univ_stanford');
            setUniversityName(currentUser.university || 'Stanford University');
            setCourseId(currentUser.course_id || 'crs_cs_bs');
            setCourseName(currentUser.course || 'B.S. Computer Science & AI');
            setSemester(currentUser.semester || 'Fall 2026');
            setSubjectId(currentUser.subject_id || 'subj_cs244');
            setSubjectName(currentUser.subject || 'Distributed Systems & Cloud Computing');
            setSection(currentUser.section || 'A');
        }
    }, [currentUser]);

    useEffect(() => {
        if (!isOpen) return;
        lectraApi
            .getCatalog()
            .then((cat) => setCatalog(cat))
            .catch(() => {
                // Fallback catalog already handled by defaults
            });
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await lectraApi.login(email.trim(), password);
            if (!res.user.onboarding_completed) {
                setFullName(res.user.full_name);
                setSection(res.user.section);
                setMode('onboarding');
                setInfoMessage('Welcome! Please confirm your academic onboarding details.');
            } else {
                onAuthSuccess(res.user, 'Signed in to LECTRA successfully.');
            }
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoStudentSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await lectraApi.login('alex.rivera@stanford.edu', 'LectraPass2026!');
            onAuthSuccess(res.user, 'Signed in as Alex Rivera (Section A).');
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Could not sign in with default student account.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await lectraApi.register({
                email: email.trim(),
                password,
                full_name: fullName.trim() || 'Student Scholar',
                university_id: universityId,
                university: universityName,
                course_id: courseId,
                course: courseName,
                subject_id: subjectId,
                subject: subjectName,
                semester,
                section,
                onboarding_completed: false,
            });
            if (res.verification_token) {
                setVerificationToken(res.verification_token);
            }
            setMode('onboarding');
            setInfoMessage(
                'Account created! Complete your 1-step Academic Onboarding (or verify your email token) to personalize your workspace.'
            );
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Could not create account. Check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteOnboarding = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (verificationToken) {
                try {
                    await lectraApi.verifyEmail(verificationToken);
                } catch {
                    // non-blocking if already verified
                }
            }
            const res = await lectraApi.completeOnboarding({
                full_name: fullName.trim() || 'Student Scholar',
                university_id: universityId,
                university: universityName,
                course_id: courseId,
                course: courseName,
                semester,
                subject_id: subjectId,
                subject: subjectName,
                section,
            });
            onAuthSuccess(
                res.user,
                `Onboarding complete! Welcome to Section ${res.user.section}, ${res.user.full_name}.`
            );
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Failed to save onboarding profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await lectraApi.forgotPassword(email.trim());
            setResetToken(res.reset_token);
            setMode('reset');
            setInfoMessage('Password reset token generated. Enter your new password below.');
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'No account found with that email address.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await lectraApi.resetPassword(resetToken.trim(), newPassword);
            onAuthSuccess(res.user, 'Password reset successful! You are now signed in.');
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Invalid or expired password reset token.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await lectraApi.verifyEmail(verificationToken.trim());
            onAuthSuccess(res.user, 'Email address verified successfully!');
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Invalid or expired verification token.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await lectraApi.resendVerification(email.trim());
            setVerificationToken(res.verification_token);
            setInfoMessage('New verification token dispatched and auto-filled below.');
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Could not resend verification email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lectra-auth-title"
        >
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8">
                {/* Top Header */}
                <div className="bg-[#0B132B] text-white px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 id="lectra-auth-title" className="text-base font-bold tracking-tight">
                                {mode === 'login' && 'Sign In to LECTRA'}
                                {mode === 'signup' && 'Create Student Account'}
                                {mode === 'onboarding' && 'Student Academic Onboarding'}
                                {mode === 'forgot' && 'Reset Your Password'}
                                {mode === 'reset' && 'Set New Password'}
                                {mode === 'verify' && 'Verify University Email'}
                            </h2>
                            <p className="text-xs text-slate-300">
                                Supabase Auth • Row-Level Security • Nine-Section Academic Vault
                            </p>
                        </div>
                    </div>
                    {!requireAuth && onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close authentication modal"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Mode Switcher Tabs */}
                <div className="px-6 pt-4 border-b border-slate-100 flex items-center gap-2 text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('login');
                            setError(null);
                        }}
                        className={`pb-2.5 px-2 border-b-2 transition-colors ${
                            mode === 'login'
                                ? 'border-[#0B132B] text-[#0B132B]'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode('signup');
                            setError(null);
                        }}
                        className={`pb-2.5 px-2 border-b-2 transition-colors ${
                            mode === 'signup'
                                ? 'border-[#0B132B] text-[#0B132B]'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Sign Up
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode('onboarding');
                            setError(null);
                        }}
                        className={`pb-2.5 px-2 border-b-2 transition-colors ${
                            mode === 'onboarding'
                                ? 'border-[#0B132B] text-[#0B132B]'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Onboarding (A–I)
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode('verify');
                            setError(null);
                        }}
                        className={`pb-2.5 px-2 border-b-2 transition-colors ${
                            mode === 'verify'
                                ? 'border-[#0B132B] text-[#0B132B]'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Verify Email
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div
                            role="alert"
                            className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700"
                        >
                            {error}
                        </div>
                    )}

                    {infoMessage && (
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-medium text-blue-800 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>{infoMessage}</span>
                        </div>
                    )}

                    {/* 1. SIGN IN FORM */}
                    {mode === 'login' && (
                        <form onSubmit={handleSignIn} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="signin-email"
                                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                                >
                                    University Email
                                </label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                    <input
                                        id="signin-email"
                                        name="email"
                                        type="email"
                                        autoComplete="username"
                                        spellCheck={false}
                                        autoCapitalize="none"
                                        enterKeyHint="next"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="student@stanford.edu"
                                        className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label
                                        htmlFor="signin-password"
                                        className="block text-xs font-semibold text-slate-700"
                                    >
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setMode('forgot')}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                    <input
                                        id="signin-password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        spellCheck={false}
                                        enterKeyHint="done"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                                    />
                                    <button
                                        type="button"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        aria-pressed={showPassword}
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-[#0B132B] hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <progress aria-label="Signing in" className="loading-spinner" />
                                ) : (
                                    <ShieldCheck className="w-4 h-4" />
                                )}
                                Sign In with Supabase Auth
                            </button>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={handleDemoStudentSignIn}
                                    disabled={loading}
                                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
                                >
                                    Quick Sign-In: Alex Rivera (Section A Default Student)
                                </button>
                            </div>
                        </form>
                    )}

                    {/* 2. SIGN UP FORM */}
                    {mode === 'signup' && (
                        <form onSubmit={handleSignUp} className="space-y-3.5">
                            <div>
                                <label
                                    htmlFor="signup-name"
                                    className="block text-xs font-semibold text-slate-700 mb-1"
                                >
                                    Student Full Name
                                </label>
                                <input
                                    id="signup-name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    enterKeyHint="next"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g., Maya Lin"
                                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="signup-email"
                                    className="block text-xs font-semibold text-slate-700 mb-1"
                                >
                                    University Email
                                </label>
                                <input
                                    id="signup-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    spellCheck={false}
                                    autoCapitalize="none"
                                    enterKeyHint="next"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="maya.lin@stanford.edu"
                                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="signup-password"
                                    className="block text-xs font-semibold text-slate-700 mb-1"
                                >
                                    Create Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="signup-password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        spellCheck={false}
                                        minLength={6}
                                        aria-describedby="password-rules"
                                        enterKeyHint="done"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="w-full px-3.5 pr-10 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                                    />
                                    <button
                                        type="button"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        aria-pressed={showPassword}
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                <p id="password-rules" className="text-[11px] text-slate-500 mt-1">
                                    Minimum 6 characters; hashed with PBKDF2-HMAC-SHA256 (120,000 iterations).
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-[#0B132B] hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <progress aria-label="Creating account" className="loading-spinner" />
                                ) : (
                                    <UserCheck className="w-4 h-4" />
                                )}
                                Create Account & Continue to Onboarding
                            </button>
                        </form>
                    )}

                    {/* 3. USER ONBOARDING WIZARD (Student Name, University, Course, Semester, Subject, Section A-I) */}
                    {mode === 'onboarding' && (
                        <form onSubmit={handleCompleteOnboarding} className="space-y-3.5">
                            <div>
                                <label
                                    htmlFor="onboard-name"
                                    className="block text-xs font-semibold text-slate-700 mb-1"
                                >
                                    1. Student Name
                                </label>
                                <input
                                    id="onboard-name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label
                                        htmlFor="onboard-university"
                                        className="block text-xs font-semibold text-slate-700 mb-1"
                                    >
                                        2. University
                                    </label>
                                    <select
                                        id="onboard-university"
                                        value={universityId}
                                        onChange={(e) => {
                                            const uid = e.target.value;
                                            setUniversityId(uid);
                                            const found = catalog?.universities.find((u) => u.id === uid);
                                            if (found) setUniversityName(found.name);
                                        }}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-blue-600"
                                    >
                                        {(catalog?.universities || [
                                            { id: 'univ_stanford', name: 'Stanford University' },
                                            { id: 'univ_mit', name: 'Massachusetts Institute of Technology' },
                                            { id: 'univ_berkeley', name: 'UC Berkeley' },
                                        ]).map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="onboard-course"
                                        className="block text-xs font-semibold text-slate-700 mb-1"
                                    >
                                        3. Course / Degree Program
                                    </label>
                                    <select
                                        id="onboard-course"
                                        value={courseId}
                                        onChange={(e) => {
                                            const cid = e.target.value;
                                            setCourseId(cid);
                                            const found = catalog?.courses.find((c) => c.id === cid);
                                            if (found) setCourseName(found.course_name);
                                        }}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-blue-600"
                                    >
                                        {(catalog?.courses || [
                                            { id: 'crs_cs_bs', course_name: 'B.S. Computer Science & AI' },
                                            { id: 'crs_cs_ms', course_name: 'M.S. Computer Science (Systems & ML)' },
                                            { id: 'crs_ee_bs', course_name: 'B.S. Electrical & Computer Engineering' },
                                        ]).map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.course_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label
                                        htmlFor="onboard-semester"
                                        className="block text-xs font-semibold text-slate-700 mb-1"
                                    >
                                        4. Semester
                                    </label>
                                    <select
                                        id="onboard-semester"
                                        value={semester}
                                        onChange={(e) => setSemester(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-blue-600"
                                    >
                                        {SEMESTERS.map((sem) => (
                                            <option key={sem} value={sem}>
                                                {sem}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="onboard-subject"
                                        className="block text-xs font-semibold text-slate-700 mb-1"
                                    >
                                        5. Primary Subject
                                    </label>
                                    <select
                                        id="onboard-subject"
                                        value={subjectId}
                                        onChange={(e) => {
                                            const sid = e.target.value;
                                            setSubjectId(sid);
                                            const found = catalog?.subjects.find((s) => s.id === sid);
                                            if (found) setSubjectName(found.name);
                                        }}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-blue-600"
                                    >
                                        {(catalog?.subjects || [
                                            {
                                                id: 'subj_cs244',
                                                code: 'CS-244',
                                                name: 'Distributed Systems & Cloud Computing',
                                            },
                                            {
                                                id: 'subj_cs224n',
                                                code: 'CS-224N',
                                                name: 'Deep Neural Architectures & Attention',
                                            },
                                            {
                                                id: 'subj_cs161',
                                                code: 'CS-161',
                                                name: 'Advanced Algorithms & Optimization',
                                            },
                                        ]).map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.code} — {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    6. Classroom Section (Sections A–I)
                                </span>
                                <div className="grid grid-cols-9 gap-1.5">
                                    {SECTIONS.map((sec) => (
                                        <button
                                            key={sec}
                                            type="button"
                                            onClick={() => setSection(sec)}
                                            className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                                                section === sec
                                                    ? 'bg-[#0B132B] text-white border-[#0B132B] shadow-xs'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {sec}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <progress aria-label="Saving onboarding" className="loading-spinner" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                Complete Onboarding & Initialize Workspace
                            </button>
                        </form>
                    )}

                    {/* 4. FORGOT PASSWORD FORM */}
                    {mode === 'forgot' && (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="forgot-email"
                                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                                >
                                    Account Email Address
                                </label>
                                <input
                                    id="forgot-email"
                                    type="email"
                                    autoComplete="email"
                                    spellCheck={false}
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-[#0B132B] hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <KeyRound className="w-4 h-4" />
                                Generate Password Reset Token
                            </button>
                        </form>
                    )}

                    {/* 5. PASSWORD RESET FORM */}
                    {mode === 'reset' && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="reset-token"
                                    className="block text-xs font-semibold text-slate-700 mb-1"
                                >
                                    Reset Token
                                </label>
                                <input
                                    id="reset-token"
                                    type="text"
                                    spellCheck={false}
                                    required
                                    value={resetToken}
                                    onChange={(e) => setResetToken(e.target.value)}
                                    className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="reset-new-password"
                                    className="block text-xs font-semibold text-slate-700 mb-1"
                                >
                                    New Password
                                </label>
                                <input
                                    id="reset-new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    minLength={6}
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                            >
                                Confirm Password Reset
                            </button>
                        </form>
                    )}

                    {/* 6. EMAIL VERIFICATION FORM */}
                    {mode === 'verify' && (
                        <form onSubmit={handleVerifyEmail} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="verify-token-input"
                                    className="block text-xs font-semibold text-slate-700 mb-1"
                                >
                                    Email Verification Token
                                </label>
                                <input
                                    id="verify-token-input"
                                    type="text"
                                    spellCheck={false}
                                    required
                                    value={verificationToken}
                                    onChange={(e) => setVerificationToken(e.target.value)}
                                    placeholder="verify_..."
                                    className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors"
                                >
                                    Verify Email Token
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={loading}
                                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                                >
                                    Send New Token
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
