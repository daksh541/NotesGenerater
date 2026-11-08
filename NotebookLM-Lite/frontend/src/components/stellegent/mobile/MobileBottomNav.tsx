import React from 'react';
import { Home, BookOpen, Camera, Search, User, Layers } from 'lucide-react';

export type MobileTab = 'dashboard' | 'library' | 'search' | 'profile' | 'workbench';

interface MobileBottomNavProps {
    currentTab: MobileTab;
    onSelectTab: (tab: MobileTab) => void;
    onTriggerCapture: () => void;
    lectureCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
    currentTab,
    onSelectTab,
    onTriggerCapture,
    lectureCount
}) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 safe-bottom shadow-lg select-none">
            <div className="flex items-center justify-around px-2 py-1.5 max-w-md mx-auto relative">
                {/* Home / Dashboard */}
                <button
                    onClick={() => onSelectTab('dashboard')}
                    className={`flex-1 flex flex-col items-center py-1 transition-all ${
                        currentTab === 'dashboard'
                            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Home size={20} className={currentTab === 'dashboard' ? 'scale-110 transition-transform' : ''} />
                    <span className="text-[10px] mt-0.5">Home</span>
                </button>

                {/* Library / Subjects */}
                <button
                    onClick={() => onSelectTab('library')}
                    className={`flex-1 flex flex-col items-center py-1 transition-all relative ${
                        currentTab === 'library'
                            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <div className="relative">
                        <BookOpen size={20} className={currentTab === 'library' ? 'scale-110 transition-transform' : ''} />
                        {typeof lectureCount === 'number' && lectureCount > 0 && (
                            <span className="absolute -top-1 -right-2 bg-indigo-600 text-white text-[8px] font-extrabold px-1 rounded-full">
                                {lectureCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] mt-0.5">Library</span>
                </button>

                {/* Floating Center Shutter Button: Capture Whiteboard */}
                <div className="flex-1 flex justify-center -mt-6">
                    <button
                        onClick={onTriggerCapture}
                        className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 active:scale-95 transition-all hover:scale-105 border-4 border-white dark:border-slate-900"
                        title="Capture Lecture Whiteboard"
                    >
                        <Camera size={24} />
                    </button>
                </div>

                {/* Global Search */}
                <button
                    onClick={() => onSelectTab('search')}
                    className={`flex-1 flex flex-col items-center py-1 transition-all ${
                        currentTab === 'search'
                            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Search size={20} className={currentTab === 'search' ? 'scale-110 transition-transform' : ''} />
                    <span className="text-[10px] mt-0.5">Search</span>
                </button>

                {/* Profile & Settings */}
                <button
                    onClick={() => onSelectTab('profile')}
                    className={`flex-1 flex flex-col items-center py-1 transition-all ${
                        currentTab === 'profile'
                            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <User size={20} className={currentTab === 'profile' ? 'scale-110 transition-transform' : ''} />
                    <span className="text-[10px] mt-0.5">Profile</span>
                </button>
            </div>
        </nav>
    );
};
