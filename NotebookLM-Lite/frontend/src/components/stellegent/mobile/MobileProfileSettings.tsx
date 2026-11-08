import React, { useState, useEffect } from 'react';
import { User, LogOut, Download, Server, HelpCircle, Trash2, CheckCircle2, Shield, Settings2, Moon, Sun } from 'lucide-react';
import { User as UserType, Workspace } from '../../../types/stellegent';
import { stellegentApi, getApiBaseUrl } from '../../../services/stellegentApi';
import { Capacitor } from '@capacitor/core';

interface MobileProfileSettingsProps {
    currentUser: UserType | null;
    onSignOut: () => void;
    onOpenAuth: () => void;
    onOpenConfig: () => void;
    onReplayOnboarding: () => void;
    theme: string;
    onToggleTheme: () => void;
}

export const MobileProfileSettings: React.FC<MobileProfileSettingsProps> = ({
    currentUser,
    onSignOut,
    onOpenAuth,
    onOpenConfig,
    onReplayOnboarding,
    theme,
    onToggleTheme
}) => {
    const [customServerUrl, setCustomServerUrl] = useState('');
    const [isSavingServer, setIsSavingServer] = useState(false);
    const [serverSavedSuccess, setServerSavedSuccess] = useState(false);
    const [canInstallPwa, setCanInstallPwa] = useState(false);
    const [isNative, setIsNative] = useState(false);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
        const savedUrl = localStorage.getItem('stellegent_api_server_url') || '';
        setCustomServerUrl(savedUrl || getApiBaseUrl());

        // Check if PWA install prompt is available
        if ((window as any).deferredPrompt) {
            setCanInstallPwa(true);
        }

        const handlePwaReady = () => setCanInstallPwa(true);
        window.addEventListener('pwa-installable', handlePwaReady);

        return () => {
            window.removeEventListener('pwa-installable', handlePwaReady);
        };
    }, []);

    const handleSaveServerUrl = () => {
        setIsSavingServer(true);
        if (customServerUrl.trim()) {
            localStorage.setItem('stellegent_api_server_url', customServerUrl.trim());
        } else {
            localStorage.removeItem('stellegent_api_server_url');
        }
        setServerSavedSuccess(true);
        setTimeout(() => {
            setIsSavingServer(false);
            setServerSavedSuccess(false);
        }, 1500);
    };

    const handleInstallPwa = async () => {
        const promptEvent = (window as any).deferredPrompt;
        if (!promptEvent) return;
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
            setCanInstallPwa(false);
        }
        (window as any).deferredPrompt = null;
    };

    const handleClearOfflineCache = async () => {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
            alert('Offline cached assets cleared successfully.');
        }
    };

    return (
        <div className="max-w-xl mx-auto px-4 py-6 space-y-6 pb-mobile-nav">
            {/* Header */}
            <div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Profile & Settings</h1>
                <p className="text-xs text-slate-500 mt-0.5">Manage your account, device settings, and connectivity</p>
            </div>

            {/* User Profile Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                {currentUser ? (
                    <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-indigo-600/30">
                            {currentUser.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    {currentUser.full_name}
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                    {currentUser.role}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{currentUser.email}</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Guest Session</h2>
                        <p className="text-xs text-slate-500">Sign in to sync your lecture notes across devices</p>
                    </div>
                )}

                {currentUser ? (
                    <button
                        onClick={onSignOut}
                        className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 active:scale-95 transition-transform"
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                ) : (
                    <button
                        onClick={onOpenAuth}
                        className="px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-bold active:scale-95 shadow-md shadow-indigo-600/30"
                    >
                        Sign In
                    </button>
                )}
            </div>

            {/* PWA Install Promotion Banner (if available) */}
            {canInstallPwa && (
                <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-900 to-violet-900 text-white shadow-lg space-y-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
                            <Download size={22} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold">Install Stellegent on Your Phone</h3>
                            <p className="text-[11px] text-indigo-200">
                                Add to home screen for full-screen camera capture and offline study
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleInstallPwa}
                        className="w-full py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs shadow hover:bg-indigo-50 active:scale-95 transition-all"
                    >
                        Install App Now
                    </button>
                </div>
            )}

            {/* Application Settings List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm text-xs">
                {/* Theme Toggle Item */}
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {theme === 'light' ? <Sun size={17} /> : <Moon size={17} />}
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">Appearance</span>
                            <span className="text-[11px] text-slate-400">Current theme: {theme}</span>
                        </div>
                    </div>
                    <button
                        onClick={onToggleTheme}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold active:scale-95"
                    >
                        Switch to {theme === 'light' ? 'Dark' : 'Light'}
                    </button>
                </div>

                {/* Model Configuration Modal Launcher */}
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <Settings2 size={17} />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">AI Models & Keys</span>
                            <span className="text-[11px] text-slate-400">Vision model, RAG embeddings, and providers</span>
                        </div>
                    </div>
                    <button
                        onClick={onOpenConfig}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold active:scale-95"
                    >
                        Configure
                    </button>
                </div>

                {/* Replay Onboarding */}
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <HelpCircle size={17} />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">Welcome Tutorial</span>
                            <span className="text-[11px] text-slate-400">Replay the 3-step feature walkthrough</span>
                        </div>
                    </div>
                    <button
                        onClick={onReplayOnboarding}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold active:scale-95"
                    >
                        View Guide
                    </button>
                </div>

                {/* Clear Offline Cache */}
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <Trash2 size={17} />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">Offline Cache</span>
                            <span className="text-[11px] text-slate-400">Clear cached shells and static bundles</span>
                        </div>
                    </div>
                    <button
                        onClick={handleClearOfflineCache}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold active:scale-95"
                    >
                        Clear Cache
                    </button>
                </div>
            </div>

            {/* Mobile Backend Server URL Settings */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
                    <Server size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <span>Backend Server Endpoint</span>
                </div>
                <p className="text-[11px] text-slate-500">
                    Configure the backend server URL for native mobile apps or remote self-hosted instances.
                </p>
                <div className="space-y-2">
                    <input
                        type="url"
                        value={customServerUrl}
                        onChange={(e) => setCustomServerUrl(e.target.value)}
                        placeholder="http://10.0.2.2:8000/api or https://your-server.com/api"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400">
                            Platform: {isNative ? `Capacitor (${Capacitor.getPlatform()})` : 'Web / PWA'}
                        </span>
                        <button
                            onClick={handleSaveServerUrl}
                            className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center space-x-1 active:scale-95 transition-all shadow-sm"
                        >
                            {serverSavedSuccess ? (
                                <>
                                    <CheckCircle2 size={13} />
                                    <span>Saved</span>
                                </>
                            ) : (
                                <span>Save URL</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* App Version Info */}
            <div className="text-center text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-500">Stellegent Mobile v1.0.0</p>
                <p>AI-Powered Whiteboard to Knowledge Transformation</p>
            </div>
        </div>
    );
};
