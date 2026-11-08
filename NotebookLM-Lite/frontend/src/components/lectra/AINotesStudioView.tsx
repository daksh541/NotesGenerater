import React, { useState, useRef } from 'react';
import {
    UploadCloud,
    FileText,
    Image as ImageIcon,
    Trash2,
    Sparkles,
    CheckCircle2,
    Loader2,
    Layers,
    BookOpen,
    UserCheck,
    Sliders,
    ArrowRight,
    FileSpreadsheet,
    Eye,
    AlertCircle,
    RotateCcw,
    Plus,
    X,
    ShieldCheck,
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

const TEN_PIPELINE_STAGES = [
    { index: 1, title: 'Upload Sources', desc: 'Securely staging whiteboard photos & reference files' },
    { index: 2, title: 'Validate Files', desc: 'Verifying MIME headers, extensions & 50MB limits' },
    { index: 3, title: 'Extract Text', desc: 'Parsing PDF chapters, PPTX slides, tables & notes' },
    { index: 4, title: 'OCR Images', desc: 'Orientation fix, smart board crop, denoise & handwriting OCR' },
    { index: 5, title: 'Analyze References', desc: 'Learning chapter structure & professor terminology' },
    { index: 6, title: 'Merge Context', desc: 'Anchoring on reference foundation + classroom derivations' },
    { index: 7, title: 'Generate Master Notes', desc: 'Synthesizing 14 sections + Mermaid & SVG diagrams' },
    { index: 8, title: 'Validate Output', desc: 'Verifying all 14 sections, citations & diagram syntax' },
    { index: 9, title: 'Save to Database', desc: 'Persisting Master Notes, Diagrams, Study Kit & Vault' },
    { index: 10, title: 'Display Notes', desc: 'Opening verified Master Notes in the interactive editor' },
];

interface StagedFile {
    id: string;
    file: File;
    previewUrl?: string;
    materialType: SourceMaterialType;
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
    const [title, setTitle] = useState('Distributed Consensus & Fault-Tolerant State Machines');
    const [selectedSubjectId, setSelectedSubjectId] = useState(
        currentSubject?.id || subjects[0]?.id || 'subj_cs244'
    );
    const [chapter, setChapter] = useState('Chapter 4: Consensus in Fault-Tolerant Clusters');
    const [selectedProfessor, setSelectedProfessor] = useState(
        initialProfessorName || professors[0]?.name || 'Dr. Aris Thorne'
    );
    const [primarySection, setPrimarySection] = useState<SectionId>(effectiveSection);
    const [sourceSections, setSourceSections] = useState<SectionId[]>(['A', 'C']);
    const [generationStyle, setGenerationStyle] = useState<GenerationStyle>('comprehensive');

    const [isDragging, setIsDragging] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pipelineJob, setPipelineJob] = useState<ProcessingPipelineJob | null>(null);
    const [previewModalFile, setPreviewModalFile] = useState<StagedFile | null>(null);

    // Workspace creation modal state
    const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
    const [newWsName, setNewWsName] = useState('');
    const [newSubjName, setNewSubjName] = useState('');
    const [newSubjCode, setNewSubjCode] = useState('');
    const [creatingWs, setCreatingWs] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (subjects.length > 0) {
            setLocalSubjects(subjects);
        }
    }, [subjects]);

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
                    `Unsupported file "${f.name}". Supported formats: JPG, JPEG, PNG, WEBP, PDF, PPTX.`
                );
                continue;
            }
            if (f.size === 0) {
                setValidationError(`File "${f.name}" is empty (0 bytes).`);
                continue;
            }
            if (f.size > MAX_FILE_SIZE_BYTES) {
                setValidationError(
                    `File "${f.name}" (${(f.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 50 MB size limit.`
                );
                continue;
            }

            const isImg = f.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
            validNewFiles.push({
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                file: f,
                previewUrl: isImg ? URL.createObjectURL(f) : undefined,
                materialType: inferMaterialType(f),
            });
        }

        if (validNewFiles.length > 0) {
            setStagedFiles((prev) => [...prev, ...validNewFiles]);
        }
    };

    const removeFile = (id: string) => {
        setStagedFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const updateMaterialType = (id: string, materialType: SourceMaterialType) => {
        setStagedFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, materialType } : f))
        );
    };

    const toggleSourceSection = (sec: SectionId) => {
        setSourceSections((prev) =>
            prev.includes(sec)
                ? prev.length > 1
                    ? prev.filter((s) => s !== sec)
                    : prev
                : [...prev, sec]
        );
    };

    const addSampleDemoFiles = () => {
        setValidationError(null);
        // Generate valid minimal PNG bytes so Pillow processes real pixels
        const base64Png =
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        const binStr = atob(base64Png);
        const pngBytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
            pngBytes[i] = binStr.charCodeAt(i);
        }
        const whiteboardBlob = new Blob([pngBytes], { type: 'image/png' });
        const whiteboardFile = new File([whiteboardBlob], 'Whiteboard_SectionA_Consensus_Proof.png', {
            type: 'image/png',
        });

        const pdfText =
            '%PDF-1.4\nChapter 4: Consensus in Fault-Tolerant Clusters\nDefinition: Primary Safety Invariant - A predicate P(s) that holds across all valid state transitions.\nQuorum Intersection Theorem: Q = floor(N/2) + 1.';
        const pdfBlob = new Blob([pdfText], { type: 'application/pdf' });
        const pdfFile = new File([pdfBlob], 'Prof_Thorne_Official_Chapter4_Reference.pdf', {
            type: 'application/pdf',
        });

        handleFilesAdded([whiteboardFile, pdfFile]);
    };

    const pollPipelineUntilComplete = (jobId: string, lectureId: string) => {
        const pollInterval = setInterval(async () => {
            try {
                const jobStatus = await lectraApi.getPipelineStatus(jobId);
                setPipelineJob(jobStatus);
                if (jobStatus.status === 'completed') {
                    clearInterval(pollInterval);
                    setTimeout(() => {
                        setIsProcessing(false);
                        onNoteGenerated(lectureId);
                    }, 500);
                } else if (jobStatus.status === 'failed') {
                    clearInterval(pollInterval);
                    setIsProcessing(false);
                }
            } catch {
                clearInterval(pollInterval);
                setIsProcessing(false);
            }
        }, 380);
    };

    const handleStartSynthesis = async () => {
        if (!title.trim()) {
            setValidationError('Please enter a Lecture / Master Note Title.');
            return;
        }
        setValidationError(null);

        let filesToSend = stagedFiles;
        if (filesToSend.length === 0) {
            const base64Png =
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
            const binStr = atob(base64Png);
            const pngBytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) pngBytes[i] = binStr.charCodeAt(i);
            const autoFile = new File([new Blob([pngBytes], { type: 'image/png' })], 'Classroom_Whiteboard_Capture.png', {
                type: 'image/png',
            });
            filesToSend = [
                {
                    id: 'auto_board',
                    file: autoFile,
                    materialType: 'whiteboard',
                },
            ];
        }

        setIsProcessing(true);
        setUploadProgress(10);
        setPipelineJob({
            id: 'init',
            lecture_id: 'pending',
            stage_index: 1,
            total_stages: 10,
            stage_name: 'Upload Sources',
            progress: 8,
            status: 'running',
            details: 'Uploading whiteboard photographs and reference documents...',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        const formData = new FormData();
        filesToSend.forEach((sf) => formData.append('files', sf.file));
        formData.append(
            'material_types',
            filesToSend.map((sf) => sf.materialType).join(',')
        );
        formData.append('title', title);
        formData.append('subject_id', selectedSubjectId);
        formData.append('chapter', chapter);
        formData.append('professor_name', selectedProfessor);
        formData.append('section', primarySection);
        formData.append('source_sections', sourceSections.join(','));
        formData.append('generation_style', generationStyle);

        try {
            const { lecture_id, job_id } = await lectraApi.uploadAndProcess(formData, (pct) => {
                setUploadProgress(pct);
            });
            setUploadProgress(100);
            pollPipelineUntilComplete(job_id, lecture_id);
        } catch (err: any) {
            const detail = err?.response?.data?.detail || 'Failed to upload and process files.';
            setValidationError(detail);
            setIsProcessing(false);
        }
    };

    const handleRetryJob = async () => {
        if (!pipelineJob || pipelineJob.id === 'init') return;
        setIsProcessing(true);
        setValidationError(null);
        try {
            const res = await lectraApi.retryPipelineJob(pipelineJob.id);
            pollPipelineUntilComplete(res.job_id, res.lecture_id);
        } catch (err: any) {
            setValidationError(err?.response?.data?.detail || 'Retry failed');
            setIsProcessing(false);
        }
    };

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWsName.trim()) return;
        setCreatingWs(true);
        try {
            const res = await lectraApi.createWorkspace({
                name: newWsName.trim(),
                subject_name: newSubjName.trim() || newWsName.trim(),
                subject_code: newSubjCode.trim() || 'CS-NEW',
                professor_name: selectedProfessor,
            });
            if (res.subject) {
                setLocalSubjects((prev) => [res.subject!, ...prev]);
                setSelectedSubjectId(res.subject.id);
            }
            setShowWorkspaceModal(false);
            setNewWsName('');
            setNewSubjName('');
            setNewSubjCode('');
            if (onWorkspaceCreated) onWorkspaceCreated();
        } finally {
            setCreatingWs(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Studio Banner */}
            <div className="bg-gradient-to-r from-[#0B132B] via-[#1E293B] to-[#1E3A8A] rounded-2xl p-6 text-white shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            PHASE 3 • LECTRA AI MASTER NOTES ENGINE
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Whiteboard Photo + Official PDF/PPT + Professor Context → Master Notes
                        </h1>
                        <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                            Upload classroom whiteboard photographs alongside official reference PDFs or PPTX slide decks.
                            LECTRA preprocesses board images, runs handwriting OCR with uncertainty tracking, anchors on your
                            reference document structure, and synthesizes a 14-section Master Note.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 self-start">
                        <button
                            onClick={() => setShowWorkspaceModal(true)}
                            className="px-3.5 py-2 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/40 border border-indigo-300/30 text-xs font-semibold text-white transition flex items-center gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Workspace / Subject
                        </button>
                        <button
                            onClick={addSampleDemoFiles}
                            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition flex items-center gap-2"
                        >
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            + Load Demo Whiteboard & PDF
                        </button>
                    </div>
                </div>
            </div>

            {validationError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-red-800 text-sm">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        <span>{validationError}</span>
                    </div>
                    <button
                        onClick={() => setValidationError(null)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Multi-File Ingestion & Configuration (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Drag & Drop Zone */}
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
                        className={`cursor-pointer border-2 border-dashed rounded-2xl p-7 text-center transition-all ${
                            isDragging
                                ? 'border-blue-600 bg-blue-50/70'
                                : 'border-slate-300 hover:border-blue-500 bg-white'
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
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <UploadCloud className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                            Drop Classroom Whiteboard Photos, Reference PDFs, or PPTX Slides
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Supports <span className="font-semibold text-slate-700">JPG, JPEG, PNG, WEBP, PDF, PPTX</span> • Max 50MB per file • Automatic orientation & contrast enhancement
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                            {[
                                'Whiteboard Photos (.jpg/.png/.webp)',
                                'Official Chapter PDFs (.pdf)',
                                'Professor Slides (.pptx)',
                                'Handwritten Notebook Scans',
                            ].map((tag) => (
                                <span
                                    key={tag}
                                    className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Upload Progress Bar when uploading */}
                    {isProcessing && uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
                            <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-1.5">
                                <span>Uploading Source Files to Secure Lecture Storage...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-200"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Staged Files Queue with Previews & Material Type Selector */}
                    {stagedFiles.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Staged Source Materials ({stagedFiles.length})
                                </h4>
                                <button
                                    onClick={() => setStagedFiles([])}
                                    className="text-xs text-red-600 hover:underline font-medium"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="space-y-2.5">
                                {stagedFiles.map((sf) => (
                                    <div
                                        key={sf.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {sf.previewUrl ? (
                                                <img
                                                    src={sf.previewUrl}
                                                    alt={sf.file.name}
                                                    onClick={() => setPreviewModalFile(sf)}
                                                    className="w-11 h-11 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-80"
                                                />
                                            ) : sf.file.name.toLowerCase().endsWith('.pptx') ||
                                              sf.file.name.toLowerCase().endsWith('.ppt') ? (
                                                <div className="w-11 h-11 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                                    <FileSpreadsheet className="w-5 h-5" />
                                                </div>
                                            ) : (
                                                <div className="w-11 h-11 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-800 truncate">
                                                    {sf.file.name}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <select
                                                        value={sf.materialType}
                                                        onChange={(e) =>
                                                            updateMaterialType(
                                                                sf.id,
                                                                e.target.value as SourceMaterialType
                                                            )
                                                        }
                                                        className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase border-none focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="whiteboard">Whiteboard Photo</option>
                                                        <option value="blackboard">Blackboard Photo</option>
                                                        <option value="handwritten_notes">Handwritten Notes</option>
                                                        <option value="reference_pdf">Official Reference PDF</option>
                                                        <option value="professor_slides">Professor PPTX Slides</option>
                                                        <option value="syllabus">Course Syllabus</option>
                                                    </select>
                                                    <span className="text-[11px] text-slate-400">
                                                        {(sf.file.size / 1024).toFixed(1)} KB
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewModalFile(sf)}
                                                title="Preview File"
                                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(sf.id)}
                                                title="Remove File"
                                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Context & Metadata Form */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-blue-700" />
                                <h3 className="text-sm font-bold text-slate-900">
                                    Academic Context & Professor Calibration
                                </h3>
                            </div>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Server-Side Grounded Synthesis
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Lecture / Master Note Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                placeholder="e.g., Raft Consensus & Replicated State Machines"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Course / Subject
                                </label>
                                <select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    {localSubjects.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.code} — {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Chapter / Module
                                </label>
                                <input
                                    type="text"
                                    value={chapter}
                                    onChange={(e) => setChapter(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Professor Profile (Terminology & Style)
                                </label>
                                <select
                                    value={selectedProfessor}
                                    onChange={(e) => setSelectedProfessor(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    {professors.map((p) => (
                                        <option key={p.id} value={p.name}>
                                            {p.name} ({p.department})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Primary Classroom Section
                                </label>
                                <select
                                    value={primarySection}
                                    onChange={(e) => setPrimarySection(e.target.value as SectionId)}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    {ALL_SECTIONS.map((sec) => (
                                        <option key={sec} value={sec}>
                                            Section {sec}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Multi-Section Merge Selector */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Contributing Sections Merged (Cross-Section Synthesis)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {ALL_SECTIONS.map((sec) => {
                                    const active = sourceSections.includes(sec);
                                    return (
                                        <button
                                            key={sec}
                                            type="button"
                                            onClick={() => toggleSourceSection(sec)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                                active
                                                    ? 'bg-[#0B132B] text-white border-[#0B132B] shadow-sm'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            Sec {sec}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Synthesis Depth */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Synthesis Mode
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'comprehensive', label: 'Comprehensive Master', desc: 'All 14 sections + proofs' },
                                    { id: 'exam_focused', label: 'Exam High-Yield', desc: 'Formulas & likely questions' },
                                    { id: 'deep_dive', label: 'Theoretical Deep-Dive', desc: 'Rigorous derivations' },
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => setGenerationStyle(mode.id as GenerationStyle)}
                                        className={`p-3 rounded-xl border text-left transition ${
                                            generationStyle === mode.id
                                                ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                                                : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="text-xs font-bold text-slate-900">{mode.label}</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">{mode.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleStartSynthesis}
                            disabled={isProcessing}
                            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#0B132B] to-blue-800 hover:from-slate-900 hover:to-blue-900 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Executing 10-Stage AI Master Notes Pipeline...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    Synthesize 14-Section Master Notes & Reconstruct Diagrams
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Column: Live 10-Stage AI Processing Pipeline Monitor (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    10-Stage AI Synthesis Pipeline
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Real-time background OCR, reference grounding, conflict detection & validation
                                </p>
                            </div>
                            {pipelineJob && (
                                <span
                                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                        pipelineJob.status === 'failed'
                                            ? 'bg-red-100 text-red-700'
                                            : pipelineJob.status === 'completed'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-blue-100 text-blue-800'
                                    }`}
                                >
                                    {pipelineJob.progress}%
                                </span>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-5">
                            <div
                                className={`h-full transition-all duration-300 ${
                                    pipelineJob?.status === 'failed'
                                        ? 'bg-red-500'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                                }`}
                                style={{ width: `${pipelineJob ? pipelineJob.progress : 0}%` }}
                            />
                        </div>

                        {pipelineJob?.status === 'failed' && (
                            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3">
                                <div className="text-xs text-red-800">
                                    <span className="font-bold">Pipeline Error:</span>{' '}
                                    {pipelineJob.error_message || pipelineJob.details}
                                </div>
                                <button
                                    onClick={handleRetryJob}
                                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Retry Job
                                </button>
                            </div>
                        )}

                        <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                            {TEN_PIPELINE_STAGES.map((stage) => {
                                const currentIdx = pipelineJob?.stage_index || 0;
                                const isCompleted =
                                    pipelineJob?.status === 'completed' || currentIdx > stage.index;
                                const isActive = isProcessing && currentIdx === stage.index;

                                return (
                                    <div
                                        key={stage.index}
                                        className={`p-3 rounded-xl border transition flex items-start gap-3 ${
                                            isActive
                                                ? 'border-blue-500 bg-blue-50/60 shadow-sm'
                                                : isCompleted
                                                ? 'border-emerald-200 bg-emerald-50/30'
                                                : 'border-slate-200/70 bg-slate-50/60 opacity-75'
                                        }`}
                                    >
                                        <div className="mt-0.5">
                                            {isCompleted ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            ) : isActive ? (
                                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-400">
                                                    {stage.index}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-slate-900">
                                                    Stage {stage.index}: {stage.title}
                                                </h4>
                                                {isActive && (
                                                    <span className="text-[10px] font-bold uppercase text-blue-700">
                                                        Running
                                                    </span>
                                                )}
                                                {isCompleted && (
                                                    <span className="text-[10px] font-bold uppercase text-emerald-700">
                                                        Done
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {isActive && pipelineJob?.details
                                                    ? pipelineJob.details
                                                    : stage.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Professor Context Preview Card */}
                    {professors.find((p) => p.name === selectedProfessor) && (
                        <div className="bg-[#0B132B] text-white rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                                <UserCheck className="w-4 h-4" />
                                Active Professor Style Calibration
                            </div>
                            {(() => {
                                const prof = professors.find((p) => p.name === selectedProfessor)!;
                                return (
                                    <div className="space-y-2 text-xs">
                                        <div className="font-bold text-sm">{prof.name}</div>
                                        <p className="text-slate-300">{prof.teaching_style}</p>
                                        <div className="pt-2 border-t border-slate-800">
                                            <span className="text-slate-400 font-semibold">
                                                Formatting Convention:
                                            </span>{' '}
                                            <span className="text-slate-200">
                                                {prof.formatting_preferences}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* File Preview Modal */}
            {previewModalFile && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    {previewModalFile.file.name}
                                </h3>
                                <p className="text-xs text-slate-500 uppercase font-semibold">
                                    {previewModalFile.materialType.replace('_', ' ')} •{' '}
                                    {(previewModalFile.file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewModalFile(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {previewModalFile.previewUrl ? (
                            <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-center max-h-[420px] overflow-hidden">
                                <img
                                    src={previewModalFile.previewUrl}
                                    alt={previewModalFile.file.name}
                                    className="max-h-[380px] object-contain rounded"
                                />
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center space-y-2">
                                <FileText className="w-10 h-10 text-blue-600 mx-auto" />
                                <p className="text-sm font-bold text-slate-800">
                                    Reference Document Staged for Parsing & OCR
                                </p>
                                <p className="text-xs text-slate-500">
                                    LECTRA will extract chapter headings, formal definitions, formulas, tables, and speaker notes during Stage 3 & Stage 5.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Workspace & Course Subject Modal */}
            {showWorkspaceModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <form
                        onSubmit={handleCreateWorkspace}
                        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">
                                Create New Academic Workspace & Subject
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowWorkspaceModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Workspace Name
                            </label>
                            <input
                                type="text"
                                required
                                value={newWsName}
                                onChange={(e) => setNewWsName(e.target.value)}
                                placeholder="e.g., Fall 2026 Distributed Systems Honors"
                                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Subject Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newSubjCode}
                                    onChange={(e) => setNewSubjCode(e.target.value)}
                                    placeholder="e.g., CS-244B"
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Subject Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newSubjName}
                                    onChange={(e) => setNewSubjName(e.target.value)}
                                    placeholder="e.g., Advanced Cloud Systems"
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowWorkspaceModal(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creatingWs}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                            >
                                {creatingWs ? 'Creating...' : 'Create Workspace'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
