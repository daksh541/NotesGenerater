import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Minimize2, AlertCircle } from 'lucide-react';

interface MermaidRendererProps {
    code: string;
    diagramId?: string;
    onCodeEdit?: (newCode: string) => void;
}

mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, sans-serif',
    flowchart: {
        curve: 'basis',
        useMaxWidth: false,
    },
});

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, diagramId = 'mermaid-chart' }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svgContent, setSvgContent] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState<number>(1);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;
        setError(null);

        const renderDiagram = async () => {
            if (!code || !code.trim()) {
                setSvgContent('');
                return;
            }

            try {
                const uniqueId = `mermaid_${diagramId}_${Math.random().toString(36).substring(2, 9)}`;
                const { svg } = await mermaid.render(uniqueId, code.trim());
                if (isMounted) {
                    setSvgContent(svg);
                    setError(null);
                }
            } catch (err: any) {
                if (isMounted) {
                    console.warn('Mermaid rendering issue:', err);
                    setError(err?.message || 'Invalid diagram syntax');
                }
            }
        };

        renderDiagram();
        return () => {
            isMounted = false;
        };
    }, [code, diagramId]);

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2.5));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.4));
    const handleResetZoom = () => setZoom(1);

    const handleDownloadSvg = () => {
        if (!svgContent) return;
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stellegent_diagram_${diagramId}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className={`relative border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur overflow-hidden flex flex-col ${isFullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-white dark:bg-slate-950' : 'h-[500px]'}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70">
                <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Interactive Diagram Engine</span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>Zoom: {Math.round(zoom * 100)}%</span>
                </div>

                <div className="flex items-center space-x-1">
                    <button
                        onClick={handleZoomIn}
                        title="Zoom In"
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        title="Zoom Out"
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <button
                        onClick={handleResetZoom}
                        title="Reset Zoom"
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        onClick={handleDownloadSvg}
                        title="Export SVG"
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="m-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start space-x-2 text-xs text-amber-700 dark:text-amber-300">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Mermaid Syntax Warning</p>
                        <p className="opacity-90">{error}</p>
                    </div>
                </div>
            )}

            {/* Viewport */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto p-6 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            >
                {svgContent ? (
                    <div
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.15s ease-out' }}
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                ) : (
                    <div className="text-slate-400 text-sm">Rendering diagram...</div>
                )}
            </div>
        </div>
    );
};
