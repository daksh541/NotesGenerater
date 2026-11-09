import React, { useEffect, useState } from 'react';
import {
    Home,
    FileText,
    Sparkles,
    Shield,
    BookOpen,
    GraduationCap,
    Users,
    Settings,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Bell,
    Layers,
    X,
    ExternalLink,
} from 'lucide-react';
import { MasterNoteContent, SectionId, SubjectModel } from '../../types/lectra';

export type LectraTab =
    | 'dashboard'
    | 'chat'
    | 'studio'
    | 'vault'
    | 'study-kits'
    | 'professors'
    | 'community'
    | 'settings'
    | 'profile'
    | 'notifications'
    | 'notes-viewer'
    | 'auth';

export interface RecentWorkspaceItem {
    id: string;
    name: string;
    code: string;
    section: SectionId;
    chapter?: string;
    updatedAt: string;
    lectureId?: string;
}

interface LectraSidebarProps {
    activeTab: LectraTab;
    onSelectTab: (tab: LectraTab) => void;
    currentSection: SectionId;
    subjects: SubjectModel[];
    currentSubject: SubjectModel | null;
    onSelectSubject: (s: SubjectModel) => void;
    recentWorkspaces?: RecentWorkspaceItem[];
    onSelectWorkspace?: (ws: RecentWorkspaceItem) => void;
    recentNotes?: MasterNoteContent[];
    onSelectNote?: (lectureId: string) => void;
    collapsed: boolean;
    onToggleCollapsed: () => void;
    mobileOpen?: boolean;
    onCloseMobile?: () => void;
    unreadNotificationsCount?: number;
}

