import React, { useState, useRef, useEffect } from 'react';
import {
    Search,
    Bell,
    ChevronDown,
    Plus,
    User,
    BookOpen,
    Layers,
    GraduationCap,
    Menu,
    Settings,
    LogOut,
    FileText,
    Shield,
    ArrowUpRight,
    Check,
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
    currentSection: SectionId;
    onSelectSection: (section: SectionId) => void;
    userProfile: UserProfile;
    notifications: NotificationItem[];
    onMarkNotificationsRead: () => void;
    onCreateMasterNotesClick: () => void;
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
}

export const LectraHeader: React.FC<LectraHeaderProps> = ({
    currentSubject,
    subjects,
    onSelectSubject,
    currentSection,
    onSelectSection,
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
}) => {
    const [showSubjectMenu, setShowSubjectMenu] = useState(false);
    const [showSectionMenu, setShowSectionMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    const headerRef = useRef<HTMLElement>(null);
    const sections: SectionId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const unreadCount = notifications.filter((n) => !n.read).length;

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
                setShowSubjectMenu(false);
                setShowSectionMenu(false);
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
            className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:px-6"
        >
            {/* Left: Mobile Hamburger + Global Search */}
            <div className="flex flex-1 items-center gap-3 max-w-lg">
                {onOpenMobileSidebar && (
                    <button
                        type="button"
                        onClick={onOpenMobileSidebar}
                        className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        aria-label="Open Navigation Drawer"
                    >
                        <Menu size={18} />
                    </button>
                )}

                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                        type="text"
                        value={searchQuery}
                        onFocus={() => setShowSearchDropdown(true)}
                        onChange={(e) => {
                            onSearchChange(e.target.value);
                            setShowSearchDropdown(true);
                        }}
                        placeholder="Search chapters, subjects, sections A–I, or faculty..."
                        aria-label="Global Search"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-14 text-xs font-medium text-slate-800 placeholder-slate-400 transition-all focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
                    />
                    <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-block rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-900">
                        ⌘K
                    </kbd>

                    {/* Global Search Results Popover */}
                    {showSearchDropdown && cleanQ.length > 0 && (
                        <div className="absolute left-0 mt-2 w-full sm:w-[440px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50 max-h-96 overflow-y-auto">
                            <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Global Search Results for "{searchQuery}"
                            </div>

                            {matchedNotes.length === 0 && matchedVault.length === 0 && matchedProfs.length === 0 ? (
                                <div className="py-6 text-center text-xs text-slate-400">
                                    No matching notes or faculty found. Try searching in Section Vault.
                                </div>
                            ) : (
                                <div className="space-y-2 pt-1">
                                    {matchedNotes.length > 0 && (
                                        <div>
                                            <div className="px-2.5 py-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                                Master Notes ({matchedNotes.length})
                                            </div>
                                            {matchedNotes.map((note) => (
                                                <button
                                                    key={note.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (onSelectNote) onSelectNote(note.lecture_id);
                                                        setShowSearchDropdown(false);
                                                    }}
                                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                                                >
                                                    <div className="flex items-center space-x-2 min-w-0">
                                                        <FileText size={14} className="text-indigo-600 shrink-0" />
                                                        <div className="truncate">
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                                {note.title}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {note.subject_code} • {note.chapter} • Sec {note.section}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ArrowUpRight size={13} className="text-slate-400 shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {matchedVault.length > 0 && (
                                        <div>
                                            <div className="px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
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
                                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                                                >
                                                    <div className="flex items-center space-x-2 min-w-0">
                                                        <Shield size={14} className="text-emerald-600 shrink-0" />
                                                        <div className="truncate">
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                                {v.title}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                Section {v.section} • {v.professor}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ArrowUpRight size={13} className="text-slate-400 shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {matchedProfs.length > 0 && (
                                        <div>
                                            <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                                                Faculty ({matchedProfs.length})
                                            </div>
                                            {matchedProfs.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        onNavigateTab('professors');
                                                        setShowSearchDropdown(false);
                                                    }}
                                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <GraduationCap size={14} className="text-indigo-600" />
                                                        <div>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {p.name}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">{p.department}</div>
                                                        </div>
                                                    </div>
                                                    <ArrowUpRight size={13} className="text-slate-400" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Selectors & Actions */}
            <div className="flex items-center space-x-2.5">
                {/* Subject Selector */}
                <div className="relative hidden md:block">
                    <button
                        type="button"
                        onClick={() => {
                            setShowSubjectMenu(!showSubjectMenu);
                            setShowSectionMenu(false);
                            setShowNotifications(false);
                            setShowUserMenu(false);
                        }}
                        className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                        <BookOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="max-w-[150px] truncate font-semibold">
                            {currentSubject ? `${currentSubject.code} • ${currentSubject.name}` : 'All Subjects'}
                        </span>
                        <ChevronDown size={13} className="text-slate-400" />
                    </button>

                    {showSubjectMenu && (
                        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Filter by Academic Subject
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    onSelectSubject(null);
                                    setShowSubjectMenu(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                                    !currentSubject
                                        ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span>All Enrolled Subjects</span>
                                {!currentSubject && <Check size={13} className="text-indigo-600" />}
                            </button>
                            {subjects.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectSubject(s);
                                        setShowSubjectMenu(false);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                                        currentSubject?.id === s.id
                                            ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="min-w-0 pr-2">
                                        <div className="font-semibold text-slate-900 dark:text-white">{s.code}</div>
                                        <div className="text-[11px] text-slate-500 truncate">{s.name}</div>
                                    </div>
                                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                        {s.teacher.split(' ').pop()}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Section Selector (Sections A through I) */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setShowSectionMenu(!showSectionMenu);
                            setShowSubjectMenu(false);
                            setShowNotifications(false);
                            setShowUserMenu(false);
                        }}
                        className="flex items-center space-x-1.5 rounded-lg border border-indigo-200/80 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-950 transition hover:bg-indigo-100/80 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300"
                    >
                        <Layers size={13} className="text-indigo-600 dark:text-indigo-400" />
                        <span>Section {currentSection}</span>
                        <ChevronDown size={12} className="text-indigo-500" />
                    </button>

                    {showSectionMenu && (
                        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                            <div className="px-1.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Select Classroom Section (A–I)
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                {sections.map((sec) => (
                                    <button
                                        key={sec}
                                        type="button"
                                        onClick={() => {
                                            onSelectSection(sec);
                                            setShowSectionMenu(false);
                                        }}
                                        className={`flex items-center justify-center rounded-lg py-1.5 text-xs font-semibold transition ${
                                            currentSection === sec
                                                ? 'bg-[#0B132B] text-white shadow-xs dark:bg-indigo-600'
                                                : 'bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300'
                                        }`}
                                    >
                                        Sec {sec}
                                    </button>
                                ))}
                            </div>
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
                            setShowSectionMenu(false);
                            setShowUserMenu(false);
                        }}
                        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        title="Notifications"
                        aria-label="Notifications"
                    >
                        <Bell size={16} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={onMarkNotificationsRead}
                                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-64 space-y-1.5 overflow-y-auto py-2">
                                {notifications.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-slate-400">No notifications</div>
                                ) : (
                                    notifications.slice(0, 4).map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => {
                                                onNavigateTab('notifications');
                                                setShowNotifications(false);
                                            }}
                                            className={`cursor-pointer rounded-lg border p-2.5 transition ${
                                                !n.read
                                                    ? 'border-indigo-100 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/30'
                                                    : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/40'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                                    {n.title}
                                                </span>
                                                {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                                {n.message}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onNavigateTab('notifications');
                                        setShowNotifications(false);
                                    }}
                                    className="w-full rounded-lg py-1.5 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800 transition"
                                >
                                    View All Notifications
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Primary CTA: Create Master Notes */}
                <button
                    type="button"
                    onClick={onCreateMasterNotesClick}
                    className="flex items-center space-x-1.5 rounded-lg bg-[#0B132B] hover:bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors duration-150 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                >
                    <Plus size={14} />
                    <span className="hidden sm:inline">Create Master Notes</span>
                    <span className="sm:hidden">Create</span>
                </button>

                {/* User Profile Menu */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setShowUserMenu(!showUserMenu);
                            setShowSubjectMenu(false);
                            setShowSectionMenu(false);
                            setShowNotifications(false);
                        }}
                        className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white p-1 pl-1.5 pr-2 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                    >
                        {userProfile.avatar_url ? (
                            <img
                                src={userProfile.avatar_url}
                                alt={userProfile.full_name}
                                className="h-6 w-6 rounded-md object-cover"
                            />
                        ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                                {userProfile.full_name.charAt(0)}
                            </div>
                        )}
                        <span className="hidden text-xs font-semibold text-slate-800 dark:text-slate-200 lg:inline">
                            {userProfile.full_name.split(' ')[0]}
                        </span>
                        <ChevronDown size={12} className="text-slate-400" />
                    </button>

                    {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                            <div className="border-b border-slate-100 px-2.5 pb-2.5 pt-1 dark:border-slate-800">
                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                    {userProfile.full_name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">{userProfile.email}</div>
                                <div className="mt-1.5 flex items-center space-x-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                    <GraduationCap size={12} />
                                    <span>
                                        {userProfile.university} • Sec {userProfile.section}
                                    </span>
                                </div>
                            </div>

                            <div className="py-1 space-y-0.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onNavigateTab('profile');
                                        setShowUserMenu(false);
                                    }}
                                    className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    <User size={14} className="text-slate-400" />
                                    <span>Academic Profile</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onNavigateTab('notifications');
                                        setShowUserMenu(false);
                                    }}
                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    <div className="flex items-center space-x-2">
                                        <Bell size={14} className="text-slate-400" />
                                        <span>Notifications</span>
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onNavigateTab('settings');
                                        setShowUserMenu(false);
                                    }}
                                    className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    <Settings size={14} className="text-slate-400" />
                                    <span>Workspace Settings</span>
                                </button>
                                {onOpenAuthModal && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            onOpenAuthModal('onboarding');
                                        }}
                                        className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800"
                                    >
                                        <GraduationCap size={14} />
                                        <span>Academic Onboarding</span>
                                    </button>
                                )}
                            </div>

                            <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        if (onLogout) onLogout();
                                        else onNavigateTab('auth');
                                    }}
                                    className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                >
                                    <LogOut size={14} />
                                    <span>Sign Out / Switch Account</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
