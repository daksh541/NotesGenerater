import React, { useState, useRef, useEffect } from 'react';
import {
    Search,
    Bell,
    ChevronDown,
    Plus,
    User,
    BookOpen,
    Menu,
    LogOut,
    FileText,
    Shield,
    ArrowUpRight,
    Check,
    GraduationCap,
} from 'lucide-react';
import {
    MasterNoteContent,
    NotificationItem,
    ProfessorProfile,
    SectionId,
    SectionVaultNote,
    SubjectModel,
    UserProfile,
} from '../../types/lectra';
import { LectraTab } from './LectraSidebar';

interface LectraHeaderProps {
    currentSubject: SubjectModel | null;
    subjects: SubjectModel[];
    onSelectSubject: (subject: SubjectModel | null) => void;
    currentSection?: SectionId;
    onSelectSection?: (section: SectionId) => void;
    userProfile: UserProfile;
    notifications: NotificationItem[];
    onMarkNotificationsRead: () => void;
    onCreateMasterNotesClick?: () => void;
    onSearchChange: (query: string) => void;
    searchQuery: string;
    onNavigateTab: (tab: LectraTab) => void;
    onOpenMobileSidebar?: () => void;
    recentNotes?: MasterNoteContent[];
    vaultNotes?: SectionVaultNote[];
    professors?: ProfessorProfile[];
    onSelectNote?: (lectureId: string) => void;
    onLogout?: () => void;
    onOpenAuthModal?: (mode: 'login' | 'signup' | 'onboarding' | 'verify' | 'forgot') => void;
    pageTitle?: string;
}

