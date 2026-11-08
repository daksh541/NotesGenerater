import React, { useState } from 'react';
import { Camera, Sparkles, BookOpen, Layers, Check, ArrowRight } from 'lucide-react';

interface MobileOnboardingProps {
    isOpen: boolean;
    onComplete: () => void;
}

export const MobileOnboarding: React.FC<MobileOnboardingProps> = ({ isOpen, onComplete }) => {
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

    const slides = [
        {
            title: 'Capture Any Whiteboard',
            description: 'Snap quick photos of messy classroom whiteboards or handwritten lecture notes. Stellegent automatically fixes angles and boosts legibility.',
            icon: Camera,
            badge: 'Multimodal Vision',
            color: 'from-blue-600 to-indigo-600'
        },
        {
            title: 'Structured Notes & Flowcharts',
            description: 'AI extracts definitions, key formulas, and renders interactive Mermaid diagrams and mind maps directly from your photos.',
            icon: Layers,
            badge: 'Deep Synthesis',
            color: 'from-indigo-600 to-violet-600'
        },
        {
            title: 'Study Assistant & Flashcards',
            description: 'Ask questions with direct citations to original board photos, and master exam topics with spaced-repetition flashcards.',
            icon: Sparkles,
            badge: 'Ground-Truth Citations',
            color: 'from-violet-600 to-pink-600'
        }
    ];

    const currentSlide = slides[step];
    const SlideIcon = currentSlide.icon;

    const handleNext = () => {
        if (step < slides.length - 1) {
            setStep((s) => s + 1);
        } else {
            localStorage.setItem('stellegent_onboarding_done', 'true');
            onComplete();
        }
    };

    const handleSkip = () => {
        localStorage.setItem('stellegent_onboarding_done', 'true');
        onComplete();
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-6 safe-top safe-bottom text-white select-none animate-in fade-in duration-300">
            {/* Top Bar */}
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold tracking-wider uppercase text-indigo-400">
                    Welcome to Stellegent
                </span>
                <button
                    onClick={handleSkip}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1"
                >
                    Skip
                </button>
            </div>

            {/* Slide Hero Graphic & Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-sm mx-auto">
                <div
                    className={`w-32 h-32 rounded-3xl bg-gradient-to-tr ${currentSlide.color} flex items-center justify-center shadow-2xl shadow-indigo-500/20 transform transition-transform duration-300 scale-105`}
                >
                    <SlideIcon size={60} className="text-white" />
                </div>

                <div className="space-y-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold text-indigo-300">
                        {currentSlide.badge}
                    </span>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white">
                        {currentSlide.title}
                    </h2>
                    <p className="text-sm text-slate-300 leading-relaxed">
                        {currentSlide.description}
                    </p>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="space-y-6 max-w-sm mx-auto w-full">
                {/* Step Indicator Dots */}
                <div className="flex justify-center space-x-2">
                    {slides.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-2 rounded-full transition-all duration-300 ${
                                idx === step ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700'
                            }`}
                        />
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
                >
                    <span>{step === slides.length - 1 ? 'Start Learning' : 'Continue'}</span>
                    {step === slides.length - 1 ? <Check size={18} /> : <ArrowRight size={18} />}
                </button>
            </div>
        </div>
    );
};
