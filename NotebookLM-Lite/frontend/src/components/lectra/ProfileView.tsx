import React from 'react';
import {
    User,
    GraduationCap,
    FileText,
    ShieldCheck,
    Award,
    Settings,
    Mail,
    Layers,
    BookOpen,
    ThumbsUp,
    Calendar,
    ArrowRight,
} from 'lucide-react';
import {
    DashboardMetrics,
    MasterNoteContent,
    SectionVaultNote,
    SubjectModel,
    UserProfile,
} from '../../types/lectra';
import { LectraTab } from './LectraSidebar';

interface ProfileViewProps {
    userProfile: UserProfile;
    metrics: DashboardMetrics;
    subjects: SubjectModel[];
    recentNotes: MasterNoteContent[];
    vaultNotes: SectionVaultNote[];
    onNavigateTab: (tab: LectraTab) => void;
    onViewNote: (note: MasterNoteContent) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
    userProfile,
    metrics,
    subjects,
    recentNotes,
    vaultNotes,
    onNavigateTab,
    onViewNote,
}) => {
    const userVaultContributions = vaultNotes.filter(
        (v) => v.contributor_name === userProfile.full_name || v.section === userProfile.section
    );

    return (
        <div className="space-y-6 pb-16 max-w-5xl mx-auto animate-fade-in">
            {/* Profile Hero Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-saas dark:border-slate-800 dark:bg-slate-900">
                <div className="h-28 bg-[#0B132B] px-6 flex items-end pb-4 justify-end">
                    <span className="rounded-md bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-1 text-[11px] font-semibold text-indigo-200">
                        Verified Academic Contributor • Section {userProfile.section}
                    </span>
                </div>

                <div className="px-6 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-10 gap-4">
                        <div className="flex items-end space-x-4">
                            {userProfile.avatar_url ? (
                                <img
                                    src={userProfile.avatar_url}
                                    alt={userProfile.full_name}
                                    className="h-20 w-20 rounded-xl border-4 border-white object-cover shadow-md dark:border-slate-900"
                                />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-xl border-4 border-white bg-indigo-600 text-2xl font-bold text-white shadow-md dark:border-slate-900">
                                    {userProfile.full_name.charAt(0)}
                                </div>
                            )}
                            <div className="pb-1">
                                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                                    {userProfile.full_name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                                    <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                                        <GraduationCap size={13} />
                                        {userProfile.university}
                                    </span>
                                    <span>•</span>
                                    <span>{userProfile.course}</span>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-1">
                                        <Mail size={12} />
                                        {userProfile.email}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={() => onNavigateTab('settings')}
                                className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                            >
                                <Settings size={13} />
                                <span>Edit Profile</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigateTab('auth')}
                                className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0B132B] px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-600 dark:bg-indigo-600 transition"
                            >
                                <User size={13} />
                                <span>Account Portal</span>
                            </button>
                        </div>
                    </div>

                    {userProfile.bio && (
                        <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                            {userProfile.bio}
                        </p>
                    )}
                </div>
            </div>

            {/* Academic Impact Metrics */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-[11px] font-medium text-slate-500">Primary Section</div>
                    <div className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Layers size={16} className="text-indigo-600" />
                        <span>Section {userProfile.section}</span>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-[11px] font-medium text-slate-500">Master Notes Authored</div>
                    <div className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FileText size={16} className="text-indigo-600" />
                        <span>{metrics.total_master_notes}</span>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-[11px] font-medium text-slate-500">Peer Upvotes Earned</div>
                    <div className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ThumbsUp size={16} className="text-emerald-600" />
                        <span>{metrics.total_upvotes}</span>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-[11px] font-medium text-slate-500">Trust Standing</div>
                    <div className="mt-1 font-display text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
                        <Award size={16} />
                        <span>Source Verified Tier</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Enrolled Courses */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                            Enrolled University Courses ({subjects.length})
                        </h2>
                        <div className="space-y-2.5">
                            {subjects.map((sub) => (
                                <div
                                    key={sub.id}
                                    className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            {sub.code}
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-500">
                                            {sub.semester}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
                                        {sub.name}
                                    </div>
                                    <div className="mt-1 text-[11px] text-slate-500">
                                        Instructor: {sub.teacher} • {sub.chapters_count} Chapters
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Authored Master Notes & Vault Activity */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Authored Master Notes & Contributions
                            </h2>
                            <button
                                type="button"
                                onClick={() => onNavigateTab('studio')}
                                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                                + Create New
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {recentNotes.map((note) => (
                                <div
                                    key={note.id}
                                    onClick={() => onViewNote(note)}
                                    className="group flex cursor-pointer items-center justify-between rounded-lg border border-slate-200/80 bg-white p-3.5 hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-800/40 transition"
                                >
                                    <div className="min-w-0 pr-3">
                                        <div className="flex items-center space-x-2">
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                {note.subject_code}
                                            </span>
                                            <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white truncate">
                                                {note.title}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-500">
                                            {note.chapter} • Section {note.section} • {note.professor}
                                        </div>
                                    </div>
                                    <ArrowRight
                                        size={14}
                                        className="text-slate-400 group-hover:text-indigo-600 shrink-0"
                                    />
                                </div>
                            ))}
                        </div>

                        {userVaultContributions.length > 0 && (
                            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                                    Section {userProfile.section} Vault Shares
                                </h3>
                                <div className="space-y-2">
                                    {userVaultContributions.slice(0, 3).map((v) => (
                                        <div
                                            key={v.id}
                                            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50"
                                        >
                                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                                {v.title}
                                            </span>
                                            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-600">
                                                <ShieldCheck size={12} />
                                                <span>{v.upvotes} upvotes</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