export const LectraHeader: React.FC<LectraHeaderProps> = ({
    currentSubject,
    subjects,
    onSelectSubject,
    userProfile,
    notifications,
    onMarkNotificationsRead,
    onCreateMasterNotesClick,
    onSearchChange,
    searchQuery,
    onNavigateTab,
    onOpenMobileSidebar,
    recentNotes = [],
    vaultNotes = [],
    professors = [],
    onSelectNote,
    onLogout,
    onOpenAuthModal,
    pageTitle,
}) => {
    const [showSubjectMenu, setShowSubjectMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    const headerRef = useRef<HTMLElement>(null);
    const unreadCount = notifications.filter((n) => !n.read).length;

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
                setShowSubjectMenu(false);
                setShowNotifications(false);
                setShowUserMenu(false);
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter global search results
    const cleanQ = searchQuery.trim().toLowerCase();
    const matchedNotes = cleanQ
        ? recentNotes.filter(
              (n) =>
                  n.title.toLowerCase().includes(cleanQ) ||
                  n.chapter.toLowerCase().includes(cleanQ) ||
                  n.subject_code.toLowerCase().includes(cleanQ) ||
                  n.professor.toLowerCase().includes(cleanQ)
          )
        : [];
    const matchedVault = cleanQ
        ? vaultNotes.filter(
              (v) =>
                  v.title.toLowerCase().includes(cleanQ) ||
                  v.chapter.toLowerCase().includes(cleanQ) ||
                  v.subject_code.toLowerCase().includes(cleanQ)
          )
        : [];
    const matchedProfs = cleanQ
        ? professors.filter(
              (p) =>
                  p.name.toLowerCase().includes(cleanQ) ||
                  p.department.toLowerCase().includes(cleanQ)
          )
        : [];

    return (
        <header
            ref={headerRef}
            className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-[#0B132B]/95 sm:px-6"
        >
            {/* Left: Mobile Toggle & Page Title / Breadcrumb */}
            <div className="flex items-center gap-3">
                {onOpenMobileSidebar && (
                    <button
                        type="button"
                        onClick={onOpenMobileSidebar}
                        className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        aria-label="Open Navigation Drawer"
                    >
                        <Menu size={16} />
                    </button>
                )}

                {pageTitle && (
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white hidden sm:block">
                        {pageTitle}
                    </h2>
                )}
            </div>

            {/* Center: Minimal Global Search */}
            <div className="relative flex-1 max-w-md mx-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setShowSearchDropdown(true)}
                    onChange={(e) => {
                        onSearchChange(e.target.value);
                        setShowSearchDropdown(true);
                    }}
                    placeholder="Search notes, chapters, professors..."
                    aria-label="Global Search"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-12 text-xs font-medium text-slate-800 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500"
                />
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-block rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                    ⌘K
                </kbd>

                {/* Global Search Popover */}
                {showSearchDropdown && cleanQ.length > 0 && (
                    <div className="absolute left-0 mt-2 w-full sm:w-[420px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50 max-h-80 overflow-y-auto">
                        <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Results for "{searchQuery}"
                        </div>

                        {matchedNotes.length === 0 && matchedVault.length === 0 && matchedProfs.length === 0 ? (
                            <div className="py-4 text-center text-xs text-slate-400">
                                No matching notes found. Try Section Vault.
                            </div>
                        ) : (
                            <div className="space-y-2 pt-1">
                                {matchedNotes.length > 0 && (
                                    <div>
                                        <div className="px-2.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                            Master Notes ({matchedNotes.length})
                                        </div>
                                        {matchedNotes.slice(0, 3).map((note) => (
                                            <button
                                                key={note.id}
                                                type="button"
                                                onClick={() => {
                                                    if (onSelectNote) onSelectNote(note.lecture_id);
                                                    setShowSearchDropdown(false);
                                                }}
                                                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                                            >
                                                <div className="flex items-center space-x-2 min-w-0">
                                                    <FileText size={13} className="text-indigo-600 shrink-0" />
                                                    <div className="truncate">
                                                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                                            {note.title}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {note.subject_code} • {note.chapter}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ArrowUpRight size={12} className="text-slate-400 shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {matchedVault.length > 0 && (
                                    <div>
                                        <div className="px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                            Section Vault ({matchedVault.length})
                                        </div>
                                        {matchedVault.slice(0, 3).map((v) => (
                                            <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => {
                                                    onNavigateTab('vault');
                                                    setShowSearchDropdown(false);
                                                }}
                                                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                                            >
                                                <div className="flex items-center space-x-2 min-w-0">
                                                    <Shield size={13} className="text-emerald-600 shrink-0" />
                                                    <div className="truncate">
                                                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                                            {v.title}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            Sec {v.section} • {v.professor}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ArrowUpRight size={12} className="text-slate-400 shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Course Selector, Notifications & Profile */}
            <div className="flex items-center space-x-2">
                {/* Current Course Selector */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setShowSubjectMenu(!showSubjectMenu);
                            setShowNotifications(false);
                            setShowUserMenu(false);
                        }}
                        className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                        <BookOpen size={13} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="max-w-[120px] truncate text-xs font-medium">
                            {currentSubject ? currentSubject.code : 'All Courses'}
                        </span>
                        <ChevronDown size={11} className="text-slate-400" />
                    </button>

                    {showSubjectMenu && (
                        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                            <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Select Active Course
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    onSelectSubject(null);
                                    setShowSubjectMenu(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                                    !currentSubject
                                        ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span>All Enrolled Courses</span>
                                {!currentSubject && <Check size={12} className="text-indigo-600" />}
                            </button>
                            {subjects.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectSubject(s);
                                        setShowSubjectMenu(false);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                                        currentSubject?.id === s.id
                                            ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="min-w-0 pr-2">
                                        <div className="font-semibold text-slate-900 dark:text-white">{s.code}</div>
                                        <div className="text-[10px] text-slate-400 truncate">{s.name}</div>
                                    </div>
                                    <span className="shrink-0 text-[10px] text-slate-400">
                                        {s.teacher.split(' ').pop()}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notifications Bell */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setShowNotifications(!showNotifications);
                            setShowSubjectMenu(false);
                            setShowUserMenu(false);
                        }}
                        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        aria-label="View Notifications"
                    >
                        <Bell size={14} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                    Notifications
                                </span>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={onMarkNotificationsRead}
                                        className="text-[10px] font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="py-4 text-center text-xs text-slate-400">
                                        No recent notifications
                                    </div>
                                ) : (
                                    notifications.slice(0, 4).map((n) => (
                                        <div
                                            key={n.id}
                                            className={`rounded-lg p-2 text-xs transition ${
                                                !n.read
                                                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100'
                                                    : 'text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            <div className="font-semibold text-[11px]">{n.title}</div>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                {n.message}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Profile */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setShowUserMenu(!showUserMenu);
                            setShowSubjectMenu(false);
                            setShowNotifications(false);
                        }}
                        className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white p-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-[10px] font-bold text-white">
                            {userProfile.full_name
                                ? userProfile.full_name
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase()
                                : 'U'}
                        </div>
                        <ChevronDown size={11} className="text-slate-400 hidden sm:block mr-0.5" />
                    </button>

                    {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                            <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                    {userProfile.full_name}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                    {userProfile.university} • Sec {userProfile.section}
                                </div>
                            </div>
                            <div className="py-1 space-y-0.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onNavigateTab('profile');
                                        setShowUserMenu(false);
                                    }}
                                    className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    <User size={13} />
                                    <span>Profile</span>
                                </button>
                                {onLogout ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            onLogout();
                                        }}
                                        className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                    >
                                        <LogOut size={13} />
                                        <span>Sign Out</span>
                                    </button>
                                ) : onOpenAuthModal ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            onOpenAuthModal('login');
                                        }}
                                        className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                                    >
                                        <User size={13} />
                                        <span>Sign In / Switch</span>
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
