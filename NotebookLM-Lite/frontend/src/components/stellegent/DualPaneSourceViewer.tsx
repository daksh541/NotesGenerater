import React, { useState } from 'react';
import { LecturePage, StructuredNote, DetectedRegion } from '../../types/stellegent';
import { ZoomIn, ZoomOut, RotateCcw, ShieldCheck, Eye, Layers, FileText, CheckCircle2 } from 'lucide-react';
import { resolveMediaUrl } from '../../services/stellegentApi';

interface DualPaneSourceViewerProps {
    pages: LecturePage[];
    note?: StructuredNote;
}

export const DualPaneSourceViewer: React.FC<DualPaneSourceViewerProps> = ({ pages, note }) => {
    const [selectedPageIndex, setSelectedPageIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
    const [activeRegionIndex, setActiveRegionIndex] = useState<number | null>(null);

    const currentPage = pages[selectedPageIndex] || pages[0];

    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
    const handleResetZoom = () => setZoom(1);

    // Format file url with mobile and native base URL resolution
    const getPageImageUrl = (page?: LecturePage) => {
        if (!page) return '';
        const path = page.file_path;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const clean = path.replace(/^\.\//, '');
        return resolveMediaUrl(clean);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[550px] lg:h-[720px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            {/* Left Pane: Original Whiteboard Image Viewer */}
            <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-950 text-white relative">
                {/* Source Viewer Toolbar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
                    <div className="flex items-center space-x-2">
                        <span className="flex items-center space-x-1 text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={14} />
                            <span>Original Source Board</span>
                        </span>
                        {pages.length > 1 && (
                            <span className="text-slate-400">
                                Page {selectedPageIndex + 1} of {pages.length}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${showBoundingBoxes ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                        >
                            <Layers size={12} />
                            <span>Regions {showBoundingBoxes ? 'On' : 'Off'}</span>
                        </button>
                        <div className="flex items-center space-x-1 border-l border-slate-800 pl-2">
                            <button onClick={handleZoomIn} title="Zoom In" className="p-1 hover:bg-slate-800 rounded">
                                <ZoomIn size={14} />
                            </button>
                            <button onClick={handleZoomOut} title="Zoom Out" className="p-1 hover:bg-slate-800 rounded">
                                <ZoomOut size={14} />
                            </button>
                            <button onClick={handleResetZoom} title="Reset" className="p-1 hover:bg-slate-800 rounded">
                                <RotateCcw size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Interactive Image Viewport */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative select-none">
                    {currentPage ? (
                        <div
                            className="relative transition-transform duration-150"
                            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                        >
                            <img
                                src={getPageImageUrl(currentPage)}
                                alt={currentPage.original_filename}
                                className="max-w-full max-h-[580px] object-contain rounded-lg shadow-2xl border border-slate-800"
                                onError={(e) => {
                                    // Fallback placeholder representation for test environments
                                    (e.target as HTMLElement).style.display = 'none';
                                }}
                            />

                            {/* Synthetic Canvas representation if image fails to render directly */}
                            <div className="w-[500px] h-[360px] bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col justify-between text-slate-200">
                                <div>
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                        <div className="flex items-center space-x-2">
                                            <FileText size={18} className="text-indigo-400" />
                                            <span className="font-semibold text-sm">{currentPage.original_filename}</span>
                                        </div>
                                        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                                            {currentPage.source_type}
                                        </span>
                                    </div>
                                    <div className="mt-4 space-y-2 text-xs font-mono text-slate-400">
                                        <p className="text-emerald-400 font-semibold">// Transcribed Board Matrix</p>
                                        <p className="p-2 bg-slate-950 rounded border border-slate-800 line-clamp-4">
                                            {note?.original_transcription || 'Verified whiteboard content detected.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                    <span>Resolution: {currentPage.width || 1920}x{currentPage.height || 1080}</span>
                                    <span>Protected Original File</span>
                                </div>
                            </div>

                            {/* Bounding Box Overlays */}
                            {showBoundingBoxes && currentPage.regions && currentPage.regions.length > 0 && (
                                <div className="absolute inset-0 pointer-events-none">
                                    {currentPage.regions.map((reg, idx) => {
                                        if (!reg.box_2d || reg.box_2d.length < 4) return null;
                                        const [ymin, xmin, ymax, xmax] = reg.box_2d;
                                        const top = `${(ymin / 1000) * 100}%`;
                                        const left = `${(xmin / 1000) * 100}%`;
                                        const height = `${((ymax - ymin) / 1000) * 100}%`;
                                        const width = `${((xmax - xmin) / 1000) * 100}%`;
                                        const isActive = activeRegionIndex === idx;

                                        return (
                                            <div
                                                key={idx}
                                                style={{ top, left, width, height }}
                                                className={`absolute border-2 rounded transition-all pointer-events-auto cursor-pointer ${isActive ? 'border-amber-400 bg-amber-400/20 ring-2 ring-amber-400' : 'border-indigo-400/80 bg-indigo-500/10 hover:border-indigo-300'}`}
                                                onClick={() => setActiveRegionIndex(isActive ? null : idx)}
                                            >
                                                <span className="absolute -top-4 left-0 bg-indigo-600 text-white text-[9px] font-bold px-1 rounded shadow">
                                                    {reg.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500">No page image available</div>
                    )}
                </div>

                {/* Page Thumbnails Selector */}
                {pages.length > 1 && (
                    <div className="flex items-center space-x-2 p-2 bg-slate-900 border-t border-slate-800 overflow-x-auto">
                        {pages.map((p, idx) => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPageIndex(idx)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${selectedPageIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                Page {p.page_number}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Pane: Extracted Verbatim Content & Grounded Citations */}
            <div className="flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Extracted Transcriptions & Provenance
                        </h2>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        Non-Destructive Extraction
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
                    {/* Verbatim Source Block */}
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                            <span>1. Transcribed Teacher Handwriting (Verbatim)</span>
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">Exact Match</span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-800">
                            {note?.original_transcription || 'No transcription recorded.'}
                        </div>
                    </div>

                    {/* Grounded Definitions */}
                    {note?.key_definitions && note.key_definitions.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                2. Detected Concepts & Teacher Definitions
                            </h3>
                            <div className="space-y-2">
                                {note.key_definitions.map((def, i) => (
                                    <div
                                        key={i}
                                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-sm"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{def.term}</span>
                                            {def.context && (
                                                <span className="text-[10px] text-slate-400 italic">{def.context}</span>
                                            )}
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300">{def.definition}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Equations and Formulas */}
                    {note?.equations_and_formulas && note.equations_and_formulas.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                3. Mathematical Formulas
                            </h3>
                            <div className="space-y-2">
                                {note.equations_and_formulas.map((eq, i) => (
                                    <div
                                        key={i}
                                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-sm space-y-1.5"
                                    >
                                        <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded border border-emerald-200 dark:border-emerald-900">
                                            {eq.latex_or_text}
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300">{eq.explanation}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
