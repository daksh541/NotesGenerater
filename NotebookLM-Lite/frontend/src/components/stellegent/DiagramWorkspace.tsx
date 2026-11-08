import React, { useState } from 'react';
import { DiagramArtifact, DiagramType } from '../../types/stellegent';
import { MermaidRenderer } from './MermaidRenderer';
import { stellegentApi } from '../../services/stellegentApi';
import { GitFork, RefreshCw, Code2, Eye, Save, Sparkles, Check, AlertCircle } from 'lucide-react';

interface DiagramWorkspaceProps {
    diagrams: DiagramArtifact[];
    lectureId: string;
    onDiagramUpdated: (diagram: DiagramArtifact) => void;
}

export const DiagramWorkspace: React.FC<DiagramWorkspaceProps> = ({
    diagrams,
    lectureId,
    onDiagramUpdated
}) => {
    const [selectedDiagramIndex, setSelectedDiagramIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [regenType, setRegenType] = useState<DiagramType>('flowchart');

    const currentDiagram = diagrams[selectedDiagramIndex] || diagrams[0];
    const [editedCode, setEditedCode] = useState(currentDiagram?.mermaid_code || '');

    React.useEffect(() => {
        if (currentDiagram) {
            setEditedCode(currentDiagram.mermaid_code);
        }
    }, [currentDiagram]);

    if (!currentDiagram) {
        return (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <GitFork size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-base font-semibold text-slate-600 dark:text-slate-300">Diagrams are generating...</p>
                <p className="text-xs text-slate-400 mt-1">Stellegent is determining whether this whiteboard content is a process flowchart or mind map.</p>
            </div>
        );
    }

    const handleSaveCode = async () => {
        setIsSaving(true);
        try {
            const updated = await stellegentApi.updateDiagram(lectureId, currentDiagram.id, {
                mermaid_code: editedCode,
            });
            onDiagramUpdated(updated);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err) {
            console.error('Failed to save diagram code:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerate = async (targetType: DiagramType) => {
        setIsRegenerating(true);
        try {
            const regenerated = await stellegentApi.regenerateDiagram(lectureId, targetType);
            onDiagramUpdated(regenerated);
            setEditedCode(regenerated.mermaid_code);
        } catch (err) {
            console.error('Regenerate failed:', err);
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Diagram Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <GitFork size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{currentDiagram.title}</h2>
                        <span className="text-[11px] font-medium text-slate-500 uppercase">
                            Type: {currentDiagram.diagram_type.replace('_', ' ')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {/* View Switcher (Visual vs Code) */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                        <button
                            onClick={() => setViewMode('visual')}
                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all ${viewMode === 'visual' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                        >
                            <Eye size={13} />
                            <span>Diagram</span>
                        </button>
                        <button
                            onClick={() => setViewMode('code')}
                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all ${viewMode === 'code' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                        >
                            <Code2 size={13} />
                            <span>Mermaid Code</span>
                        </button>
                    </div>

                    {/* Regenerate Diagram Dropdown */}
                    <div className="flex items-center space-x-1">
                        <select
                            value={regenType}
                            onChange={(e) => setRegenType(e.target.value as DiagramType)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                            <option value="flowchart">Flowchart (Process)</option>
                            <option value="mind_map">Mind Map (Hierarchy)</option>
                            <option value="sequence">Sequence Diagram</option>
                        </select>
                        <button
                            onClick={() => handleRegenerate(regenType)}
                            disabled={isRegenerating}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
                            <span>{isRegenerating ? 'Generating...' : 'Regenerate'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Display: Visual Diagram vs Code Editor */}
            {viewMode === 'visual' ? (
                <MermaidRenderer code={editedCode} diagramId={currentDiagram.id} />
            ) : (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                        <div className="flex items-center space-x-2">
                            <Code2 size={14} className="text-indigo-400" />
                            <span className="font-mono">Mermaid Syntax Editor</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            {saveSuccess && (
                                <span className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
                                    <Check size={14} />
                                    <span>Saved</span>
                                </span>
                            )}
                            <button
                                onClick={handleSaveCode}
                                disabled={isSaving}
                                className="flex items-center space-x-1 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                            >
                                <Save size={13} />
                                <span>{isSaving ? 'Saving...' : 'Apply & Save'}</span>
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={editedCode}
                        onChange={(e) => setEditedCode(e.target.value)}
                        rows={14}
                        className="w-full font-mono text-xs p-4 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                    />
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Tip: Supported formats include graph TD, flowchart LR, mindmap, sequenceDiagram.</span>
                        <button
                            onClick={() => setViewMode('visual')}
                            className="text-indigo-400 hover:underline"
                        >
                            Switch to Preview
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
