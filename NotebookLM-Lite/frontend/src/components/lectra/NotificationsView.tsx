import React, { useState } from 'react';
import {
    Bell,
    CheckCircle2,
    ShieldCheck,
    Sparkles,
    Users,
    Check,
    ArrowUpRight,
} from 'lucide-react';
import { NotificationItem } from '../../types/lectra';
import { LectraTab } from './LectraSidebar';

interface NotificationsViewProps {
    notifications: NotificationItem[];
    onMarkAllRead: () => void;
    onMarkSingleRead?: (id: string) => void;
    onNavigateTab: (tab: LectraTab) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
    notifications,
    onMarkAllRead,
    onMarkSingleRead,
    onNavigateTab,
}) => {
    const [filter, setFilter] = useState<'all' | 'unread' | 'vault' | 'studio'>('all');

    const unreadCount = notifications.filter((n) => !n.read).length;

    const filtered = notifications.filter((n) => {
        if (filter === 'unread') return !n.read;
        if (filter === 'vault') return n.type === 'vault' || n.title.toLowerCase().includes('vault');
        if (filter === 'studio') return n.type === 'studio' || n.title.toLowerCase().includes('note');
        return true;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'vault':
                return <ShieldCheck size={16} className="text-emerald-600" />;
            case 'studio':
                return <Sparkles size={16} className="text-indigo-600" />;
            case 'community':
                return <Users size={16} className="text-indigo-600" />;
            default:
                return <Bell size={16} className="text-indigo-600" />;
        }
    };

    return (
        <div className="space-y-6 pb-16 max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-200/80 pb-5 dark:border-slate-800">
                <div>
                    <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <Bell size={14} />
                        <span>Activity & Verification Feed</span>
                    </div>
                    <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                        Notifications
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Stay updated on Section Vault verifications, AI synthesis completions, and peer reviews.
                    </p>
                </div>

                {unreadCount > 0 && (
                    <button
                        type="button"
                        onClick={onMarkAllRead}
                        className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0B132B] hover:bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition dark:bg-indigo-600"
                    >
                        <Check size={14} />
                        <span>Mark All Read ({unreadCount})</span>
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5 rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-saas dark:border-slate-800 dark:bg-slate-900 w-fit">
                {[
                    { id: 'all', label: `All (${notifications.length})` },
                    { id: 'unread', label: `Unread (${unreadCount})` },
                    { id: 'vault', label: 'Section Vault' },
                    { id: 'studio', label: 'AI Studio' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFilter(tab.id as any)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            filter === tab.id
                                ? 'bg-[#0B132B] text-white dark:bg-indigo-600'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            {filtered.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        You're all caught up
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        No notifications match the selected filter.
                    </p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filtered.map((n) => (
                        <div
                            key={n.id}
                            className={`flex items-start justify-between rounded-xl border p-4 shadow-saas transition ${
                                !n.read
                                    ? 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/60 dark:bg-indigo-950/30'
                                    : 'border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900'
                            }`}
                        >
                            <div className="flex items-start space-x-3.5">
                                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                    {getIcon(n.type)}
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                                            {n.title}
                                        </h3>
                                        {!n.read && (
                                            <span className="rounded-full bg-indigo-600 px-2 py-0.2 text-[9px] font-bold text-white">
                                                NEW
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {n.message}
                                    </p>
                                    <span className="mt-1.5 block text-[10px] font-medium text-slate-400">
                                        {new Date(n.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0 ml-4">
                                {!n.read && onMarkSingleRead && (
                                    <button
                                        type="button"
                                        onClick={() => onMarkSingleRead(n.id)}
                                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400"
                                    >
                                        Mark read
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() =>
                                        onNavigateTab(
                                            n.type === 'vault'
                                                ? 'vault'
                                                : n.type === 'community'
                                                ? 'community'
                                                : 'dashboard'
                                        )
                                    }
                                    className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                    <span>View</span>
                                    <ArrowUpRight size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
