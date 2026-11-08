export type UserRole = 'student' | 'researcher' | 'educator' | 'admin';

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    created_at: string;
}

export interface Workspace {
    id: string;
    user_id: string;
    name: string;
    description: string;
    created_at: string;
}

export interface Subject {
    id: string;
    workspace_id: string;
    name: string;
    code?: string;
    teacher?: string;
    semester?: string;
    description?: string;
    color: string;
    created_at: string;
}

export const ProcessingStatus = {
    PENDING: 'pending',
    PREPROCESSING: 'preprocessing',
    EXTRACTING: 'extracting',
    GENERATING_NOTES: 'generating_notes',
    GENERATING_DIAGRAMS: 'generating_diagrams',
    COMPLETED: 'completed',
    FAILED: 'failed',
} as const;
export type ProcessingStatus = typeof ProcessingStatus[keyof typeof ProcessingStatus];


export interface DetectedRegion {
    box_2d: number[]; // [ymin, xmin, ymax, xmax] in 0..1000
    label: string;
    confidence?: number;
    transcription?: string;
}

export interface LecturePage {
    id: string;
    lecture_id: string;
    page_number: number;
    file_path: string;
    original_filename: string;
    source_type: string;
    mime_type: string;
    file_size_bytes: number;
    width?: number;
    height?: number;
    regions: DetectedRegion[];
    created_at: string;
}

export interface NoteSection {
    heading: string;
    content: string;
    subsections: string[];
}

export interface DefinitionItem {
    term: string;
    definition: string;
    context?: string;
}

export interface EquationItem {
    latex_or_text: string;
    explanation: string;
    variables: Record<string, string>;
}

export interface StructuredNote {
    id: string;
    lecture_id: string;
    title: string;
    summary: string;
    sections: NoteSection[];
    key_definitions: DefinitionItem[];
    important_examples: string[];
    equations_and_formulas: EquationItem[];
    step_by_step_explanations: string[];
    concept_relationships: string[];
    key_takeaways: string[];
    original_transcription: string;
    ai_organized_notes: string;
    ai_added_explanations: string;
    user_markdown_override?: string;
    updated_at: string;
}

export type DiagramType = 'flowchart' | 'mind_map' | 'tree_hierarchy' | 'comparison_table' | 'sequence' | 'concept_map';

export interface DiagramArtifact {
    id: string;
    lecture_id: string;
    diagram_type: DiagramType;
    title: string;
    description: string;
    mermaid_code: string;
    elements_json: any;
    is_valid_syntax: boolean;
    created_at: string;
    updated_at: string;
}

export type QuestionType = 'qa' | 'multiple_choice' | 'short_answer';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ReviewStatus = 'new' | 'needs_review' | 'mastered';

export interface Flashcard {
    id: string;
    lecture_id: string;
    question_type: QuestionType;
    question: string;
    answer: string;
    explanation?: string;
    options: string[];
    correct_option_index?: number;
    difficulty: DifficultyLevel;
    review_status: ReviewStatus;
    tags: string[];
    source_citation?: string;
    created_at: string;
}

export interface ProcessingJob {
    id: string;
    lecture_id: string;
    workspace_id: string;
    stage: ProcessingStatus;
    progress: number;
    status: string; // 'running' | 'completed' | 'failed'
    error_message?: string;
    retry_count: number;
    created_at: string;
    updated_at: string;
}

export interface Lecture {
    id: string;
    workspace_id: string;
    subject_id?: string;
    user_id: string;
    title: string;
    teacher?: string;
    semester?: string;
    lecture_date?: string;
    tags: string[];
    status: ProcessingStatus;
    page_count: number;
    content_hash?: string;
    created_at: string;
    updated_at: string;
}

export interface Citation {
    citation_id: string;
    lecture_id: string;
    lecture_title: string;
    page_number: number;
    quote: string;
    region_box?: number[];
    is_verified: boolean;
}

export interface StudyChatMessage {
    id: string;
    workspace_id: string;
    lecture_id?: string;
    user_id: string;
    role: 'user' | 'assistant';
    content: string;
    citations: Citation[];
    created_at: string;
}

export interface CrossLectureConnection {
    id: string;
    workspace_id: string;
    source_lecture_id: string;
    source_lecture_title: string;
    target_lecture_id: string;
    target_lecture_title: string;
    concept_name: string;
    relationship_type: string;
    explanation: string;
    is_suggestion: boolean;
    confidence?: number;
    created_at: string;
}

export interface TimelineItem {
    lecture_id: string;
    title: string;
    subject_name: string;
    subject_color: string;
    teacher?: string;
    semester?: string;
    lecture_date?: string;
    created_at: string;
    status: string;
    summary: string;
    takeaways: string[];
    page_count: number;
    diagram_count: number;
}