export const LectraSidebar: React.FC<LectraSidebarProps> = ({
    activeTab,
    onSelectTab,
    currentSection,
    subjects,
    currentSubject,
    onSelectSubject,
    recentNotes = [],
    onSelectNote,
    collapsed,
    onToggleCollapsed,
    mobileOpen = false,
    onCloseMobile,
    unreadNotificationsCount = 0,
}) => {
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [isRecentNotesOpen, setIsRecentNotesOpen] = useState(true);
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const small = window.innerWidth < 1024;
            setIsMobileViewport(small);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Primary navigation items requested:
    // Home, Notebook Chat, My Notes, AI Notes Studio, Section Vault, Study Kits
    const primaryNav = [
        { id: 'dashboard' as LectraTab, label: 'Home', icon: Home },
        { id: 'chat' as LectraTab, label: 'Notebook Chat', icon: Sparkles, badge: 'AI' },
        { id: 'notes-viewer' as LectraTab, label: 'My Notes', icon: FileText },
        { id: 'studio' as LectraTab, label: 'AI Notes Studio', icon: Layers },
        { id: 'vault' as LectraTab, label: 'Section Vault', icon: Shield, badge: 'A–I' },
        { id: 'study-kits' as LectraTab, label: 'Study Kits', icon: BookOpen },
    ];

    // Secondary navigation items under "More":
    // Professor Library, Community, Notifications, Settings
    const secondaryNav = [
        { id: 'professors' as LectraTab, label: 'Professor Library', icon: GraduationCap },
        { id: 'community' as LectraTab, label: 'Community', icon: Users },
        {
            id: 'notifications' as LectraTab,
            label: 'Notifications',
            icon: Bell,
            badge: unreadNotificationsCount > 0 ? String(unreadNotificationsCount) : undefined,
        },
        { id: 'settings' as LectraTab, label: 'Settings', icon: Settings },
    ];

    const handleNavClick = (tab: LectraTab) => {
        onSelectTab(tab);
        if (onCloseMobile) onCloseMobile();
    };

    // Show top 3 most recently accessed notes
    const topThreeNotes = recentNotes.slice(0, 3);

    const isSecondaryActive = secondaryNav.some((item) => item.id === activeTab);

    const sidebarContent = (
        <aside
            aria-label="Primary Navigation"
            className={`relative flex flex-col border-r border-slate-200/90 bg-white dark:border-slate-800/80 dark:bg-[#0B132B] text-slate-700 dark:text-slate-300 transition-all duration-200 select-none h-screen shrink-0 ${
                collapsed && !isMobileViewport ? 'w-[68px]' : 'w-64'
            }`}
        >
            {/* Brand Header */}
            <div className="flex h-16 items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-4">
                <button
                    type="button"
                    onClick={() => handleNavClick('dashboard')}
                    className="flex items-center space-x-3 overflow-hidden text-left focus:outline-none group"
                >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs transition group-hover:bg-indigo-500">
                        <Layers size={18} />
                    </div>
                    {(!collapsed || isMobileViewport) && (
                        <div className="flex flex-col min-w-0">
                            <span className="font-display font-bold tracking-tight text-slate-900 dark:text-white text-base leading-none">
                                LECTRA
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 tracking-wide mt-1">
                                Academic Intelligence
                            </span>
                        </div>
                    )}
                </button>

                {isMobileViewport ? (
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
                        aria-label="Close Sidebar"
                    >
                        <X size={16} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onToggleCollapsed}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-700 dark:hover:text-white transition-colors"
                        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                        aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                    </button>
                )}
            </div>

            {/* Navigation Body */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {/* Primary Nav */}
                <div className="space-y-1">
                    {primaryNav.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            activeTab === item.id ||
                            (item.id === 'notes-viewer' && activeTab === 'notes-viewer');
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleNavClick(item.id)}
                                className={`group flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 ${
                                    isActive
                                        ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-600 dark:text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                title={collapsed && !isMobileViewport ? item.label : undefined}
                            >
                                <Icon
                                    size={16}
                                    className={`shrink-0 transition-colors ${
                                        isActive
                                            ? 'text-indigo-600 dark:text-white'
                                            : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                                    }`}
                                />
                                {(!collapsed || isMobileViewport) && (
                                    <div className="ml-2.5 flex flex-1 items-center justify-between overflow-hidden">
                                        <span className="truncate">{item.label}</span>
                                        {item.badge && (
                                            <span
                                                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                                                    isActive
                                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-indigo-100'
                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                }`}
                                            >
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Collapsible Recent Notes (Top 3) */}
                {(!collapsed || isMobileViewport) && topThreeNotes.length > 0 && (
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setIsRecentNotesOpen(!isRecentNotesOpen)}
                            className="flex w-full items-center justify-between px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition"
                        >
                            <span>Recent Notes</span>
                            <ChevronDown
                                size={12}
                                className={`transition-transform duration-150 ${
                                    isRecentNotesOpen ? '' : '-rotate-90'
                                }`}
                            />
                        </button>
                        {isRecentNotesOpen && (
                            <div className="space-y-0.5 mt-1">
                                {topThreeNotes.map((note) => (
                                    <button
                                        key={note.id}
                                        type="button"
                                        onClick={() => {
                                            if (onSelectNote) onSelectNote(note.lecture_id);
                                            else handleNavClick('notes-viewer');
                                            if (onCloseMobile) onCloseMobile();
                                        }}
                                        className="group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200"
                                        title={`${note.chapter} (${note.subject_code})`}
                                    >
                                        <div className="flex items-center space-x-2 min-w-0">
                                            <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-indigo-500/80 group-hover:bg-indigo-600" />
                                            <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                                                {note.chapter || note.title}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Secondary Navigation under "More" */}
                {(!collapsed || isMobileViewport) ? (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/70">
                        <button
                            type="button"
                            onClick={() => setIsMoreOpen(!isMoreOpen)}
                            className="flex w-full items-center justify-between px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition"
                        >
                            <span>More</span>
                            <ChevronDown
                                size={12}
                                className={`transition-transform duration-150 ${
                                    isMoreOpen || isSecondaryActive ? '' : '-rotate-90'
                                }`}
                            />
                        </button>
                        {(isMoreOpen || isSecondaryActive) && (
                            <div className="space-y-1 mt-1">
                                {secondaryNav.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleNavClick(item.id)}
                                            className={`group flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 ${
                                                isActive
                                                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-600 dark:text-white shadow-xs'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <Icon
                                                size={15}
                                                className={`shrink-0 ${
                                                    isActive
                                                        ? 'text-indigo-600 dark:text-white'
                                                        : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                                                }`}
                                            />
                                            <div className="ml-2.5 flex flex-1 items-center justify-between overflow-hidden">
                                                <span className="truncate">{item.label}</span>
                                                {item.badge && (
                                                    <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Collapsed view icons for secondary items */
                    <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/70">
                        {secondaryNav.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleNavClick(item.id)}
                                    className={`group flex w-full items-center justify-center rounded-lg p-2 text-xs font-medium transition-all duration-150 ${
                                        isActive
                                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-600 dark:text-white'
                                            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-white'
                                    }`}
                                    title={item.label}
                                >
                                    <Icon size={16} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Subtle Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 p-3">
                {!collapsed || isMobileViewport ? (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                        <div className="flex items-center space-x-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                                Section {currentSection} Active
                            </span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">v2.5</span>
                    </div>
                ) : (
                    <div className="flex justify-center" title={`Section ${currentSection} Active`}>
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>
                )}
            </div>
        </aside>
    );

    if (isMobileViewport) {
        if (!mobileOpen) return null;
        return (
            <div className="fixed inset-0 z-50 flex lg:hidden">
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
                    onClick={onCloseMobile}
                />
                <div className="relative z-10 flex">{sidebarContent}</div>
            </div>
        );
    }

    return sidebarContent;
};
