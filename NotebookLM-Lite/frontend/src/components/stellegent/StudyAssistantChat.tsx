import React, { useState, useEffect, useRef } from 'react';
import { StudyChatMessage, Citation } from '../../types/stellegent';
import { stellegentApi } from '../../services/stellegentApi';
import { Send, Bot, User as UserIcon, Sparkles, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';

interface StudyAssistantChatProps {
    lectureId?: string;
    lectureTitle?: string;
    onOpenCitation?: (citation: Citation) => void;
}

export const StudyAssistantChat: React.FC<StudyAssistantChatProps> = ({
    lectureId,
    lectureTitle,
    onOpenCitation
}) => {
    const [messages, setMessages] = useState<StudyChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const exampleQuestions = [
        lectureTitle ? `Explain the core concept in "${lectureTitle}"` : 'Explain the key concepts in my recent lectures',
        'What formulas did the instructor emphasize?',
        'Generate revision questions for my upcoming quiz',
        'Summarize the step-by-step logic in this lecture',
    ];

    useEffect(() => {
        loadMessages();
    }, [lectureId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const loadMessages = async () => {
        try {
            const history = await stellegentApi.getStudyMessages(lectureId);
            setMessages(history);
        } catch (err) {
            console.error('Failed to load chat history:', err);
        }
    };

    const handleSend = async (textToSend?: string) => {
        const query = textToSend || input;
        if (!query.trim() || isLoading) return;

        setInput('');
        setIsLoading(true);

        const tempUserMsg: StudyChatMessage = {
            id: `temp_${Date.now()}`,
            workspace_id: '',
            lecture_id: lectureId,
            user_id: '',
            role: 'user',
            content: query.trim(),
            citations: [],
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, tempUserMsg]);

        try {
            const resp = await stellegentApi.sendStudyChat(query.trim(), lectureId);
            const assistantMsg: StudyChatMessage = {
                id: resp.id,
                workspace_id: '',
                lecture_id: lectureId,
                user_id: '',
                role: 'assistant',
                content: resp.content,
                citations: resp.citations || [],
                created_at: resp.created_at,
            };
            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err) {
            console.error('Chat error:', err);
            const errorMsg: StudyChatMessage = {
                id: `err_${Date.now()}`,
                workspace_id: '',
                lecture_id: lectureId,
                user_id: '',
                role: 'assistant',
                content: 'Failed to retrieve an answer from the assistant. Please try again.',
                citations: [],
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[650px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <Bot size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Study Assistant</h2>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1">
                            <ShieldCheck size={12} />
                            <span>Strictly Grounded in Verified Lecture Notes</span>
                        </span>
                    </div>
                </div>

                {lectureTitle && (
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full truncate max-w-xs">
                        {lectureTitle}
                    </span>
                )}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 && (
                    <div className="py-8 text-center space-y-4">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ask your notes anything</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                                Every answer is grounded directly in the transcribed whiteboard photos with verified source citations.
                            </p>
                        </div>

                        {/* Suggested Questions */}
                        <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-md mx-auto">
                            {exampleQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(q)}
                                    className="text-left text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-300 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex space-x-3 text-xs ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                <Bot size={14} />
                            </div>
                        )}

                        <div className={`max-w-[80%] rounded-2xl p-4 space-y-2.5 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700'}`}>
                            <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                            {/* Citations block */}
                            {msg.citations && msg.citations.length > 0 && (
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                                        Source Citations:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {msg.citations.map((c, cIdx) => (
                                            <button
                                                key={cIdx}
                                                onClick={() => onOpenCitation && onOpenCitation(c)}
                                                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-colors"
                                                title={`Quote: ${c.quote}`}
                                            >
                                                <span>{c.lecture_title} (p.{c.page_number})</span>
                                                <ExternalLink size={10} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                                <UserIcon size={14} />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                        <span>Searching notes and formulating citation-grounded response...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                }}
                className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center space-x-2"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about equations, teacher definitions, or exam topics..."
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-sm shadow-indigo-600/30"
                >
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
};
