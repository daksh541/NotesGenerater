import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles,
    Send,
    Plus,
    FileText,
    Image as ImageIcon,
    FileSpreadsheet,
    BookOpen,
    Check,
    CheckSquare,
    Square,
    Copy,
    RefreshCw,
    Trash2,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Play,
    Pause,
    ThumbsUp,
    ThumbsDown,
    Sliders,
    Layers,
    X,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
    UploadCloud,
    HelpCircle,
    ArrowUp,
    Bookmark,
    GraduationCap,
    Lightbulb,
    Award,
    Edit3,
    Video,
    Presentation,
    Network,
    Table,
    BarChart3,
    FileSpreadsheet as SheetIcon,
} from 'lucide-react';
import {
    ChatConversation,
    ChatMessage,
    MasterNoteContent,
    SectionId,
    SubjectModel,
    UploadedSourceItem,
    UserProfile,
} from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';

interface NotebookChatViewProps {
    currentSubject: SubjectModel | null;
    userProfile: UserProfile;
    activeMasterNote: MasterNoteContent | null;
    recentNotes: MasterNoteContent[];
    uploadHistory: UploadedSourceItem[];
    currentSection: SectionId;
    onOpenStudio: () => void;
    onOpenMasterNote: (note: MasterNoteContent) => void;
    onOpenStudyKit: (lectureId?: string) => void;
    onOpenVault: () => void;
    initialPrompt?: string;
    onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const NotebookChatView: React.FC<NotebookChatViewProps> = ({
    currentSubject,
    userProfile,
    activeMasterNote,
    recentNotes = [],
    uploadHistory = [],
    currentSection,
    onOpenStudio,
    onOpenMasterNote,
    onOpenStudyKit,
    onOpenVault,
    initialPrompt,
    onNotify,
}) => {
    // Conversations State
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [showConvDropdown, setShowConvDropdown] = useState(false);

    // Panels toggles (NotebookLM 3-panel layout)
    const [sourcesPanelOpen, setSourcesPanelOpen] = useState(true);
    const [studioPanelOpen, setStudioPanelOpen] = useState(true);

    // Message Input State
    const [inputQuery, setInputQuery] = useState(initialPrompt || '');
    const [isSending, setIsSending] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [activeCitationPopover, setActiveCitationPopover] = useState<{
        source_name: string;
        quote: string;
        page_or_region: string;
        source_type: string;
    } | null>(null);

    // Audio Overview Player Preview State
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [audioProgress, setAudioProgress] = useState(42);

    // Selected Sources State (IDs of sources included in chat context)
    const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
    const [searchSourcesQuery, setSearchSourcesQuery] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load conversations from backend
    useEffect(() => {
        const loadConvs = async () => {
            setLoadingConversations(true);
            try {
                const list = await lectraApi.listChatConversations();
                setConversations(list);
                if (list.length > 0) {
                    const full = await lectraApi.getChatConversation(list[0].id);
                    setActiveConversation(full);
                    setSelectedSourceIds(full.selected_source_ids || []);
                }
            } catch (err) {
                console.error('Failed to load chat conversations:', err);
            } finally {
                setLoadingConversations(false);
            }
        };
        loadConvs();
    }, []);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeConversation?.messages]);

    // Handle initial prompt
    useEffect(() => {
        if (initialPrompt && initialPrompt.trim()) {
            setInputQuery(initialPrompt);
        }
    }, [initialPrompt]);

    // Unified sources list (Uploaded files + Master Notes)
    const availableSources = [
        ...uploadHistory.map((u) => ({
            id: u.id,
            title: u.file_name || u.original_filename || 'Uploaded Document',
            type: u.file_type || (u.original_filename?.endsWith('.pdf') ? 'pdf' : 'whiteboard'),
            snippet: u.extracted_text_snippet || 'Classroom source material',
            isNote: false,
        })),
        ...recentNotes.map((n) => ({
            id: n.id,
            title: `Master Note: ${n.chapter || n.title}`,
            type: 'master_note',
            snippet: n.summary,
            isNote: true,
            lecture_id: n.lecture_id,
        })),
    ];

    // Default select first 3 sources if none selected
    useEffect(() => {
        if (selectedSourceIds.length === 0 && availableSources.length > 0) {
            setSelectedSourceIds(availableSources.slice(0, 3).map((s) => s.id));
        }
    }, [availableSources.length]);

    const filteredSources = availableSources.filter((s) =>
        s.title.toLowerCase().includes(searchSourcesQuery.toLowerCase())
    );

    const toggleSourceSelection = (sourceId: string) => {
        setSelectedSourceIds((prev) =>
            prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
        );
    };

    const selectAllSources = () => {
        if (selectedSourceIds.length === availableSources.length) {
            setSelectedSourceIds([]);
        } else {
            setSelectedSourceIds(availableSources.map((s) => s.id));
        }
    };

    const handleCreateNewChat = async () => {
        try {
            const title = currentSubject
                ? `${currentSubject.code}: Academic Discussion`
                : 'Untitled Notebook Chat';
            const newConv = await lectraApi.createChatConversation({
                title,
                subject_code: currentSubject?.code,
                lecture_id: activeMasterNote?.lecture_id,
                selected_source_ids: selectedSourceIds,
            });
            setConversations((prev) => [newConv, ...prev]);
            setActiveConversation(newConv);
            setShowConvDropdown(false);
            if (onNotify) onNotify('Started new Notebook conversation.', 'success');
        } catch (err) {
            console.error('Failed to create new conversation:', err);
        }
    };

    const handleSelectConversation = async (convId: string) => {
        try {
            const full = await lectraApi.getChatConversation(convId);
            setActiveConversation(full);
            setSelectedSourceIds(full.selected_source_ids || []);
            setShowConvDropdown(false);
        } catch (err) {
            console.error('Failed to select conversation:', err);
        }
    };

    const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await lectraApi.deleteChatConversation(convId);
            const remaining = conversations.filter((c) => c.id !== convId);
            setConversations(remaining);
            if (activeConversation?.id === convId) {
                if (remaining.length > 0) {
                    handleSelectConversation(remaining[0].id);
                } else {
                    setActiveConversation(null);
                }
            }
            if (onNotify) onNotify('Conversation deleted.', 'info');
        } catch (err) {
            console.error('Failed to delete conversation:', err);
        }
    };

    const handleSendMessage = async (textToSend?: string) => {
        const text = (textToSend || inputQuery).trim();
        if (!text || isSending) return;

        setInputQuery('');
        setIsSending(true);

        try {
            let conv = activeConversation;
            if (!conv) {
                conv = await lectraApi.createChatConversation({
                    title: text.slice(0, 35) + '...',
                    subject_code: currentSubject?.code,
                    lecture_id: activeMasterNote?.lecture_id,
                    selected_source_ids: selectedSourceIds,
                });
                setConversations((prev) => [conv!, ...prev]);
                setActiveConversation(conv);
            }

            const res = await lectraApi.sendChatMessage(
                conv.id,
                text,
                selectedSourceIds,
                activeMasterNote?.lecture_id
            );

            setActiveConversation(res.conversation);
            setConversations((prev) =>
                prev.map((c) => (c.id === res.conversation.id ? res.conversation : c))
            );
        } catch (err: any) {
            const errorMsg = err?.response?.data?.detail || 'Failed to get response from AI assistant.';
            if (onNotify) onNotify(errorMsg, 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const copyMessageContent = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const getSourceIcon = (type: string) => {
        if (type.includes('pdf')) return <FileText size={15} className="text-rose-500 shrink-0" />;
        if (type.includes('image') || type.includes('whiteboard') || type.includes('jpg') || type.includes('png'))
            return <ImageIcon size={15} className="text-blue-500 shrink-0" />;
        if (type.includes('ppt') || type.includes('slide'))
            return <FileSpreadsheet size={15} className="text-amber-500 shrink-0" />;
        return <BookOpen size={15} className="text-indigo-500 shrink-0" />;
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[#F8FAFD] dark:bg-[#131314] text-slate-800 dark:text-slate-200">
            {/* Citation Detail Popover Modal */}
            {activeCitationPopover && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-fade-in space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                            <div className="flex items-center space-x-2">
                                <Bookmark size={15} className="text-indigo-600 dark:text-indigo-400" />
                                <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                    Source Grounding Citation
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveCitationPopover(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X size={15} />
                            </button>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {activeCitationPopover.source_name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                                {activeCitationPopover.source_type} • {activeCitationPopover.page_or_region}
                            </div>
                        </div>
                        <blockquote className="rounded-xl bg-slate-50 p-3 text-xs italic text-slate-700 border-l-3 border-indigo-600 dark:bg-slate-800/60 dark:text-slate-300">
                            &ldquo;{activeCitationPopover.quote}&rdquo;
                        </blockquote>
                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => setActiveCitationPopover(null)}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                            >
                                Close Citation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 1. LEFT PANEL: SOURCES                                         */}
            {/* ------------------------------------------------------------- */}
            <div
                className={`relative flex flex-col border-r border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-[#1E1F20]/90 transition-all duration-200 shrink-0 ${
                    sourcesPanelOpen ? 'w-72 lg:w-80' : 'w-0 overflow-hidden border-r-0'
                }`}
            >
                {/* Panel Header */}
                <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                            Sources
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {selectedSourceIds.length} of {availableSources.length} selected
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setSourcesPanelOpen(false)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Collapse Sources Panel"
                    >
                        <PanelLeftClose size={16} />
                    </button>
                </div>

                {/* Meet the new notes callout */}
                <div className="p-3">
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs dark:border-indigo-950 dark:bg-indigo-950/30">
                        <div className="flex items-center justify-between font-semibold text-indigo-900 dark:text-indigo-200 text-[11px]">
                            <span>Grounded Classroom Context</span>
                            <Sparkles size={12} className="text-indigo-600" />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            Select which whiteboards, textbook PDFs, or Master Notes the AI should cite when answering.
                        </p>
                    </div>

                    {/* Action Buttons: Add Sources & Create Note */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={onOpenStudio}
                            className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                        >
                            <Plus size={13} />
                            <span>Add source</span>
                        </button>
                        <button
                            type="button"
                            onClick={onOpenStudio}
                            className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                        >
                            <Edit3 size={13} />
                            <span>Create note</span>
                        </button>
                    </div>

                    {/* Quick Search Sources */}
                    <div className="mt-3 flex items-center justify-between text-[11px] px-1 text-slate-500">
                        <span>Select all sources</span>
                        <button
                            type="button"
                            onClick={selectAllSources}
                            className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                            {selectedSourceIds.length === availableSources.length ? 'Deselect all' : 'Select all'}
                        </button>
                    </div>
                </div>

                {/* Source Items List */}
                <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
                    {filteredSources.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                            No sources uploaded yet. Click <strong>Add source</strong> to stage whiteboard photos or PDFs.
                        </div>
                    ) : (
                        filteredSources.map((src) => {
                            const isSelected = selectedSourceIds.includes(src.id);
                            return (
                                <div
                                    key={src.id}
                                    onClick={() => toggleSourceSelection(src.id)}
                                    className={`group flex items-start space-x-2.5 rounded-xl border p-2.5 transition cursor-pointer ${
                                        isSelected
                                            ? 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/60 dark:bg-indigo-950/30'
                                            : 'border-slate-200/70 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        className="mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0"
                                    >
                                        {isSelected ? (
                                            <CheckSquare size={15} />
                                        ) : (
                                            <Square size={15} className="text-slate-300 dark:text-slate-600" />
                                        )}
                                    </button>

                                    <div className="mt-0.5">{getSourceIcon(src.type)}</div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                            {src.title}
                                        </p>
                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                            {src.snippet}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Expand Sources Button (when collapsed) */}
            {!sourcesPanelOpen && (
                <button
                    type="button"
                    onClick={() => setSourcesPanelOpen(true)}
                    className="absolute left-2 top-20 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-md hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    title="Open Sources Panel"
                >
                    <PanelLeftOpen size={16} />
                </button>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2. CENTER PANEL: CONVERSATION WORKSPACE                       */}
            {/* ------------------------------------------------------------- */}
            <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden relative">
                {/* Conversation Header Bar */}
                <div className="flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-[#131314]/80 shrink-0">
                    <div className="relative flex items-center space-x-2 min-w-0">
                        <button
                            type="button"
                            onClick={() => setShowConvDropdown(!showConvDropdown)}
                            className="flex items-center space-x-2 text-left rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-0"
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 shrink-0">
                                <Sparkles size={14} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center space-x-1.5">
                                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                                        {activeConversation?.title || 'Academic Notebook Chat'}
                                    </span>
                                    <ChevronDown size={13} className="text-slate-400 shrink-0" />
                                </div>
                                <span className="text-[10px] text-slate-400 block truncate">
                                    {selectedSourceIds.length} sources active in context
                                </span>
                            </div>
                        </button>

                        {/* Conversation Switcher Dropdown */}
                        {showConvDropdown && (
                            <div className="absolute left-0 top-12 mt-1 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-fade-in">
                                <button
                                    type="button"
                                    onClick={handleCreateNewChat}
                                    className="flex w-full items-center space-x-2 rounded-xl bg-indigo-600 p-2 text-xs font-semibold text-white hover:bg-indigo-500 transition mb-2"
                                >
                                    <Plus size={14} />
                                    <span>New Notebook Chat</span>
                                </button>

                                <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                                    Past Discussions ({conversations.length})
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-1">
                                    {conversations.map((c) => (
                                        <div
                                            key={c.id}
                                            onClick={() => handleSelectConversation(c.id)}
                                            className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition cursor-pointer ${
                                                activeConversation?.id === c.id
                                                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950 dark:text-indigo-300'
                                                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <span className="truncate pr-2">{c.title}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteConversation(c.id, e)}
                                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                                                title="Delete discussion"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Toolbar Actions */}
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={handleCreateNewChat}
                            className="hidden sm:inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 shadow-2xs"
                        >
                            <Plus size={13} />
                            <span>New Chat</span>
                        </button>

                        {!studioPanelOpen && (
                            <button
                                type="button"
                                onClick={() => setStudioPanelOpen(true)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Open Studio Panel"
                            >
                                <PanelRightOpen size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
                    {/* Welcome Card when conversation is empty */}
                    {(!activeConversation?.messages || activeConversation.messages.length === 0) && (
                        <div className="max-w-2xl mx-auto py-8 text-center space-y-4 animate-fade-in">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mx-auto shadow-sm">
                                <Sparkles size={26} />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Welcome to LECTRA Notebook Chat
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                                Ask about formulas, whiteboard proofs, or textbook chapters. Every answer is grounded directly in your selected course materials with verifiable citations.
                            </p>

                            {/* Suggested Prompt Chips */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto pt-2 text-left">
                                {[
                                    'Explain the Raft consensus quorum formula step by step',
                                    'Summarize the key invariants from the whiteboard',
                                    'Compare Section A lecture notes with official textbook',
                                    'Generate 3 practice exam questions from this chapter',
                                ].map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSendMessage(prompt)}
                                        className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 hover:border-indigo-400 hover:shadow-xs transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                    >
                                        <div className="font-semibold">{prompt}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages List */}
                    {activeConversation?.messages?.map((msg, idx) => {
                        const isUser = msg.role === 'user';
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                            >
                                <div
                                    className={`max-w-2xl rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed transition ${
                                        isUser
                                            ? 'bg-indigo-600 text-white rounded-br-none shadow-xs'
                                            : 'bg-white text-slate-800 border border-slate-200/80 shadow-2xs dark:bg-[#1E1F20] dark:border-slate-800 dark:text-slate-100 rounded-bl-none'
                                    }`}
                                >
                                    <div className="whitespace-pre-line">{msg.content}</div>

                                    {/* Grounded Clickable Citations */}
                                    {!isUser && msg.citations && msg.citations.length > 0 && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                                                Citations:
                                            </span>
                                            {msg.citations.map((c, cIdx) => (
                                                <button
                                                    key={cIdx}
                                                    type="button"
                                                    onClick={() => setActiveCitationPopover(c)}
                                                    className="inline-flex items-center space-x-1 rounded-md bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-300 transition"
                                                >
                                                    <span>[{cIdx + 1}]</span>
                                                    <span className="truncate max-w-[140px]">{c.source_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Message Footer: Copy & Feedback */}
                                    {!isUser && (
                                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => copyMessageContent(msg.content, idx)}
                                                    className="flex items-center space-x-1 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                                >
                                                    {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
                                                    <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                                                </button>
                                            </div>

                                            <span className="text-[10px]">
                                                {new Date(msg.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Suggested Follow-up Questions Chips */}
                                {!isUser && msg.suggested_questions && msg.suggested_questions.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1 max-w-2xl">
                                        {msg.suggested_questions.map((q, qIdx) => (
                                            <button
                                                key={qIdx}
                                                type="button"
                                                onClick={() => handleSendMessage(q)}
                                                className="inline-flex items-center space-x-1 rounded-full border border-slate-200 bg-white/80 hover:bg-white hover:border-indigo-300 px-3 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition shadow-2xs"
                                            >
                                                <Lightbulb size={11} className="text-amber-500" />
                                                <span>{q}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Thinking / Streaming Indicator */}
                    {isSending && (
                        <div className="flex items-center space-x-2 text-xs text-indigo-600 dark:text-indigo-400 p-2">
                            <Sparkles size={14} className="animate-spin" />
                            <span>Grounded reasoning from selected sources...</span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Bottom Docked Floating Composer (NotebookLM Style) */}
                <div className="p-4 sm:p-6 bg-gradient-to-t from-[#F8FAFD] via-[#F8FAFD]/90 to-transparent dark:from-[#131314] dark:via-[#131314]/90">
                    <div className="max-w-3xl mx-auto rounded-3xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-lg dark:border-slate-800 dark:bg-[#1E1F20] transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10">
                        <textarea
                            ref={textareaRef}
                            rows={2}
                            value={inputQuery}
                            onChange={(e) => setInputQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question or request a summary from your sources..."
                            className="w-full resize-none bg-transparent px-3 py-1 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white"
                        />

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 px-1">
                            {/* Selected Sources Pill */}
                            <button
                                type="button"
                                onClick={() => setSourcesPanelOpen(true)}
                                className="inline-flex items-center space-x-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition"
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                <span>{selectedSourceIds.length} sources active</span>
                            </button>

                            {/* Send Button */}
                            <button
                                type="button"
                                onClick={() => handleSendMessage()}
                                disabled={!inputQuery.trim() || isSending}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs hover:bg-indigo-500 disabled:opacity-40 transition"
                            >
                                <ArrowUp size={16} />
                            </button>
                        </div>
                    </div>

                    <p className="mt-2 text-center text-[10px] text-slate-400">
                        LECTRA can make mistakes. All responses are cited directly from your course materials.
                    </p>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 3. RIGHT PANEL: STUDIO / QUICK ARTIFACTS                      */}
            {/* ------------------------------------------------------------- */}
            <div
                className={`relative flex flex-col border-l border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-[#1E1F20]/90 transition-all duration-200 shrink-0 ${
                    studioPanelOpen ? 'w-72 lg:w-80' : 'w-0 overflow-hidden border-l-0'
                }`}
            >
                {/* Panel Header */}
                <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        Studio
                    </span>

                    <button
                        type="button"
                        onClick={() => setStudioPanelOpen(false)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Collapse Studio Panel"
                    >
                        <PanelRightClose size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Audio Overview Bar (NotebookLM Signature Feature) */}
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">
                                Audio Overview
                            </span>
                            <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                3:01 Deep Dive
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Two AI hosts summarize your whiteboard notes and reference papers aloud.
                        </p>

                        {/* Interactive Audio Player Preview */}
                        <div className="flex items-center space-x-3 rounded-full bg-white dark:bg-slate-800 p-2 border border-slate-200/70 dark:border-slate-700 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition shrink-0"
                            >
                                {isPlayingAudio ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-600 rounded-full"
                                        style={{ width: `${isPlayingAudio ? 65 : 42}%` }}
                                    />
                                </div>
                            </div>

                            <span className="font-mono text-[10px] text-slate-400">
                                {isPlayingAudio ? '1:58' : '1:17'}
                            </span>
                        </div>
                    </div>

                    {/* Quick Generation Cards Grid */}
                    <div>
                        <div className="flex items-center justify-between px-1 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Create Artifacts
                            </span>
                            <span className="text-[10px] text-indigo-600 font-semibold dark:text-indigo-400">
                                9 Studio Tools
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {/* 1. Master Notes / Reports */}
                            <button
                                type="button"
                                onClick={onOpenStudio}
                                className="rounded-xl border border-slate-200/90 bg-white p-2.5 text-left hover:border-indigo-400 hover:shadow-2xs transition dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <BookOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
                                    <span className="rounded bg-indigo-50 dark:bg-indigo-950 text-[9px] font-bold text-indigo-600 px-1 py-0.2">Core</span>
                                </div>
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                    Master Notes
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">14-Section Document</div>
                            </button>

                            {/* 2. Slide Deck */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (onNotify) onNotify('Generating lecture slide deck outline from active sources...', 'info');
                                    setInputQuery('Create a clean lecture slide deck outline with talking points for each slide based on the active sources.');
                                }}
                                className="rounded-xl border border-slate-200/90 bg-white p-2.5 text-left hover:border-indigo-400 hover:shadow-2xs transition dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <Presentation size={14} className="text-pink-600 dark:text-pink-400" />
                                    <span className="rounded bg-pink-50 dark:bg-pink-950 text-[9px] font-bold text-pink-600 px-1 py-0.2">Slides</span>
                                </div>
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                    Slide Deck
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">Presentation slides</div>
                            </button>

                            {/* 3. Video Overview */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (onNotify) onNotify('Drafting video lecture walkthrough script from sources...', 'info');
                                    setInputQuery('Generate a 5-minute video walkthrough script and scene breakdown explaining the key concepts in these sources.');
                                }}
                                className="rounded-xl border border-slate-200/90 bg-white p-2.5 text-left hover:border-indigo-400 hover:shadow-2xs transition dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <Video size={14} className="text-purple-600 dark:text-purple-400" />
                                    <span className="rounded bg-purple-50 dark:bg-purple-950 text-[9px] font-bold text-purple-600 px-1 py-0.2">Video</span>
                                </div>
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                    Video Overview
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">Storyboard & script</div>
                            </button>

                            {/* 4. Mind Map */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (onNotify) onNotify('Creating hierarchical concept mind map...', 'info');
                                    setInputQuery('Generate a structured Mermaid mind map diagram visualizing all relationships and core concepts in these materials.');
                                }}
                                className="rounded-xl border border-slate-200/90 bg-white p-2.5 text-left hover:border-indigo-400 hover:shadow-2xs transition dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <Network size={14} className="text-teal-600 dark:text-teal-400" />
                                    <span className="rounded bg-teal-50 dark:bg-teal-950 text-[9px] font-bold text-teal-600 px-1 py-0.2">Graph</span>
                                </div>
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                    Mind Map
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">Concept relationship</div>
                            </button>

                            {/* 5. Flashcards */}
                            <button
                                type="button"
                                onClick={() => onOpenStudyKit(activeMasterNote?.lecture_id)}
                                className="rounded-xl border border-slate-200/90 bg-white p-2.5 text-left hover:border-indigo-400 hover:shadow-2xs transition dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <Sparkles size={14} className="text-amber-500" />
                                    <span className="rounded bg-amber-50 dark:bg-amber-950 text-[9px] font-bold text-amber-600 px-1 py-0.2">Study</span>
                                </div>
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                    Flashcards
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">Spaced repetition</div>
                            </button>

                            {/* 6. Quiz & MCQs */}
                            <button
                                type="button"
                                onClick={() => onOpenStudyKit(activeMasterNote?.lecture_id)}
                                className="rounded-xl border border-slate-200/90 bg-white p-2.5 text-left hover:border-indigo-400 hover:shadow-2xs transition dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <HelpCircle size={14} className="text-emerald-500" />
                                    <span className="rounded bg-emerald-50 dark:bg-emerald-950 text-[9px] font-bold text-emerald-600 px-1 py-0.2">Test</span>
                                </div>
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                    Practice Quiz
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">Timed 10-min MCQs</div>
                            </button>

                            {/* 7. Infographic / Data Table */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (onNotify) onNotify('Generating summary data comparison table...', 'info');
                                    setInputQuery('Extract all key definitions, formulas, variables, and units from these sources into a markdown comparison table.');
                                }}
                                className="rounded-xl border border-slate-200/90 bg-white p-2.5 text-left hover:border-indigo-400 hover:shadow-2xs transition dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <Table size={14} className="text-blue-500" />
                                    <span className="rounded bg-blue-50 dark:bg-blue-950 text-[9px] font-bold text-blue-600 px-1 py-0.2">Data</span>
                                </div>
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                    Data Table
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">Formulas & definitions</div>
                            </button>

                            {/* 8. Section Vault Comparison */}
                            <button
                                type="button"
                                onClick={onOpenVault}
                                className="rounded-xl border border-slate-200/90 bg-white p-2.5 text-left hover:border-indigo-400 hover:shadow-2xs transition dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <Layers size={14} className="text-indigo-500" />
                                    <span className="rounded bg-indigo-50 dark:bg-indigo-950 text-[9px] font-bold text-indigo-600 px-1 py-0.2">Vault</span>
                                </div>
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                    Section Vault
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">Compare Sections A–I</div>
                            </button>
                        </div>
                    </div>

                    {/* Saved Notebook Outputs */}
                    <div className="pt-2">
                        <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Saved Notebook Outputs
                        </div>

                        <div className="space-y-1.5">
                            {recentNotes.slice(0, 3).map((note) => (
                                <div
                                    key={note.id}
                                    onClick={() => onOpenMasterNote(note)}
                                    className="rounded-xl border border-slate-200/80 bg-white p-2.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 transition cursor-pointer"
                                >
                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
                                        <span className="truncate">{note.chapter || note.title}</span>
                                        <ExternalLink size={12} className="text-slate-400 shrink-0 ml-1" />
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        {note.subject_code} • Sec {note.section}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
