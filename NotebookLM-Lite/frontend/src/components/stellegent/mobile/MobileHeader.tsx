import React, { useEffect, useState } from 'react';
import { Sparkles, Sun, Moon, WifiOff, Settings, Layers3 } from 'lucide-react';
import { User } from '../../../types/stellegent';

interface MobileHeaderProps {
    currentUser: User | null;
    theme: string;
    onToggleTheme: () => void;
    onOpenConfig: () => void;
    onOpenAuth: () => void;
    onHomeClick: () => void;
    currentNav: string;
    onToggleWorkbench: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
    currentUser,
    theme,
    onToggleTheme,
    onOpenConfig,
    onOpenAuth,
    onHomeClick,
    currentNav,
    onToggleWorkbench
}) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 safe-top px-4 py-2.5 flex items-center justify-between select-none">
            {/* Logo / Brand */}
            <button
                onClick={onHomeClick}
                className="flex items-center space-x-2 text-left group active:scale-95 transition-transform"
            >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
                    <Sparkles size={16} />
                </div>
                <div>
                    <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white block leading-none">
                        Stellegent
                    </span>
                    <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 block leading-tight mt-0.5">
                        Mobile Studio
                    </span>
                </div>
            </button>

            {/* Offline Pill Warning */}
            {!isOnline && (
                <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold animate-pulse">
                    <WifiOff size={11} />
                    <span>Offline</span>
                </div>
            )}

            {/* Right Quick Controls */}
            <div className="flex items-center space-x-1">
                {/* Switch to Desktop/SlideDeck Workbench */}
                <button
                    onClick={onToggleWorkbench}
                    className={`p-2 rounded-xl transition-colors ${
                        currentNav === 'workbench'
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Toggle Slide Deck & Studio Workbench"
                >
                    <Layers3 size={17} />
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={onToggleTheme}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                    {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
                </button>

                {/* Config Modal */}
                <button
                    onClick={onOpenConfig}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
                    title="AI Models & API Configuration"
                >
                    <Settings size={17} />
                </button>

                {/* Auth Avatar / Sign In */}
                {currentUser ? (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm ml-1">
                        {currentUser.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                ) : (
                    <button
                        onClick={onOpenAuth}
                        className="ml-1 px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[11px] active:scale-95 transition-transform"
                    >
                        Sign In
                    </button>
                )}
            </div>
        </header>
    );
};
