import React, { useState } from 'react';
import {
    Settings,
    Save,
    Check,
    Sun,
    Moon,
    Bell,
    Shield,
    KeyRound,
    MailCheck,
    GraduationCap,
    LogOut,
} from 'lucide-react';
import { SectionId, UserProfile } from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';
import { AuthModalMode } from './AuthModal';

interface SettingsViewProps {
    userProfile: UserProfile;
    onUpdateProfile: (updated: UserProfile) => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    onOpenAuthModal?: (mode: AuthModalMode) => void;
    onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
    userProfile,
    onUpdateProfile,
    theme,
    onToggleTheme,
    onOpenAuthModal,
    onLogout,
}) => {
    const [fullName, setFullName] = useState(userProfile.full_name);
    const [university, setUniversity] = useState(userProfile.university);
    const [course, setCourse] = useState(userProfile.course);
    const [semester, setSemester] = useState(userProfile.semester || 'Fall 2026');
    const [subject, setSubject] = useState(
        userProfile.subject || 'CS-244 • Distributed Systems & Cloud Computing'
    );
    const [section, setSection] = useState<SectionId>(userProfile.section);
    const [bio, setBio] = useState(userProfile.bio || '');

    const [notifyVaultShares, setNotifyVaultShares] = useState(true);
    const [notifyPeerReviews, setNotifyPeerReviews] = useState(true);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const sectionsList: SectionId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError(null);
        try {
            const res = await lectraApi.updateProfile({
                full_name: fullName,
                university,
                course,
                semester,
                subject,
                section,
                bio,
            });
            onUpdateProfile(res.user);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (err: any) {
            setSaveError(err.response?.data?.detail || 'Failed to update academic profile.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 pb-16 max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="border-b border-slate-200/80 pb-5 dark:border-slate-800">
                <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <Settings size={15} />
                    <span>Workspace & Account Preferences</span>
                </div>
                <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                    Settings
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                    Configure your academic profile, classroom section assignment, appearance theme, and AI provider credentials.
                </p>
            </div>

            {saveSuccess && (
                <div className="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <Check size={15} className="text-emerald-600" />
                    <span>Workspace settings and academic profile updated in database.</span>
                </div>
            )}

            {saveError && (
                <div
                    role="alert"
                    className="flex items-center space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                >
                    <span>{saveError}</span>
                </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Appearance & Notifications */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Interface & Notifications
                    </h2>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                                Interface Theme
                            </div>
                            <div className="text-[11px] text-slate-500">
                                Switch between crisp light mode and deep navy dark mode
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onToggleTheme}
                            className="inline-flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                        >
                            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                            <span>{theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                            <Bell size={15} className="text-indigo-600" />
                            <div>
                                <label
                                    htmlFor="settings-notify-vault"
                                    className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                                >
                                    Section Vault & Peer Review Alerts
                                </label>
                                <div className="text-[11px] text-slate-500">
                                    Receive alerts when new Master Notes are verified in Section {section}
                                </div>
                            </div>
                        </div>
                        <input
                            id="settings-notify-vault"
                            type="checkbox"
                            checked={notifyVaultShares && notifyPeerReviews}
                            onChange={(e) => {
                                setNotifyVaultShares(e.target.checked);
                                setNotifyPeerReviews(e.target.checked);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Academic Profile (All 6 Onboarding Fields) */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Academic Identity & Classroom Section
                    </h2>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="settings-full-name"
                                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                            >
                                Student Full Name
                            </label>
                            <input
                                id="settings-full-name"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="settings-email"
                                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                            >
                                University Email
                            </label>
                            <input
                                id="settings-email"
                                type="email"
                                value={userProfile.email}
                                disabled
                                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 cursor-not-allowed dark:border-slate-800 dark:bg-slate-800/50"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="settings-university"
                                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                            >
                                College / University
                            </label>
                            <input
                                id="settings-university"
                                type="text"
                                value={university}
                                onChange={(e) => setUniversity(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="settings-course"
                                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                            >
                                Course / Program
                            </label>
                            <input
                                id="settings-course"
                                type="text"
                                value={course}
                                onChange={(e) => setCourse(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="settings-semester"
                                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                            >
                                Academic Semester
                            </label>
                            <input
                                id="settings-semester"
                                type="text"
                                value={semester}
                                onChange={(e) => setSemester(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="settings-subject"
                                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                            >
                                Primary Subject
                            </label>
                            <input
                                id="settings-subject"
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="settings-section"
                                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                            >
                                Enrolled Section (A through I)
                            </label>
                            <select
                                id="settings-section"
                                value={section}
                                onChange={(e) => setSection(e.target.value as SectionId)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                                {sectionsList.map((sec) => (
                                    <option key={sec} value={sec}>
                                        Section {sec}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label
                                htmlFor="settings-bio"
                                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                            >
                                Academic Bio
                            </label>
                            <textarea
                                id="settings-bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs font-medium focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Account Security & Supabase Row Level Security Status */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Shield size={15} className="text-indigo-600" />
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Account Security & Row Level Security (RLS)
                            </h2>
                        </div>
                        <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <Check size={11} />
                            <span>RLS Enforced</span>
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">
                        All synthesis engine and storage credentials are managed strictly server-side. Private workspaces and uploads are isolated to your authenticated user ID (`{userProfile.id}`).
                    </p>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        {onOpenAuthModal && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => onOpenAuthModal('onboarding')}
                                    className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                    <GraduationCap size={13} className="text-indigo-600" />
                                    <span>Onboarding Wizard</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onOpenAuthModal('verify')}
                                    className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                    <MailCheck size={13} className="text-emerald-600" />
                                    <span>
                                        {userProfile.email_verified ? 'Email Verified' : 'Verify Email'}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onOpenAuthModal('forgot')}
                                    className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                    <KeyRound size={13} className="text-amber-600" />
                                    <span>Reset Password</span>
                                </button>
                            </>
                        )}
                        {onLogout && (
                            <button
                                type="button"
                                onClick={onLogout}
                                className="inline-flex items-center space-x-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
                            >
                                <LogOut size={13} />
                                <span>Sign Out</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center space-x-2 rounded-lg bg-[#0B132B] hover:bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 dark:bg-indigo-600"
                    >
                        <Save size={14} />
                        <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};
