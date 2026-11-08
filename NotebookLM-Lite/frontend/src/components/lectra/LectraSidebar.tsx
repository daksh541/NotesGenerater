import React, { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    Sparkles,
    Shield,
    BookOpen,
    GraduationCap,
    Users,
    Settings,
    Layers,
    ChevronLeft,
    ChevronRight,
    FolderKanban,
    Bell,
    User,
    X,
    FileText,
    PlusCircle,
} from 'lucide-react';
import { SectionId, SubjectModel } from '../../types/lectra';

export type LectraTab =
    | 'dashboard'
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
    recentWorkspaces = [],
    onSelectWorkspace,
    collapsed,
    onToggleCollapsed,
    mobileOpen = false,
    onCloseMobile,
    unreadNotificationsCount = 0,
}) => {
    const [isMobileViewport, setIsMobileViewport] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const small = window.innerWidth < 1024;
            setIsMobileViewport(small);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navItems = [
        { id: 'dashboard' as LectraTab, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'studio' as LectraTab, label: 'AI Notes Studio', icon: Sparkles, badge: 'Studio' },
        { id: 'vault' as LectraTab, label: 'Section Vault', icon: Shield, badge: 'A–I' },
        { id: 'study-kits' as LectraTab, label: 'Study Kits', icon: BookOpen },
        { id: 'professors' as LectraTab, label: 'Professor Library', icon: GraduationCap },
        { id: 'community' as LectraTab, label: 'Community', icon: Users },
    ];

    const secondaryNavItems = [
        {
            id: 'notifications' as LectraTab,
            label: 'Notifications',
            icon: Bell,
            badge: unreadNotificationsCount > 0 ? String(unreadNotificationsCount) : undefined,
        },
        { id: 'profile' as LectraTab, label: 'Profile', icon: User },
        { id: 'settings' as LectraTab, label: 'Settings', icon: Settings },
    ];

    const defaultWorkspaces: RecentWorkspaceItem[] =
        recentWorkspaces.length > 0
            ? recentWorkspaces
            : subjects.map((sub) => ({
                  id: sub.id,
                  name: sub.name,
                  code: sub.code,
                  section: currentSection,
                  chapter: `${sub.chapters_count} Chapters`,
                  updatedAt: 'Active',
              }));

    const handleNavClick = (tab: LectraTab) => {
        onSelectTab(tab);
        if (onCloseMobile) onCloseMobile();
    };

    const sidebarContent = (
        <aside
            aria-label="Primary Sidebar Navigation"
            className={`relative flex flex-col border-r border-slate-800/80 bg-[#0B132B] text-slate-300 transition-all duration-200 select-none h-screen shrink-0 ${
                collapsed && !isMobileViewport ? 'w-[72px]' : 'w-64'
            }`}
        >
            {/* Brand Header */}
            <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
                <button
                    type="button"
                    onClick={() => handleNavClick('dashboard')}
                    className="flex items-center space-x-3 overflow-hidden text-left focus:outline-none group"
                >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm ring-1 ring-white/15 transition group-hover:bg-indigo-500">
                        <Layers size={17} />
                    </div>
                    {(!collapsed || isMobileViewport) && (
                        <div className="flex flex-col">
                            <div className="flex items-center space-x-1.5">
                                <span className="font-display font-bold tracking-tight text-white text-base leading-none">
                                    LECTRA
                                </span>
                                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-300 border border-indigo-400/20">
                                    PRO
                                </span>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400 tracking-wide mt-0.5">
                                Academic Intelligence
                            </span>
                        </div>
                    )}
                </button>

                {isMobileViewport ? (
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                        aria-label="Close Sidebar"
                    >
                        <X size={16} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onToggleCollapsed}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors"
                        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                        aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                    </button>
                )}
            </div>

            {/* Active Classroom Context Pill */}
            {(!collapsed || isMobileViewport) && (
                <div className="mx-3 mt-3.5 rounded-lg border border-slate-800 bg-[#131D3B] px-3 py-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-400">Active Classroom</span>
                        <span className="inline-flex items-center space-x-1 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            <span>Section {currentSection}</span>
                        </span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-slate-300 truncate">
                        {currentSubject ? `${currentSubject.code} • ${currentSubject.name}` : 'All Academic Courses'}
                    </p>
                </div>
            )}

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                <div className="space-y-1">
                    {(!collapsed || isMobileViewport) && (
                        <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Platform
                        </div>
                    )}
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            activeTab === item.id ||
                            (item.id === 'studio' && activeTab === 'notes-viewer');
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleNavClick(item.id)}
                                className={`group flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 ${
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                                }`}
                                title={collapsed && !isMobileViewport ? item.label : undefined}
                            >
                                <Icon
                                    size={16}
                                    className={`shrink-0 transition-colors ${
                                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                                    }`}
                                />
                                {(!collapsed || isMobileViewport) && (
                                    <div className="ml-2.5 flex flex-1 items-center justify-between overflow-hidden">
                                        <span className="truncate">{item.label}</span>
                                        {item.badge && (
                                            <span
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                    isActive
                                                        ? 'bg-indigo-700 text-indigo-100'
                                                        : 'bg-slate-800 text-slate-400'
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

                {/* Recent Workspaces Section */}
                {(!collapsed || isMobileViewport) && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between px-2.5 pb-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <FolderKanban size={12} className="text-slate-500" />
                                <span>Recent Workspaces</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => handleNavClick('studio')}
                                className="text-slate-500 hover:text-indigo-400 transition"
                                title="New Workspace Note"
                            >
                                <PlusCircle size={13} />
                            </button>
                        </div>
                        <div className="space-y-0.5">
                            {defaultWorkspaces.map((ws) => {
                                const isSelected = currentSubject?.id === ws.id || currentSubject?.code === ws.code;
                                return (
                                    <button
                                        key={ws.id}
                                        type="button"
                                        onClick={() => {
                                            if (onSelectWorkspace) {
                                                onSelectWorkspace(ws);
                                            } else {
                                                const found = subjects.find((s) => s.id === ws.id || s.code === ws.code);
                                                if (found) onSelectSubject(found);
                                            }
                                            if (onCloseMobile) onCloseMobile();
                                        }}
                                        className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                            isSelected
                                                ? 'bg-slate-800/90 text-white font-medium'
                                                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2.5 min-w-0">
                                            <span
                                                className={`h-2 w-2 rounded-full shrink-0 ${
                                                    isSelected ? 'bg-indigo-400' : 'bg-slate-600 group-hover:bg-slate-400'
                                                }`}
                                            />
                                            <div className="truncate">
                                                <div className="truncate font-medium text-xs leading-tight">
                                                    {ws.code} — {ws.name}
                                                </div>
                                                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                                    Sec {ws.section} • {ws.chapter || 'Course Workspace'}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Account & Preferences */}
                <div className="space-y-1 pt-2 border-t border-slate-800/70">
                    {(!collapsed || isMobileViewport) && (
                        <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Account & System
                        </div>
                    )}
                    {secondaryNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleNavClick(item.id)}
                                className={`group flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 ${
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                                }`}
                                title={collapsed && !isMobileViewport ? item.label : undefined}
                            >
                                <Icon
                                    size={16}
                                    className={`shrink-0 ${
                                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                                    }`}
                                />
                                {(!collapsed || isMobileViewport) && (
                                    <div className="ml-2.5 flex flex-1 items-center justify-between overflow-hidden">
                                        <span className="truncate">{item.label}</span>
                                        {item.badge && (
                                            <span className="rounded-full bg-indigo-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer Status */}
            <div className="border-t border-slate-800/80 p-3">
                {!collapsed || isMobileViewport ? (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                        <div className="flex items-center space-x-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            <span className="font-medium text-slate-300">Sections A–I Synced</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500">v2.5</span>
                    </div>
                ) : (
                    <div className="flex justify-center" title="Sections A–I Synced">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
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
