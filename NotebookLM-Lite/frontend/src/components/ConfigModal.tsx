import React, { useState } from 'react';
import { Cpu, Database, Image, Key, Mic, PencilLine, Rows3, X } from 'lucide-react';
import type { ApiConfig } from '../App';

interface ConfigModalProps {
    config: ApiConfig;
    onConfigChange: (config: ApiConfig) => void | Promise<void>;
    onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ config, onConfigChange, onClose }) => {
    const [localConfig, setLocalConfig] = useState<ApiConfig>(config);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const setValue = (key: keyof ApiConfig, value: string) => {
        setLocalConfig((prev: ApiConfig) => ({ ...prev, [key]: value }));
    };

    const keyPlaceholder = (isConfigured: boolean, label: string) => {
        if (isConfigured) {
            return `${label} configured in config.yaml; leave blank to keep it`;
        }
        return `${label} API key`;
    };

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            await onConfigChange(localConfig);
            onClose();
        } catch (exc) {
            setError(exc instanceof Error ? exc.message : String(exc));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Model Configuration</h2>
                    <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={18} /></button>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6 max-h-[72vh] overflow-y-auto">
                    <section className="space-y-3">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"><Cpu size={16} className="text-indigo-500" /> <span>Text Model</span></div>
                        <select value={localConfig.textProvider} onChange={e => setValue('textProvider', e.target.value)} className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                            <option value="litellm">LiteLLM default</option>
                            <option value="openai">OpenAI compatible</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="gemini">Gemini / GenAI</option>
                        </select>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="password" value={localConfig.textApiKey} onChange={e => setValue('textApiKey', e.target.value)} placeholder={keyPlaceholder(localConfig.textApiKeySet, 'Text')} className="w-full text-xs p-2.5 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        </div>
                        <input value={localConfig.textModel} onChange={e => setValue('textModel', e.target.value)} placeholder="openai/gpt-4o, claude-3-5-sonnet..." className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        <input value={localConfig.textBaseUrl} onChange={e => setValue('textBaseUrl', e.target.value)} placeholder="https://api.openai.com/v1" className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        <select value={localConfig.textThinking} onChange={e => setValue('textThinking', e.target.value)} className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                            <option value="enabled">Thinking enabled</option>
                            <option value="disabled">Thinking disabled</option>
                        </select>
                    </section>
                    <section className="space-y-3">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"><Database size={16} className="text-sky-500" /> <span>Embedding Model</span></div>
                        <input value={localConfig.embeddingModel} onChange={e => setValue('embeddingModel', e.target.value)} placeholder="openai/text-embedding-3-small" className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        <input value={localConfig.embeddingBaseUrl} onChange={e => setValue('embeddingBaseUrl', e.target.value)} placeholder="https://api.openai.com/v1" className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="password" value={localConfig.embeddingApiKey} onChange={e => setValue('embeddingApiKey', e.target.value)} placeholder={keyPlaceholder(localConfig.embeddingApiKeySet, 'Embedding')} className="w-full text-xs p-2.5 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        </div>
                    </section>
                    <section className="space-y-3">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"><Rows3 size={16} className="text-purple-500" /> <span>Rerank Model</span></div>
                        <input value={localConfig.rerankModel} onChange={e => setValue('rerankModel', e.target.value)} placeholder="bge-reranker, jina-reranker..." className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        <input value={localConfig.rerankBaseUrl} onChange={e => setValue('rerankBaseUrl', e.target.value)} placeholder="https://api.example.com/v1" className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="password" value={localConfig.rerankApiKey} onChange={e => setValue('rerankApiKey', e.target.value)} placeholder={keyPlaceholder(localConfig.rerankApiKeySet, 'Rerank')} className="w-full text-xs p-2.5 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        </div>
                    </section>
                    <section className="space-y-3">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"><Mic size={16} className="text-emerald-500" /> <span>Speech Model</span></div>
                        <input value={localConfig.speechModel} onChange={e => setValue('speechModel', e.target.value)} placeholder="fnlp/MOSS-TTSD-v0.5" className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        <input value={localConfig.speechBaseUrl} onChange={e => setValue('speechBaseUrl', e.target.value)} placeholder="https://api.siliconflow.cn/v1" className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="password" value={localConfig.speechApiKey} onChange={e => setValue('speechApiKey', e.target.value)} placeholder={keyPlaceholder(localConfig.speechApiKeySet, 'Speech')} className="w-full text-xs p-2.5 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        </div>
                        <input value={localConfig.speechVoice} onChange={e => setValue('speechVoice', e.target.value)} placeholder="voice" className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        <input value={localConfig.speechFormat} onChange={e => setValue('speechFormat', e.target.value)} placeholder="mp3" className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
                    </section>
                </div>
                <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="text-xs text-red-600 truncate">{error}</div>
                    <div className="flex justify-end gap-2.5">
                        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                        <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all">{saving ? 'Saving...' : 'Save & Apply'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
