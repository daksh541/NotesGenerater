import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, CheckCircle, AlertTriangle, Loader2, Plus, Camera, Sliders, Sparkles } from 'lucide-react';
import { Subject } from '../../types/stellegent';
import { stellegentApi } from '../../services/stellegentApi';
import { MobileCameraCapture, CapturedPhoto } from './mobile/MobileCameraCapture';
import { MobileImageEditor } from './mobile/MobileImageEditor';
import { ProcessingStatusScreen } from './mobile/ProcessingStatusScreen';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    subjects: Subject[];
    onUploadSuccess: (lectureId: string) => void;
    onCreateSubjectClick: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
    isOpen,
    onClose,
    subjects,
    onUploadSuccess,
    onCreateSubjectClick
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
    const [title, setTitle] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [teacher, setTeacher] = useState('');
    const [semester, setSemester] = useState('Fall 2026');
    const [lectureDate, setLectureDate] = useState(new Date().toISOString().substring(0, 10));
    const [tags, setTags] = useState('');
    // Offline mode is useful for UI demos, but it cannot read handwriting.
    // Prefer accurate vision extraction whenever a configured model is available.
    const [useFastOffline, setUseFastOffline] = useState(false);

    const [isUploading, setIsUploading] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

    // Mobile camera & editor overlays
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Processing status screen
    const [processingLectureId, setProcessingLectureId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            addFilesToList(files);
        }
    };

    const addFilesToList = (files: File[]) => {
        setSelectedFiles((prev) => [...prev, ...files]);
        // Also map to CapturedPhotos for editing capability
        const newCaptured: CapturedPhoto[] = files.map((f) => ({
            id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            file: f,
            previewUrl: URL.createObjectURL(f),
            rotation: 0,
            filter: 'none'
        }));
        setCapturedPhotos((prev) => [...prev, ...newCaptured]);

        if (!title && files[0]) {
            const cleanName = files[0].name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
            setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            addFilesToList(files);
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    // Camera capture callback
    const handlePhotosFromCamera = (photos: CapturedPhoto[]) => {
        setIsCameraOpen(false);
        setCapturedPhotos((prev) => [...prev, ...photos]);
        setSelectedFiles((prev) => [...prev, ...photos.map((p) => p.file)]);
        if (!title) {
            setTitle(`Lecture Whiteboard ${new Date().toLocaleDateString()}`);
        }
    };

    // Editor confirmation callback
    const handleEditedPhotosConfirm = (finalFiles: File[]) => {
        setIsEditorOpen(false);
        setSelectedFiles(finalFiles);
        // Refresh preview URLs
        const updatedCaptured: CapturedPhoto[] = finalFiles.map((f) => ({
            id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            file: f,
            previewUrl: URL.createObjectURL(f),
            rotation: 0,
            filter: 'none'
        }));
        setCapturedPhotos(updatedCaptured);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFiles.length === 0) {
            setError('Please capture or select at least one whiteboard photo.');
            return;
        }

        setIsUploading(true);
        setError(null);
        setDuplicateNotice(null);

        const formData = new FormData();
        selectedFiles.forEach((f) => formData.append('files', f));
        formData.append('title', title.trim() || 'Untitled Lecture');
        if (selectedSubjectId) formData.append('subject_id', selectedSubjectId);
        if (teacher.trim()) formData.append('teacher', teacher.trim());
        if (semester.trim()) formData.append('semester', semester.trim());
        if (lectureDate) formData.append('lecture_date', lectureDate);
        if (tags.trim()) formData.append('tags', tags.trim());
        formData.append('mock_pipeline', useFastOffline ? 'true' : 'false');


        try {
            const res = await stellegentApi.uploadLecture(formData);

            if (res.is_duplicate) {
                setDuplicateNotice(`This lecture was already captured in your workspace. Opening existing record...`);
                setTimeout(() => {
                    onUploadSuccess(res.lecture_id);
                    onClose();
                }, 1200);
                return;
            }

            // Launch live processing status tracker
            setIsUploading(false);
            setProcessingLectureId(res.lecture_id);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err?.response?.data?.detail || 'Failed to upload lecture. Please try again.');
            setIsUploading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 sm:border border-slate-200 dark:border-slate-800 sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh] safe-top safe-bottom">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center space-x-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                <Camera size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Capture Lecture</h2>
                                <p className="text-[11px] text-slate-500">Camera whiteboard capture & AI notes synthesis</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isUploading}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSubmit} className="p-5 overflow-y-auto overscroll-contain space-y-4 flex-1 min-h-0">
                        {/* Error and Duplicate alerts */}
                        {error && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                                <AlertTriangle size={16} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        {duplicateNotice && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl text-amber-700 dark:text-amber-300 text-xs flex items-center space-x-2">
                                <CheckCircle size={16} className="shrink-0 text-amber-500" />
                                <span>{duplicateNotice}</span>
                            </div>
                        )}

                        {/* Mobile Camera and Upload Action Center */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setIsCameraOpen(true)}
                                className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex flex-col items-center justify-center space-y-1.5 shadow-md shadow-indigo-600/25 active:scale-95 transition-transform"
                            >
                                <Camera size={26} />
                                <span className="text-xs font-bold">Open Camera</span>
                                <span className="text-[10px] text-indigo-200">Whiteboard Viewfinder</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center space-y-1.5 active:scale-95 transition-transform"
                            >
                                <ImageIcon size={26} className="text-indigo-600 dark:text-indigo-400" />
                                <span className="text-xs font-bold">Photo Library</span>
                                <span className="text-[10px] text-slate-400">Select Images or PDFs</span>
                            </button>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                multiple
                                accept="image/*,.pdf"
                                className="hidden"
                            />
                        </div>

                        {/* Selected File Previews & Edit Button */}
                        {selectedFiles.length > 0 && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                                    <span>Selected Pages ({selectedFiles.length})</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditorOpen(true)}
                                        className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:underline text-[11px]"
                                    >
                                        <Sliders size={13} />
                                        <span>Rotate & Enhance</span>
                                    </button>
                                </div>

                                <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
                                    {selectedFiles.map((f, i) => (
                                        <div
                                            key={i}
                                            className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 group"
                                        >
                                            {f.type.includes('pdf') ? (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-rose-50 dark:bg-rose-950/40">
                                                    <FileText size={20} className="text-rose-500" />
                                                    <span className="text-[8px] truncate max-w-full font-bold mt-1 text-rose-700 dark:text-rose-300">
                                                        PDF Doc
                                                    </span>
                                                </div>
                                            ) : (
                                                <img
                                                    src={URL.createObjectURL(f)}
                                                    alt={`Page ${i + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 font-bold rounded">
                                                #{i + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFile(i)}
                                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Metadata fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Lecture Title *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Distributed Consensus & Raft"
                                    required
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Subject / Course
                                    </label>
                                    <button
                                        type="button"
                                        onClick={onCreateSubjectClick}
                                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5"
                                    >
                                        <Plus size={11} />
                                        <span>New</span>
                                    </button>
                                </div>
                                <select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">General Knowledge (No Subject)</option>
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} {s.code ? `(${s.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Teacher / Instructor
                                </label>
                                <input
                                    type="text"
                                    value={teacher}
                                    onChange={(e) => setTeacher(e.target.value)}
                                    placeholder="e.g. Prof. Emily Sanders"
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Lecture Date
                                </label>
                                <input
                                    type="date"
                                    value={lectureDate}
                                    onChange={(e) => setLectureDate(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Tags (comma separated)
                            </label>
                            <input
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="e.g. algorithms, graphs, midterm"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Offline mode deliberately does not claim to read the uploaded handwriting. */}
                        <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                                <span className="text-base">⚡</span>
                                <div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Offline preview mode (no AI credits)</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Uses example content only. Keep this off to read the actual image with your configured vision model.</span>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useFastOffline}
                                    onChange={(e) => setUseFastOffline(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {/* Footer Submit Buttons */}
                        <div className="pt-2 flex items-center space-x-3">

                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isUploading}
                                className="flex-1 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUploading || selectedFiles.length === 0}
                                className="flex-2 py-3 px-6 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={15} />
                                        <span>Process {selectedFiles.length} {selectedFiles.length === 1 ? 'Page' : 'Pages'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sub-modals for Camera and Editor */}
            <MobileCameraCapture
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onPhotosCaptured={handlePhotosFromCamera}
            />

            <MobileImageEditor
                isOpen={isEditorOpen}
                photos={capturedPhotos}
                onClose={() => setIsEditorOpen(false)}
                onAddMore={() => {
                    setIsEditorOpen(false);
                    setIsCameraOpen(true);
                }}
                onConfirmPhotos={handleEditedPhotosConfirm}
            />

            {/* Live Processing Status Tracker */}
            {processingLectureId && (
                <ProcessingStatusScreen
                    isOpen={Boolean(processingLectureId)}
                    lectureId={processingLectureId}
                    onCompleted={(id) => {
                        setProcessingLectureId(null);
                        onUploadSuccess(id);
                        onClose();
                    }}
                    onCancel={() => {
                        const id = processingLectureId;
                        setProcessingLectureId(null);
                        onUploadSuccess(id);
                        onClose();
                    }}
                />
            )}
        </>
    );
};
