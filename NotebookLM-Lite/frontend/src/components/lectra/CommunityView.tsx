import React, { useState, useEffect } from 'react';
import {
    Users,
    ShieldCheck,
    ThumbsUp,
    AlertCircle,
    CheckCircle2,
    Send,
    Award,
    ExternalLink,
} from 'lucide-react';
import { CommunityReview, SectionVaultNote, UserProfile } from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';

interface CommunityViewProps {
    vaultNotes: SectionVaultNote[];
    userProfile: UserProfile;
    onViewNote: (lectureId: string) => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
    vaultNotes,
    userProfile,
    onViewNote,
}) => {
    const [selectedNote, setSelectedNote] = useState<SectionVaultNote | null>(
        vaultNotes[0] || null
    );
    const [reviews, setReviews] = useState<CommunityReview[]>([]);
    const [newComment, setNewComment] = useState('');
    const [newRating, setNewRating] = useState(5);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!selectedNote && vaultNotes.length > 0) {
            setSelectedNote(vaultNotes[0]);
        }
    }, [vaultNotes, selectedNote]);

    const activeNote = selectedNote || vaultNotes[0];

    useEffect(() => {
        if (activeNote) {
            lectraApi.listReviews(activeNote.id).then(setReviews).catch(console.error);
        }
    }, [activeNote]);

    const handlePostReview = async () => {
        if (!newComment.trim() || !activeNote) return;
        setSubmitting(true);
        try {
            const res = await lectraApi.submitReview({
                vault_note_id: activeNote.id,
                user_id: userProfile.id,
                user_name: userProfile.full_name,
                user_section: userProfile.section,
                rating: newRating,
                comment: newComment,
            });
            setReviews([res.review, ...reviews]);
            setNewComment('');
        } catch (err) {
            console.error('Failed to post review:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-16 animate-fade-in">
            {/* Header */}
            <div className="border-b border-slate-200/80 pb-5 dark:border-slate-800">
                <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <Users size={15} />
                    <span>Cross-Section Peer Review & Verification</span>
                </div>
                <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                    Academic Community
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                    Collaborate with students across Sections A through I, audit mathematical proofs, and verify shared notes.
                </p>
            </div>

            {/* Verification Tiers Overview */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <div className="flex items-center space-x-2 font-bold text-emerald-800 dark:text-emerald-300 text-xs">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        <span>Source Verified</span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                        Classroom board derivations cross-verified against official textbook references and instructor syllabi.
                    </p>
                </div>

                <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                    <div className="flex items-center space-x-2 font-bold text-indigo-900 dark:text-indigo-300 text-xs">
                        <ShieldCheck size={15} className="text-indigo-600" />
                        <span>Community Reviewed</span>
                    </div>
                    <p className="mt-1 text-[11px] text-indigo-800 dark:text-indigo-400 leading-relaxed">
                        Audited by peers across multiple classroom sections with confirmed equation accuracy.
                    </p>
                </div>

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <div className="flex items-center space-x-2 font-bold text-amber-800 dark:text-amber-300 text-xs">
                        <AlertCircle size={15} className="text-amber-600" />
                        <span>Unverified Notes</span>
                    </div>
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                        Newly uploaded classroom notes awaiting peer review and reference grounding.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                {/* Left 5 Cols: Notes Queue */}
                <div className="space-y-2.5 lg:col-span-5">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Shared Notes Across Sections A–I
                        </span>
                        <Award size={13} className="text-indigo-600" />
                    </div>
                    {vaultNotes.map((note) => {
                        const isSelected = activeNote?.id === note.id;
                        return (
                            <div
                                key={note.id}
                                onClick={() => setSelectedNote(note)}
                                className={`cursor-pointer rounded-xl border p-4 transition ${
                                    isSelected
                                        ? 'border-indigo-600 bg-indigo-50/40 shadow-saas dark:border-indigo-500 dark:bg-indigo-950/30'
                                        : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                                }`}
                            >
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                                        {note.title}
                                    </span>
                                    <span className="rounded bg-[#0B132B] px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-indigo-600">
                                        Sec {note.section}
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                    {note.subject_code} • {note.chapter}
                                </div>
                                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>By {note.contributor_name}</span>
                                    <span className="inline-flex items-center text-indigo-600 dark:text-indigo-400 font-semibold">
                                        <ThumbsUp size={11} className="mr-1" />
                                        {note.upvotes} upvotes
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right 7 Cols: Peer Reviews & Verification Thread */}
                {activeNote && (
                    <div className="space-y-6 lg:col-span-7">
                        <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-indigo-600">
                                        Peer Audit Thread • Section {activeNote.section}
                                    </span>
                                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-white mt-0.5">
                                        {activeNote.title}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onViewNote(activeNote.lecture_id)}
                                    className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0B132B] hover:bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition dark:bg-indigo-600"
                                >
                                    <ExternalLink size={13} />
                                    <span>Open Master Note</span>
                                </button>
                            </div>

                            {/* Post Review Form */}
                            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                        Submit Peer Review ({userProfile.full_name} • Sec {userProfile.section})
                                    </h4>
                                    <div className="flex items-center space-x-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setNewRating(star)}
                                                className={`text-sm ${
                                                    star <= newRating ? 'text-amber-500' : 'text-slate-300'
                                                }`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    rows={3}
                                    placeholder="Confirm proof accuracy or add context from your classroom section..."
                                    className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handlePostReview}
                                        disabled={submitting || !newComment.trim()}
                                        className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0B132B] hover:bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 dark:bg-indigo-600"
                                    >
                                        <Send size={12} />
                                        <span>{submitting ? 'Submitting...' : 'Post Peer Review'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Reviews List */}
                            <div className="space-y-3">
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Verified Peer Reviews ({reviews.length})
                                </h4>
                                {reviews.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-4 text-center">
                                        No peer reviews yet. Be the first from Section {userProfile.section} to verify this note.
                                    </p>
                                ) : (
                                    reviews.map((r) => (
                                        <div
                                            key={r.id}
                                            className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                                        >
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {r.user_name}
                                                    </span>
                                                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                        Section {r.user_section}
                                                    </span>
                                                </div>
                                                <div className="text-amber-500 font-bold">
                                                    {'★'.repeat(r.rating)}
                                                </div>
                                            </div>
                                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                                {r.comment}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
