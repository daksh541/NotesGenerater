import React, { useState } from 'react';
import { RotateCw, RotateCcw, Trash2, Sliders, Check, Plus, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
import { CapturedPhoto } from './MobileCameraCapture';

interface MobileImageEditorProps {
    isOpen: boolean;
    photos: CapturedPhoto[];
    onClose: () => void;
    onAddMore: () => void;
    onConfirmPhotos: (finalFiles: File[]) => void;
}

export const MobileImageEditor: React.FC<MobileImageEditorProps> = ({
    isOpen,
    photos: initialPhotos,
    onClose,
    onAddMore,
    onConfirmPhotos
}) => {
    const [photos, setPhotos] = useState<CapturedPhoto[]>(initialPhotos);
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeFilter, setActiveFilter] = useState<'none' | 'whiteboard' | 'grayscale'>('none');

    // Sync if initialPhotos change
    React.useEffect(() => {
        setPhotos(initialPhotos);
        if (initialPhotos.length > 0 && activeIndex >= initialPhotos.length) {
            setActiveIndex(0);
        }
    }, [initialPhotos]);

    if (!isOpen || photos.length === 0) return null;

    const currentPhoto = photos[activeIndex];

    const handleRotate = (delta: number) => {
        setPhotos((prev) =>
            prev.map((p, idx) => {
                if (idx !== activeIndex) return p;
                const newRotation = (p.rotation + delta + 360) % 360;
                return { ...p, rotation: newRotation };
            })
        );
    };

    const handleSetFilter = (filter: 'none' | 'whiteboard' | 'grayscale') => {
        setActiveFilter(filter);
        setPhotos((prev) =>
            prev.map((p, idx) => {
                if (idx !== activeIndex) return p;
                return { ...p, filter };
            })
        );
    };

    const handleDeleteCurrent = () => {
        const next = photos.filter((_, idx) => idx !== activeIndex);
        setPhotos(next);
        if (next.length === 0) {
            onClose();
        } else if (activeIndex >= next.length) {
            setActiveIndex(next.length - 1);
        }
    };

    // Render edits onto HTML5 canvas and export final File array
    const handleConfirm = async () => {
        const processedFiles: File[] = [];

        for (let i = 0; i < photos.length; i++) {
            const item = photos[i];
            const processedFile = await applyEditsToCanvas(item);
            processedFiles.push(processedFile);
        }

        onConfirmPhotos(processedFiles);
    };

    const applyEditsToCanvas = (item: CapturedPhoto): Promise<File> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;

                const is90or270 = item.rotation === 90 || item.rotation === 270;
                canvas.width = is90or270 ? img.height : img.width;
                canvas.height = is90or270 ? img.width : img.height;

                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((item.rotation * Math.PI) / 180);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                ctx.restore();

                // Apply CSS/canvas level filter simulation
                if (item.filter === 'grayscale' || item.filter === 'whiteboard') {
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const d = imgData.data;
                    for (let p = 0; p < d.length; p += 4) {
                        const r = d[p];
                        const g = d[p + 1];
                        const b = d[p + 2];
                        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                        if (item.filter === 'whiteboard') {
                            // Whiteboard contrast stretch: push brights to white, dark marker lines deeper
                            const contrast = 1.35;
                            const enhanced = (gray - 128) * contrast + 128;
                            const finalVal = Math.min(255, Math.max(0, enhanced));
                            d[p] = finalVal;
                            d[p + 1] = finalVal;
                            d[p + 2] = finalVal;
                        } else {
                            d[p] = gray;
                            d[p + 1] = gray;
                            d[p + 2] = gray;
                        }
                    }
                    ctx.putImageData(imgData, 0, 0);
                }

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const f = new File([blob], item.file.name || 'whiteboard_page.jpg', {
                                type: 'image/jpeg'
                            });
                            resolve(f);
                        } else {
                            resolve(item.file);
                        }
                    },

                    'image/jpeg',
                    0.92
                );
            };
            img.src = item.previewUrl;
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between safe-top safe-bottom select-none">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 text-white">
                <button
                    onClick={onClose}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1"
                >
                    Cancel
                </button>
                <div className="text-center">
                    <span className="text-sm font-bold">Review & Enhance</span>
                    <span className="block text-[11px] text-slate-400">
                        Page {activeIndex + 1} of {photos.length}
                    </span>
                </div>
                <button
                    onClick={handleConfirm}
                    className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
                >
                    <span>Use {photos.length} {photos.length === 1 ? 'Page' : 'Pages'}</span>
                    <Check size={14} />
                </button>
            </div>

            {/* Main Image Surface */}
            <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden bg-slate-900/40">
                {currentPhoto && (
                    <div
                        className="relative max-w-full max-h-[62vh] transition-transform duration-200"
                        style={{
                            transform: `rotate(${currentPhoto.rotation}deg)`,
                            filter:
                                currentPhoto.filter === 'whiteboard'
                                    ? 'contrast(135%) brightness(105%)'
                                    : currentPhoto.filter === 'grayscale'
                                    ? 'grayscale(100%) contrast(120%)'
                                    : 'none'
                        }}
                    >
                        <img
                            src={currentPhoto.previewUrl}
                            alt="Active Whiteboard Page"
                            className="max-h-[62vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
                        />
                    </div>
                )}

                {/* Left/Right Page Flippers */}
                {photos.length > 1 && (
                    <>
                        <button
                            onClick={() => setActiveIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                            className="absolute left-3 p-2 rounded-full bg-black/60 text-white active:scale-95 transition-transform"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setActiveIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                            className="absolute right-3 p-2 rounded-full bg-black/60 text-white active:scale-95 transition-transform"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </>
                )}
            </div>

            {/* Bottom Actions & Filter Controls */}
            <div className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-4 space-y-4">
                {/* Enhancement Presets */}
                <div className="flex items-center justify-center space-x-2">
                    <button
                        onClick={() => handleSetFilter('none')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            currentPhoto?.filter === 'none'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-800 text-slate-300'
                        }`}
                    >
                        Original
                    </button>
                    <button
                        onClick={() => handleSetFilter('whiteboard')}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            currentPhoto?.filter === 'whiteboard'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-800 text-slate-300'
                        }`}
                    >
                        <Wand2 size={13} />
                        <span>Whiteboard Boost</span>
                    </button>
                    <button
                        onClick={() => handleSetFilter('grayscale')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            currentPhoto?.filter === 'grayscale'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-800 text-slate-300'
                        }`}
                    >
                        B&W Notes
                    </button>
                </div>

                {/* Rotation and Deletion Toolbar */}
                <div className="flex items-center justify-around py-1">
                    <button
                        onClick={() => handleRotate(-90)}
                        className="flex flex-col items-center space-y-1 text-slate-300 active:text-indigo-400"
                    >
                        <RotateCcw size={20} />
                        <span className="text-[10px] font-medium">Rotate Left</span>
                    </button>
                    <button
                        onClick={() => handleRotate(90)}
                        className="flex flex-col items-center space-y-1 text-slate-300 active:text-indigo-400"
                    >
                        <RotateCw size={20} />
                        <span className="text-[10px] font-medium">Rotate Right</span>
                    </button>
                    <button
                        onClick={onAddMore}
                        className="flex flex-col items-center space-y-1 text-indigo-400 active:text-indigo-300"
                    >
                        <Plus size={20} />
                        <span className="text-[10px] font-medium">Add Page</span>
                    </button>
                    <button
                        onClick={handleDeleteCurrent}
                        className="flex flex-col items-center space-y-1 text-rose-400 active:text-rose-300"
                    >
                        <Trash2 size={20} />
                        <span className="text-[10px] font-medium">Remove</span>
                    </button>
                </div>

                {/* Thumbnail Strip */}
                <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pt-1">
                    {photos.map((p, idx) => (
                        <button
                            key={p.id}
                            onClick={() => setActiveIndex(idx)}
                            className={`relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                                idx === activeIndex
                                    ? 'border-indigo-500 scale-105 shadow-md'
                                    : 'border-slate-700 opacity-60'
                            }`}
                        >
                            <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[8px] font-bold px-1">
                                {idx + 1}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
