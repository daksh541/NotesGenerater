import React, { useState, useRef, useEffect } from 'react';
import {
    UploadCloud,
    FileText,
    Trash2,
    Sparkles,
    Loader2,
    Sliders,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Eye,
    Plus,
    X,
    FileSpreadsheet,
    Layers,
    ArrowRight,
} from 'lucide-react';
import {
    GenerationStyle,
    ProcessingPipelineJob,
    ProfessorProfile,
    SectionId,
    SourceMaterialType,
    SubjectModel,
} from '../../types/lectra';
import { lectraApi } from '../../services/lectraApi';

interface AINotesStudioViewProps {
    subjects: SubjectModel[];
    professors: ProfessorProfile[];
    userSection?: SectionId;
    currentSection?: SectionId;
    currentSubject?: SubjectModel | null;
    userProfile?: any;
    initialProfessorName?: string;
    onNoteGenerated: (noteOrLectureId: any) => void;
    onWorkspaceCreated?: () => void;
}

const ALL_SECTIONS: SectionId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.pptx', '.ppt'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// Student-friendly progress stages (replaces complex raw backend pipeline jargon)
const FRIENDLY_STAGES = [
    { threshold: 15, label: 'Reading uploaded materials and whiteboard photos...', detail: 'Extracting legible diagrams, equations and slide content.' },
    { threshold: 40, label: 'Organizing topics by professor syllabus...', detail: 'Harmonizing textbook definitions with classroom lecture derivations.' },
    { threshold: 70, label: 'Synthesizing structured Master Notes...', detail: 'Generating comprehensive sections, clean formulas and diagrams.' },
    { threshold: 90, label: 'Validating definitions and references...', detail: 'Ensuring accuracy and cross-referencing citations across sections.' },
    { threshold: 100, label: 'Preparing your Master Notes Viewer...', detail: 'Creating your interactive document and study kit.' },
];

interface StagedFile {
    id: string;
    file: File;
    previewUrl?: string;
    materialType: SourceMaterialType;
    status: 'ready' | 'uploading' | 'verified';
}

