import React from 'react';
import {
    Sparkles,
    Camera,
    BookOpen,
    GitFork,
    Brain,
    Search,
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    Layers,
    Cpu,
    Calculator,
    Workflow,
    SlidersHorizontal,
    Heart,
    Share2,
    Compass,
    ChevronRight,
    Maximize2,
    RotateCcw
} from 'lucide-react';

interface LandingHeroProps {
    onGetStarted: () => void;
    onExploreDemo: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onGetStarted, onExploreDemo }) => {
    return (
        <div className="w-full py-4 px-2 sm:px-6">
            {/* Outer Aura Glow Backdrop matching reference image */}
            <div className="relative mx-auto max-w-7xl rounded-[32px] p-3 sm:p-6 bg-gradient-to-br from-[#dfece6] via-[#e8effa] to-[#ede7f8] dark:from-slate-900/90 dark:via-slate-950 dark:to-slate-900/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06)] border border-white/60 dark:border-slate-800">
                {/* Floating Luminous App Canvas */}
                <div className="rounded-[26px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/90 dark:border-slate-850 p-6 md:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] space-y-6">

                    {/* Canvas Top Bar (matches Tools, Pricing, Features, Sign up) */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                        {/* Brand & Mini Nav */}
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shadow-sm">
                                    <Sparkles size={14} />
                                </div>
                                <div>
                                    <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white block">
                                        Stellegent
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-medium hidden sm:block">
                                        Turn everyday knowledge into intelligence.
                                    </span>
                                </div>
                            </div>

                            <nav className="hidden sm:flex items-center space-x-5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <span className="text-slate-900 dark:text-white font-bold cursor-pointer">Tools</span>
                                <span className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Notes</span>
                                <span className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Diagrams</span>
                                <span className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Flashcards</span>
                            </nav>
                        </div>

                        {/* Top Right Action Pills */}
                        <div className="flex items-center space-x-2.5">
                            <button
                                onClick={onExploreDemo}
                                className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                            >
                                Try Sample Whiteboard
                            </button>
                            <button
                                onClick={onGetStarted}
                                className="px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-bold shadow-md shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-1.5"
                            >
                                <Camera size={13} />
                                <span>Open My Workspace</span>
                            </button>
                        </div>
                    </div>

                    {/* Breadcrumbs Sub-bar matching reference layout */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 dark:text-slate-500 py-1 gap-2">
                        <div className="flex items-center space-x-2 font-medium">
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">Workspace</span>
                            <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
                            <span>Multimodal Knowledge</span>
                            <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Fall 2026 Lectures</span>
                        </div>

                        <div className="flex items-center space-x-3 text-slate-400">
                            <Search size={14} className="hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" />
                            <Heart size={14} className="hover:text-rose-500 cursor-pointer" />
                            <Share2 size={14} className="hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" />
                        </div>
                    </div>

                    {/* 3x2 Grid of Luminous Cards matching the exact layout in the reference image */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">

                        {/* Card 1: Board Capture (Management) */}
                        <div
                            onClick={onGetStarted}
                            className="group relative rounded-2xl p-6 bg-gradient-to-b from-[#f3effe] via-[#f7f5ff] to-white dark:from-slate-850/80 dark:via-slate-850/40 dark:to-slate-900/60 border border-[#e4dcf9] dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[210px]"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                            <Camera size={16} />
                                        </div>
                                        <div className="w-4 h-4 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                            <Sparkles size={10} />
                                        </div>
                                    </div>
                                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 group-hover:border-purple-500 transition-colors" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        Board Capture
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Transforms classroom whiteboards and handwritten notebooks into high-precision OCR text.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full">
                                    ⚡ Instant OCR
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 group-hover:text-purple-600 flex items-center space-x-1">
                                    <span>Upload</span>
                                    <ArrowRight size={12} />
                                </span>
                            </div>
                        </div>

                        {/* Card 2: Structured Notes (Data Analytics) */}
                        <div
                            onClick={onGetStarted}
                            className="group relative rounded-2xl p-6 bg-gradient-to-b from-[#e8f3fc] via-[#f2f8fd] to-white dark:from-slate-850/80 dark:via-slate-850/40 dark:to-slate-900/60 border border-[#d2e6f7] dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-600/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[210px]"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                                            <BookOpen size={16} />
                                        </div>
                                        <div className="w-4 h-4 rounded-md bg-sky-500/10 text-sky-500 flex items-center justify-center">
                                            <CheckCircle2 size={10} />
                                        </div>
                                    </div>
                                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 group-hover:border-sky-500 transition-colors" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                        Structured Notes
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Three-tier separation: Board Verbatim, AI conceptual hierarchy, and supplementary context.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full">
                                    3-Tier Separation
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 group-hover:text-sky-600 flex items-center space-x-1">
                                    <span>Read Notes</span>
                                    <ArrowRight size={12} />
                                </span>
                            </div>
                        </div>

                        {/* Card 3: Flowcharts & Maps (CRM Automation) */}
                        <div
                            onClick={onGetStarted}
                            className="group relative rounded-2xl p-6 bg-gradient-to-b from-[#eef0fc] via-[#f5f7fd] to-white dark:from-slate-850/80 dark:via-slate-850/40 dark:to-slate-900/60 border border-[#d9dff8] dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[210px]"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                            <GitFork size={16} />
                                        </div>
                                        <div className="w-4 h-4 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                            <Workflow size={10} />
                                        </div>
                                    </div>
                                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 group-hover:border-indigo-500 transition-colors" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        Flowcharts & Maps
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Infers processes and dependencies to generate interactive, editable Mermaid flowcharts.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full">
                                    Live Diagrams
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 group-hover:text-indigo-600 flex items-center space-x-1">
                                    <span>Visualize</span>
                                    <ArrowRight size={12} />
                                </span>
                            </div>
                        </div>

                        {/* Card 4: Formula Derivations (Project) */}
                        <div
                            onClick={onGetStarted}
                            className="group relative rounded-2xl p-6 bg-gradient-to-b from-[#eaf6f0] via-[#f3faf6] to-white dark:from-slate-850/80 dark:via-slate-850/40 dark:to-slate-900/60 border border-[#d2ecde] dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[210px]"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                            <Calculator size={16} />
                                        </div>
                                        <div className="w-4 h-4 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                            <Cpu size={10} />
                                        </div>
                                    </div>
                                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 group-hover:border-emerald-500 transition-colors" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        Formula Engine
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Extracts clean LaTeX formulas, variable definitions, and step-by-step calculus proofs.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                                    LaTeX Math
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 flex items-center space-x-1">
                                    <span>Formulas</span>
                                    <ArrowRight size={12} />
                                </span>
                            </div>
                        </div>

                        {/* Card 5: Spaced Flashcards (Marketing) */}
                        <div
                            onClick={onGetStarted}
                            className="group relative rounded-2xl p-6 bg-gradient-to-b from-[#fef5ec] via-[#fef9f3] to-white dark:from-slate-850/80 dark:via-slate-850/40 dark:to-slate-900/60 border border-[#fbe5cc] dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-600/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[210px]"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                            <Brain size={16} />
                                        </div>
                                        <div className="w-4 h-4 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                            <Sparkles size={10} />
                                        </div>
                                    </div>
                                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 group-hover:border-amber-500 transition-colors" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        Active Recall Cards
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        3D flip flashcards for spaced repetition, quick self-testing, and exam review mastery.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full">
                                    Spaced Recall
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 group-hover:text-amber-600 flex items-center space-x-1">
                                    <span>Study</span>
                                    <ArrowRight size={12} />
                                </span>
                            </div>
                        </div>

                        {/* Card 6: Provenance & Grounding (Automation) */}
                        <div
                            onClick={onGetStarted}
                            className="group relative rounded-2xl p-6 bg-gradient-to-b from-[#eaf3f5] via-[#f2f8f9] to-white dark:from-slate-850/80 dark:via-slate-850/40 dark:to-slate-900/60 border border-[#d3e7ea] dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-600/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[210px]"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                                            <ShieldCheck size={16} />
                                        </div>
                                        <div className="w-4 h-4 rounded-md bg-teal-500/10 text-teal-500 flex items-center justify-center">
                                            <Compass size={10} />
                                        </div>
                                    </div>
                                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 group-hover:border-teal-500 transition-colors" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                        Board Provenance
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Dual-pane viewer linking every formula and note back to verified teacher chalkboard coordinates.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-100/70 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full">
                                    100% Grounded
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 group-hover:text-teal-600 flex items-center space-x-1">
                                    <span>Verify</span>
                                    <ArrowRight size={12} />
                                </span>
                            </div>
                        </div>

                    </div>

                    {/* Canvas Footer Bar matching bottom bar in reference image */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 gap-3">
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-semibold text-slate-600 dark:text-slate-300">Fast Local Mode Active</span>
                            <span>•</span>
                            <span>Zero API Credits Consumed</span>
                        </div>

                        <div className="flex items-center space-x-4">
                            <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Whiteboard OCR Engine</span>
                            <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Mermaid Graphs</span>
                            <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Source Citations</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
