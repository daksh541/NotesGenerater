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
    MessageSquare,
    Reply,
    History,
    UserCheck,
    BookOpen,
    Sparkles,
    Calendar,
    Star,
    Clock,
} from 'lucide-react';
import {
    CommunityReview,
    ContributionHistoryItem,
    ContributorProfile,
    SectionVaultNote,
    UserProfile,
} from '../../types/lectra';
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
    const [activeTab, setActiveTab] = useState<'reviews' | 'profiles' | 'history'>('reviews');

    // Notes & Reviews state
    const [selectedNote, setSelectedNote] = useState<SectionVaultNote | null>(
        vaultNotes[0] || null
    );
    const [reviews, setReviews] = useState<CommunityReview[]>([]);
    const [newComment, setNewComment] = useState('');
    const [newRating, setNewRating] = useState(5);
    const [isSourceVerifiedCheck, setIsSourceVerifiedCheck] = useState(false);
    const [sourceCitation, setSourceCitation] = useState('');
    const [isInaccuracyReport, setIsInaccuracyReport] = useState(false);
    const [inaccuracyDetails, setInaccuracyDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reply state
    const [replyingToReviewId, setReplyingToReviewId] = useState<string | null>(null);
    const [replyComment, setReplyComment] = useState('');
    const [replySubmitting, setReplySubmitting] = useState(false);

    // Contributor Profiles state
    const [selectedProfileId, setSelectedProfileId] = useState<string>(userProfile.id);
    const [contributorProfile, setContributorProfile] = useState<ContributorProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Contribution History state
    const [historyItems, setHistoryItems] = useState<ContributionHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (!selectedNote && vaultNotes.length > 0) {
            setSelectedNote(vaultNotes[0]);
        }
    }, [vaultNotes, selectedNote]);

    const activeNote = selectedNote || vaultNotes[0];

    const fetchReviews = async () => {
        if (!activeNote) return;
        try {
            const data = await lectraApi.listReviews(activeNote.id);
            setReviews(data);
        } catch (err) {
            console.error('Failed to load reviews:', err);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [activeNote]);

    const fetchContributorProfile = async (uid: string) => {
        setLoadingProfile(true);
        try {
            const prof = await lectraApi.getContributorProfile(uid);
            setContributorProfile(prof);
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoadingProfile(false);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const hist = await lectraApi.getContributionHistory();
            setHistoryItems(hist);
        } catch (err) {
            console.error('Failed to load contribution history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'profiles') {
            fetchContributorProfile(selectedProfileId);
        } else if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab, selectedProfileId]);

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
                is_inaccuracy_report: isInaccuracyReport,
                inaccuracy_details: isInaccuracyReport ? inaccuracyDetails : undefined,
                verified_against_official_source: isSourceVerifiedCheck,
                official_source_citation: isSourceVerifiedCheck ? sourceCitation : undefined,
            });
            setReviews([res.review, ...reviews]);
            setNewComment('');
            setIsSourceVerifiedCheck(false);
            setSourceCitation('');
            setIsInaccuracyReport(false);
            setInaccuracyDetails('');
        } catch (err) {
            console.error('Failed to post review:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePostReply = async (reviewId: string) => {
        if (!replyComment.trim()) return;
        setReplySubmitting(true);
        try {
            const res = await lectraApi.replyToReview(reviewId, {
                user_id: userProfile.id,
                user_name: userProfile.full_name,
                user_section: userProfile.section,
                comment: replyComment,
            });
            setReviews((prev) =>
                prev.map((r) => (r.id === reviewId ? res.review : r))
            );
            setReplyingToReviewId(null);
            setReplyComment('');
        } catch (err) {
            console.error('Failed to reply:', err);
        } finally {
            setReplySubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-16 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5 dark:border-slate-800 gap-4">
                <div>
                    <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <Users size={15} />
                        <span>Academic Peer Review & Verification Network</span>
                    </div>
                    <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                        Academic Collaboration
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Audit mathematical derivations, post cross-section peer reviews, and review contributor trust badges across Sections A through I.
                    </p>
                </div>

                {/* Sub-view navigation tabs */}
                <div className="flex items-center space-x-1 rounded-xl border border-slate-200/90 bg-white p-1 shadow-saas dark:border-slate-800 dark:bg-slate-900">
                    <button
                        type="button"
                        onClick={() => setActiveTab('reviews')}
                        className={`inline-flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            activeTab === 'reviews'
                                ? 'bg-[#0B132B] text-white dark:bg-indigo-600'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                    >
                        <MessageSquare size={13} />
                        <span>Peer Reviews</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('profiles')}
                        className={`inline-flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            activeTab === 'profiles'
                                ? 'bg-[#0B132B] text-white dark:bg-indigo-600'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Award size={13} />
                        <span>Contributor Profiles</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`inline-flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            activeTab === 'history'
                                ? 'bg-[#0B132B] text-white dark:bg-indigo-600'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                    >
                        <History size={13} />
                        <span>Contribution History</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: PEER REVIEWS */}
            {activeTab === 'reviews' && (
                <div className="space-y-6">
                    {/* Verification Tiers Overview */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                            <div className="flex items-center space-x-2 font-bold text-emerald-800 dark:text-emerald-300 text-xs">
                                <CheckCircle2 size={15} className="text-emerald-600" />
                                <span>Source Verified Status</span>
                            </div>
                            <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                                Requires explicit verification against textbook references, published papers, or official instructor syllabi.
                            </p>
                        </div>

                        <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                            <div className="flex items-center space-x-2 font-bold text-indigo-900 dark:text-indigo-300 text-xs">
                                <ShieldCheck size={15} className="text-indigo-600" />
                                <span>Community Reviewed Status</span>
                            </div>
                            <p className="mt-1 text-[11px] text-indigo-800 dark:text-indigo-400 leading-relaxed">
                                Audited by peers across multiple classroom sections with confirmed equation correctness and 3+ upvotes.
                            </p>
                        </div>

                        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                            <div className="flex items-center space-x-2 font-bold text-amber-800 dark:text-amber-300 text-xs">
                                <AlertCircle size={15} className="text-amber-600" />
                                <span>Unverified Status</span>
                            </div>
                            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                Newly shared classroom notes awaiting peer verification and reference grounding.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                        {/* Left 5 Cols: Notes Queue */}
                        <div className="space-y-2.5 lg:col-span-5">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Shared Notes Across Sections A–I ({vaultNotes.length})
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
                                                {note.upvotes}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Right 7 Cols: Active Note Review & Verification Thread */}
                        {activeNote && (
                            <div className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-saas lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
                                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                            Section {activeNote.section} Master Note Audit
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onViewNote(activeNote.lecture_id)}
                                            className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                                        >
                                            <span>Open Studio</span>
                                            <ExternalLink size={12} />
                                        </button>
                                    </div>
                                    <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                                        {activeNote.title}
                                    </h3>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {activeNote.subject_code} • {activeNote.chapter} • Prof. {activeNote.professor}
                                    </p>
                                </div>

                                {/* Review Submission Box */}
                                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/40">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            Submit Peer Review & Verification
                                        </span>
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
                                        placeholder="Confirm proof accuracy, compare against your section's whiteboard, or note nuances..."
                                        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />

                                    {/* Verification against official source option */}
                                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-2 dark:border-slate-700 dark:bg-slate-900 text-xs">
                                        <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={isSourceVerifiedCheck}
                                                onChange={(e) => setIsSourceVerifiedCheck(e.target.checked)}
                                                className="rounded text-indigo-600"
                                            />
                                            <span className="flex items-center gap-1">
                                                <ShieldCheck size={14} className="text-emerald-600" />
                                                <strong>Verify against official academic source</strong> (grants Source Verified badge)
                                            </span>
                                        </label>
                                        {isSourceVerifiedCheck && (
                                            <input
                                                type="text"
                                                value={sourceCitation}
                                                onChange={(e) => setSourceCitation(e.target.value)}
                                                placeholder="Enter textbook / paper reference (e.g. Tanenbaum & Van Steen Ch 8, p. 342)"
                                                className="w-full rounded border border-slate-200 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                                            />
                                        )}
                                    </div>

                                    {/* Flag inaccuracy toggle */}
                                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-2 dark:border-slate-700 dark:bg-slate-900 text-xs">
                                        <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={isInaccuracyReport}
                                                onChange={(e) => setIsInaccuracyReport(e.target.checked)}
                                                className="rounded text-rose-600"
                                            />
                                            <span className="flex items-center gap-1 text-rose-600">
                                                <AlertCircle size={14} />
                                                <strong>Flag equation or pedagogical inaccuracy</strong>
                                            </span>
                                        </label>
                                        {isInaccuracyReport && (
                                            <input
                                                type="text"
                                                value={inaccuracyDetails}
                                                onChange={(e) => setInaccuracyDetails(e.target.value)}
                                                placeholder="Describe the inaccurate equation, step, or citation..."
                                                className="w-full rounded border border-rose-200 p-1.5 text-xs dark:border-rose-900 dark:bg-slate-800"
                                            />
                                        )}
                                    </div>

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

                                {/* Reviews List with Replies Thread */}
                                <div className="space-y-4">
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
                                                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3"
                                            >
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {r.user_name}
                                                        </span>
                                                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                            Section {r.user_section}
                                                        </span>
                                                        {r.verified_against_official_source && (
                                                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                                                                <CheckCircle2 size={10} />
                                                                Source Verified
                                                            </span>
                                                        )}
                                                        {r.is_inaccuracy_report && (
                                                            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                                                                <AlertCircle size={10} />
                                                                Correction Flagged
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-amber-500 font-bold">
                                                        {'★'.repeat(r.rating)}
                                                    </div>
                                                </div>

                                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                                    {r.comment}
                                                </p>

                                                {r.official_source_citation && (
                                                    <div className="rounded bg-emerald-50 p-2 text-[11px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60">
                                                        <strong>Official Citation:</strong> {r.official_source_citation}
                                                    </div>
                                                )}

                                                {/* Replies Thread */}
                                                {r.replies && r.replies.length > 0 && (
                                                    <div className="ml-4 space-y-2 border-l-2 border-indigo-200 pl-3 dark:border-indigo-900">
                                                        {r.replies.map((reply) => (
                                                            <div key={reply.id} className="text-xs text-slate-600 dark:text-slate-400">
                                                                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                                                    <span>{reply.user_name}</span>
                                                                    <span className="rounded bg-slate-200 px-1 text-[9px] text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                                                        Sec {reply.user_section}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 font-normal">
                                                                        {reply.created_at ? reply.created_at.slice(0, 10) : ''}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                                                                    {reply.comment}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Inline Reply Form */}
                                                <div className="pt-1 flex items-center justify-between text-xs">
                                                    {replyingToReviewId === r.id ? (
                                                        <div className="w-full space-y-2 mt-1">
                                                            <input
                                                                type="text"
                                                                value={replyComment}
                                                                onChange={(e) => setReplyComment(e.target.value)}
                                                                placeholder="Write a peer reply or clarification..."
                                                                className="w-full rounded border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                                                            />
                                                            <div className="flex justify-end gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setReplyingToReviewId(null)}
                                                                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handlePostReply(r.id)}
                                                                    disabled={replySubmitting || !replyComment.trim()}
                                                                    className="rounded bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                                                                >
                                                                    {replySubmitting ? 'Posting...' : 'Reply'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setReplyingToReviewId(r.id)}
                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                                        >
                                                            <Reply size={12} />
                                                            <span>Reply</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: CONTRIBUTOR PROFILES & BADGES */}
            {activeTab === 'profiles' && (
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-bold text-slate-500 mr-2">Select Student Contributor:</span>
                        {[
                            { id: userProfile.id, name: `${userProfile.full_name} (You)` },
                            { id: 'usr_student_f', name: 'Maya Lin (Sec F)' },
                            { id: 'usr_lectra_default', name: 'Alex Rivera (Sec A)' },
                            { id: 'usr_student_b', name: 'Marcus Brody (Sec B)' },
                        ].map((stu) => (
                            <button
                                key={stu.id}
                                type="button"
                                onClick={() => setSelectedProfileId(stu.id)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    selectedProfileId === stu.id
                                        ? 'bg-[#0B132B] text-white dark:bg-indigo-600'
                                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                                }`}
                            >
                                {stu.name}
                            </button>
                        ))}
                    </div>

                    {loadingProfile ? (
                        <div className="py-12 text-center text-xs text-slate-400">Loading contributor credentials...</div>
                    ) : contributorProfile ? (
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
                                <div className="flex items-center space-x-3.5">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                        {contributorProfile.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                                {contributorProfile.full_name}
                                            </h3>
                                            <span className="rounded bg-[#0B132B] px-2 py-0.5 text-xs font-bold text-white dark:bg-indigo-600">
                                                Section {contributorProfile.section}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {contributorProfile.bio || 'Stanford Academic Contributor'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-center rounded-xl bg-slate-50 px-4 py-2 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                        <span className="block text-[10px] font-bold uppercase text-slate-400">Reputation</span>
                                        <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                                            {contributorProfile.reputation_score}
                                        </span>
                                    </div>
                                    <div className="text-center rounded-xl bg-slate-50 px-4 py-2 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                        <span className="block text-[10px] font-bold uppercase text-slate-400">Upvotes</span>
                                        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                            {contributorProfile.total_upvotes_received}
                                        </span>
                                    </div>
                                    <div className="text-center rounded-xl bg-slate-50 px-4 py-2 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                        <span className="block text-[10px] font-bold uppercase text-slate-400">Verified</span>
                                        <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                                            {contributorProfile.verified_contributions} / {contributorProfile.total_contributions}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Badges */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                                    <Award size={15} className="text-amber-500" />
                                    <span>Earned Academic Badges & Recognitions</span>
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {contributorProfile.badges.map((b, idx) => (
                                        <span
                                            key={idx}
                                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-1.5"
                                        >
                                            <Sparkles size={12} className="text-amber-500" />
                                            {b}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* TAB 3: CONTRIBUTION HISTORY AUDIT LOG */}
            {activeTab === 'history' && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-saas dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                        <div className="flex items-center space-x-2">
                            <History size={16} className="text-indigo-600" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Academic Contribution Audit Trail
                            </h3>
                        </div>
                        <span className="text-xs text-slate-400">
                            Immutable cross-section submission logs
                        </span>
                    </div>

                    {loadingHistory ? (
                        <div className="py-8 text-center text-xs text-slate-400">Loading audit history...</div>
                    ) : historyItems.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">No contribution events recorded yet.</p>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {historyItems.map((item) => (
                                <div key={item.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {item.user_name}
                                            </span>
                                            <span className="rounded bg-[#0B132B] px-1.5 py-0.5 text-[9px] font-bold text-white dark:bg-indigo-600">
                                                Sec {item.section}
                                            </span>
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                {item.action.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                                            {item.target_title}
                                        </div>
                                        <p className="text-slate-500 text-[11px]">
                                            {item.details}
                                        </p>
                                    </div>
                                    <div className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                                        <Clock size={10} />
                                        <span>{item.created_at ? item.created_at.slice(0, 16).replace('T', ' ') : ''}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