export const AINotesStudioView: React.FC<AINotesStudioViewProps> = ({
    subjects,
    professors,
    userSection,
    currentSection,
    currentSubject,
    initialProfessorName,
    onNoteGenerated,
    onWorkspaceCreated,
}) => {
    const effectiveSection = userSection || currentSection || 'A';
    const [localSubjects, setLocalSubjects] = useState<SubjectModel[]>(subjects);
    const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
    
    // Core Configuration
    const [selectedSubjectId, setSelectedSubjectId] = useState(
        currentSubject?.id || subjects[0]?.id || 'subj_cs244'
    );
    const [chapter, setChapter] = useState('Chapter 4: Consensus in Fault-Tolerant Clusters');
    const [title, setTitle] = useState('Distributed Consensus & Fault-Tolerant State Machines');
    const [selectedProfessor, setSelectedProfessor] = useState(
        initialProfessorName || professors[0]?.name || 'Dr. Aris Thorne'
    );
    const [primarySection, setPrimarySection] = useState<SectionId>(effectiveSection);
    const [generationStyle, setGenerationStyle] = useState<GenerationStyle>('comprehensive');

    // Advanced Settings (Collapsible)
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [sourceSections, setSourceSections] = useState<SectionId[]>([effectiveSection]);

    // Drag, Upload & Progress State
    const [isDragging, setIsDragging] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewModalFile, setPreviewModalFile] = useState<StagedFile | null>(null);
    const pollIntervalRef = useRef<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (subjects.length > 0) {
            setLocalSubjects(subjects);
        }
    }, [subjects]);

    useEffect(() => {
        if (currentSubject) {
            setSelectedSubjectId(currentSubject.id);
        }
    }, [currentSubject]);

    // Clean up polling on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    const inferMaterialType = (f: File): SourceMaterialType => {
        const lower = f.name.toLowerCase();
        if (lower.endsWith('.pdf')) {
            return lower.includes('syllabus') ? 'syllabus' : 'reference_pdf';
        }
        if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
            return 'professor_slides';
        }
        if (lower.includes('blackboard')) return 'blackboard';
        if (lower.includes('hand') || lower.includes('note')) return 'handwritten_notes';
        return 'whiteboard';
    };

    const handleFilesAdded = (fileList: FileList | File[]) => {
        setValidationError(null);
        const filesArray = Array.from(fileList);
        const validNewFiles: StagedFile[] = [];

        for (const f of filesArray) {
            const dotIdx = f.name.lastIndexOf('.');
            const ext = dotIdx >= 0 ? f.name.slice(dotIdx).toLowerCase() : '';
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                setValidationError(
                    `Unsupported file "${f.name}". Supported: JPG, JPEG, PNG, WEBP, PDF, PPTX.`
                );
                continue;
            }
            if (f.size === 0) {
                setValidationError(`File "${f.name}" is empty (0 bytes).`);
                continue;
            }
            if (f.size > MAX_FILE_SIZE_BYTES) {
                setValidationError(
                    `File "${f.name}" exceeds the 50 MB limit.`
                );
                continue;
            }

            const isImg = f.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
            validNewFiles.push({
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                file: f,
                previewUrl: isImg ? URL.createObjectURL(f) : undefined,
                materialType: inferMaterialType(f),
                status: 'ready',
            });
        }

        if (validNewFiles.length > 0) {
            setStagedFiles((prev) => [...prev, ...validNewFiles]);
        }
    };

    const removeFile = (id: string) => {
        setStagedFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const addSampleDemoFiles = () => {
        const svgWhiteboard = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
            <rect width="100%" height="100%" fill="#ffffff"/>
            <text x="40" y="70" font-family="sans-serif" font-size="24" font-weight="bold" fill="#1e293b">CS-244: Raft Consensus Invariants</text>
            <text x="40" y="120" font-family="sans-serif" font-size="16" fill="#334155">1. Election Safety: At most one leader can be elected in a given term.</text>
            <text x="40" y="160" font-family="sans-serif" font-size="16" fill="#334155">2. Leader Append-Only: A leader never overwrites or truncates its log.</text>
            <text x="40" y="200" font-family="sans-serif" font-size="16" fill="#334155">Quorum: floor(N / 2) + 1</text>
        </svg>`;
        const svgBlob = new Blob([svgWhiteboard], { type: 'image/svg+xml' });
        const whiteboardFile = new File([svgBlob], 'Classroom_Whiteboard_Raft_Invariants.png', {
            type: 'image/png',
        });

        const pdfText =
            '%PDF-1.4\nChapter 4: Consensus in Fault-Tolerant Clusters\nDefinition: Primary Safety Invariant - A predicate P(s) that holds across all valid state transitions.\nQuorum Intersection Theorem: Q = floor(N/2) + 1.';
        const pdfBlob = new Blob([pdfText], { type: 'application/pdf' });
        const pdfFile = new File([pdfBlob], 'Prof_Thorne_Chapter4_Reference.pdf', {
            type: 'application/pdf',
        });

        handleFilesAdded([whiteboardFile, pdfFile]);
    };

    const pollPipelineUntilComplete = (jobId: string, lectureId: string) => {
        pollIntervalRef.current = setInterval(async () => {
            try {
                const jobStatus = await lectraApi.getPipelineStatus(jobId);
                const progressNum = jobStatus.progress || 0;
                setUploadProgress(Math.max(10, progressNum));

                if (jobStatus.status === 'completed') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    setUploadProgress(100);
                    setTimeout(() => {
                        setIsProcessing(false);
                        onNoteGenerated(lectureId);
                    }, 400);
                } else if (jobStatus.status === 'failed') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    setIsProcessing(false);
                    setValidationError('Generation encountered an issue. Please try again.');
                }
            } catch {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                setIsProcessing(false);
            }
        }, 500);
    };

    const handleCancelProcessing = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        setIsProcessing(false);
        setUploadProgress(0);
    };

    const handleStartSynthesis = async () => {
        if (!chapter.trim()) {
            setValidationError('Please enter a Chapter or Topic name.');
            return;
        }
        setValidationError(null);

        let filesToSend = stagedFiles;
        if (filesToSend.length === 0) {
            // Provide sample material if user triggers generation without uploading files
            const base64Png =
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
            const binStr = atob(base64Png);
            const pngBytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) pngBytes[i] = binStr.charCodeAt(i);
            const autoFile = new File([new Blob([pngBytes], { type: 'image/png' })], 'Classroom_Whiteboard_Lecture.png', {
                type: 'image/png',
            });
            filesToSend = [
                {
                    id: 'auto_board',
                    file: autoFile,
                    materialType: 'whiteboard',
                    status: 'ready',
                },
            ];
        }

        setIsProcessing(true);
        setUploadProgress(15);

        const formData = new FormData();
        filesToSend.forEach((sf) => formData.append('files', sf.file));
        formData.append('material_types', filesToSend.map((sf) => sf.materialType).join(','));
        formData.append('title', title.trim() || chapter.trim());
        formData.append('subject_id', selectedSubjectId);
        formData.append('chapter', chapter.trim());
        formData.append('professor_name', selectedProfessor);
        formData.append('section', primarySection);
        formData.append('source_sections', sourceSections.join(','));
        formData.append('generation_style', generationStyle);

        try {
            const { lecture_id, job_id } = await lectraApi.uploadAndProcess(formData, (pct) => {
                setUploadProgress(Math.max(15, Math.min(pct, 35)));
            });
            pollPipelineUntilComplete(job_id, lecture_id);
        } catch (err: any) {
            const detail = err?.response?.data?.detail || 'Failed to start notes synthesis.';
            setValidationError(detail);
            setIsProcessing(false);
        }
    };

    const currentStageInfo = FRIENDLY_STAGES.find((s) => uploadProgress <= s.threshold) || FRIENDLY_STAGES[FRIENDLY_STAGES.length - 1];

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-fade-in">
            {/* Header */}
            <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                    <Sparkles size={14} />
                    <span>AI Notes Studio</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                    Create Master Notes
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Transform classroom whiteboard photos and reference PDFs into unified, structured academic notes.
                </p>
            </div>

            {validationError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between text-rose-800 text-xs dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{validationError}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setValidationError(null)}
                        className="font-medium underline hover:text-rose-900"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Processing Overlay / In-Progress Card */}
            {isProcessing && (
                <div className="rounded-xl border border-indigo-200 bg-white p-6 shadow-md dark:border-indigo-900/60 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                {currentStageInfo.label}
                            </h3>
                        </div>
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {uploadProgress}%
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                            className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>

                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {currentStageInfo.detail}
                    </p>

                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={handleCancelProcessing}
                            className="text-xs font-medium text-slate-400 hover:text-rose-600 transition"
                        >
                            Cancel Generation
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 1: Upload Materials */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                            1
                        </span>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Upload Materials
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={addSampleDemoFiles}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition flex items-center gap-1"
                    >
                        <span>+ Load Sample Board & PDF</span>
                    </button>
                </div>

                {/* Drag-and-drop zone */}
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                        isDragging
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                            : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/60'
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.pdf,.ppt,.pptx"
                        className="hidden"
                        onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
                    />
                    <UploadCloud className="mx-auto h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-2" />
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Drag and drop whiteboard photos, slides, or reference PDFs
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                        JPG, JPEG, PNG, WEBP, PDF, PPTX (up to 50 MB)
                    </p>
                </div>

                {/* Compact Uploaded File Cards */}
                {stagedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                            <span>Uploaded Sources ({stagedFiles.length})</span>
                            <button
                                type="button"
                                onClick={() => setStagedFiles([])}
                                className="text-rose-500 hover:underline capitalize"
                            >
                                Clear All
                            </button>
                        </div>
                        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200/80 bg-white overflow-hidden dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                            {stagedFiles.map((sf) => (
                                <div
                                    key={sf.id}
                                    className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition gap-3"
                                >
                                    <div className="flex items-center space-x-2.5 min-w-0">
                                        {sf.previewUrl ? (
                                            <img
                                                src={sf.previewUrl}
                                                alt={sf.file.name}
                                                className="h-8 w-8 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                            />
                                        ) : sf.file.name.toLowerCase().endsWith('.pptx') ? (
                                            <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 shrink-0">
                                                <FileSpreadsheet size={16} />
                                            </div>
                                        ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 shrink-0">
                                                <FileText size={16} />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                                {sf.file.name}
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                <span>{(sf.file.size / 1024).toFixed(0)} KB</span>
                                                <span>•</span>
                                                <span className="capitalize">{sf.materialType.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2 shrink-0">
                                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                            Ready
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(sf.id)}
                                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                                            title="Remove"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* STEP 2: Configure Notes */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center space-x-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        2
                    </span>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Configure Notes
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Subject */}
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Course / Subject
                        </label>
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                            {localSubjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.code} — {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Chapter */}
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Chapter / Topic
                        </label>
                        <input
                            type="text"
                            value={chapter}
                            onChange={(e) => setChapter(e.target.value)}
                            placeholder="e.g. Chapter 4: Distributed Consensus"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        />
                    </div>

                    {/* Professor */}
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Professor
                        </label>
                        <select
                            value={selectedProfessor}
                            onChange={(e) => setSelectedProfessor(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                            {professors.map((p) => (
                                <option key={p.id} value={p.name}>
                                    {p.name} ({p.department})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Section */}
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Section
                        </label>
                        <select
                            value={primarySection}
                            onChange={(e) => setPrimarySection(e.target.value as SectionId)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                            {ALL_SECTIONS.map((sec) => (
                                <option key={sec} value={sec}>
                                    Section {sec}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Notes Style */}
                <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Notes Style
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                            {
                                id: 'comprehensive',
                                label: 'Comprehensive Master',
                                desc: 'Full definitions, derivations & diagrams',
                            },
                            {
                                id: 'exam_focused',
                                label: 'Exam High-Yield',
                                desc: 'Focus on formulas & test problems',
                            },
                            {
                                id: 'deep_dive',
                                label: 'Theoretical Deep-Dive',
                                desc: 'Rigorous proofs & edge cases',
                            },
                        ].map((mode) => (
                            <button
                                key={mode.id}
                                type="button"
                                onClick={() => setGenerationStyle(mode.id as GenerationStyle)}
                                className={`p-3 rounded-lg border text-left transition ${
                                    generationStyle === mode.id
                                        ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-600 dark:bg-indigo-950/30'
                                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40'
                                }`}
                            >
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                    {mode.label}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {mode.desc}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Collapsible Advanced Settings */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center space-x-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
                    >
                        <ChevronRight
                            size={13}
                            className={`transition-transform duration-150 ${showAdvanced ? 'rotate-90' : ''}`}
                        />
                        <span>Advanced Settings</span>
                    </button>

                    {showAdvanced && (
                        <div className="mt-3 p-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3 animate-fade-in">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Document Title Override
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Custom title for exported documents"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Cross-Section Cross-Referencing
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {ALL_SECTIONS.map((sec) => {
                                        const active = sourceSections.includes(sec);
                                        return (
                                            <button
                                                key={sec}
                                                type="button"
                                                onClick={() => {
                                                    setSourceSections((prev) =>
                                                        prev.includes(sec)
                                                            ? prev.filter((s) => s !== sec)
                                                            : [...prev, sec]
                                                    );
                                                }}
                                                className={`px-2.5 py-1 rounded text-xs font-medium border transition ${
                                                    active
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                Sec {sec}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* STEP 3: Generate */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-400">
                    Generates unified notes with theorems, proofs, code, and study diagrams.
                </p>

                <button
                    type="button"
                    onClick={handleStartSynthesis}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Synthesizing Notes...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={15} />
                            <span>Generate Master Notes</span>
                            <ArrowRight size={14} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
