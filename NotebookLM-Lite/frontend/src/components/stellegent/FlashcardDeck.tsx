import React, { useState } from 'react';
import { Flashcard, ReviewStatus } from '../../types/stellegent';
import { stellegentApi } from '../../services/stellegentApi';
import { Sparkles, CheckCircle2, RotateCcw, Brain, Check, X, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

interface FlashcardDeckProps {
    cards: Flashcard[];
    onCardUpdated?: (card: Flashcard) => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ cards, onCardUpdated }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const filteredCards = cards.filter((c) => {
        if (filterStatus === 'all') return true;
        return c.review_status === filterStatus;
    });

    const currentCard = filteredCards[currentIndex] || filteredCards[0];

    const handleFlip = () => setIsFlipped(!isFlipped);

    const handleNext = () => {
        setIsFlipped(false);
        setSelectedOption(null);
        setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setSelectedOption(null);
        setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
    };

    const handleUpdateStatus = async (status: ReviewStatus) => {
        if (!currentCard) return;
        try {
            const updated = await stellegentApi.updateFlashcard(currentCard.id, { review_status: status });
            currentCard.review_status = status;
            if (onCardUpdated) onCardUpdated(updated);
        } catch (err) {
            console.error('Update status failed:', err);
        }
    };

    if (filteredCards.length === 0) {
        return (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Brain size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-base font-semibold text-slate-600 dark:text-slate-300">No Flashcards in this category</p>
                <button
                    onClick={() => setFilterStatus('all')}
                    className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                    Show all flashcards
                </button>
            </div>
        );
    }

    const difficultyColors = {
        easy: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
        medium: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
        hard: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900',
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Filter Tabs and Counter */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                    <button
                        onClick={() => { setFilterStatus('all'); setCurrentIndex(0); }}
                        className={`px-3 py-1.5 rounded-lg transition-colors ${filterStatus === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        All ({cards.length})
                    </button>
                    <button
                        onClick={() => { setFilterStatus('needs_review'); setCurrentIndex(0); }}
                        className={`px-3 py-1.5 rounded-lg transition-colors ${filterStatus === 'needs_review' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Need Review ({cards.filter(c => c.review_status === 'needs_review').length})
                    </button>
                    <button
                        onClick={() => { setFilterStatus('mastered'); setCurrentIndex(0); }}
                        className={`px-3 py-1.5 rounded-lg transition-colors ${filterStatus === 'mastered' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Mastered ({cards.filter(c => c.review_status === 'mastered').length})
                    </button>
                </div>

                <span className="text-xs font-semibold text-slate-500">
                    Card {currentIndex + 1} of {filteredCards.length}
                </span>
            </div>

            {/* Interactive Flashcard / Quiz Box */}
            <div
                onClick={handleFlip}
                className="cursor-pointer min-h-[320px] rounded-2xl p-8 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-lg transition-all flex flex-col justify-between select-none relative"
            >
                {/* Card Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${difficultyColors[currentCard.difficulty]}`}>
                            {currentCard.difficulty}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {(currentCard.question_type || 'flashcard').replace('_', ' ')}
                        </span>

                    </div>

                    <span className="text-[11px] text-slate-400">Click card to reveal answer</span>
                </div>

                {/* Question & Options or Answer */}
                <div className="my-6">
                    {!isFlipped ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                                {currentCard.question}
                            </h3>

                            {/* Multiple choice options */}
                            {currentCard.question_type === 'multiple_choice' && currentCard.options.length > 0 && (
                                <div
                                    className="space-y-2 mt-4"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {currentCard.options.map((opt, oIdx) => {
                                        const isSelected = selectedOption === oIdx;
                                        const isCorrect = currentCard.correct_option_index === oIdx;
                                        let btnClass = 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';
                                        if (selectedOption !== null) {
                                            if (isCorrect) {
                                                btnClass = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold';
                                            } else if (isSelected) {
                                                btnClass = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300';
                                            }
                                        }

                                        return (
                                            <button
                                                key={oIdx}
                                                onClick={() => setSelectedOption(oIdx)}
                                                className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${btnClass}`}
                                            >
                                                <span>{opt}</span>
                                                {selectedOption !== null && isCorrect && <Check size={16} className="text-emerald-500" />}
                                                {selectedOption !== null && isSelected && !isCorrect && <X size={16} className="text-rose-500" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3 animate-in fade-in duration-200">
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                                Verified Answer
                            </span>
                            <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                                {currentCard.answer}
                            </p>
                            {currentCard.explanation && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-2">
                                    Why: {currentCard.explanation}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer / Provenance */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center space-x-1 text-slate-500">
                        <ShieldCheck size={14} className="text-indigo-500" />
                        <span>{currentCard.source_citation || 'Grounded in Whiteboard Notes'}</span>
                    </span>
                    <span className={`font-semibold uppercase text-[10px] ${currentCard.review_status === 'mastered' ? 'text-emerald-500' : currentCard.review_status === 'needs_review' ? 'text-amber-500' : 'text-slate-400'}`}>
                        Status: {currentCard.review_status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {/* Navigation & Review Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handlePrev}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Previous Card"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={handleNext}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Next Card"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handleUpdateStatus('needs_review')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${currentCard.review_status === 'needs_review' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'}`}
                    >
                        Need Review
                    </button>
                    <button
                        onClick={() => handleUpdateStatus('mastered')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${currentCard.review_status === 'mastered' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'}`}
                    >
                        Mark Mastered
                    </button>
                </div>
            </div>
        </div>
    );
};
