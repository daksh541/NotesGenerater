export type SectionId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

export type VerificationStatus = 'unverified' | 'community_reviewed' | 'source_verified';

export type SourceMaterialType =
    | 'whiteboard'
    | 'blackboard'
    | 'handwritten_notes'
    | 'reference_pdf'
    | 'professor_slides'
    | 'syllabus';

export type GenerationStyle = 'comprehensive' | 'exam_focused' | 'deep_dive';

export type StorageBucketType =
    | 'private-student-uploads'
    | 'shared-academic-materials'
    | 'generated-documents'
    | 'generated-diagrams';

export type WorkspaceStatus = 'draft' | 'active' | 'processing' | 'completed' | 'archived';

export type VisibilityType = 'private' | 'section' | 'public';

export interface UniversityModel {
    id: string;
    name: string;
    domain?: string;
    location?: string;
    created_at: string;
}

export interface CourseModel {
    id: string;
    university_id: string;
    course_name: string;
    course_code: string;
    department?: string;
    created_at: string;
}

export interface ChapterModel {
    id: string;
    subject_id: string;
    chapter_name: string;
    chapter_number: number;
    created_at: string;
}

export interface AcademicCatalog {
    universities: UniversityModel[];
    courses: CourseModel[];
    subjects: SubjectModel[];
    professors: ProfessorProfile[];
    chapters: ChapterModel[];
    sections: SectionId[];
}

export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    university_id?: string;
    university: string;
    course_id?: string;
    course: string;
    subject_id?: string;
    subject?: string;
    semester?: string;
    section: SectionId;
    role: string;
    avatar_url?: string;
    bio?: string;
    email_verified?: boolean;
    onboarding_completed?: boolean;
    created_at: string;
}

export interface AuthSessionResponse {
    message?: string;
    token: string;
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
    verification_token?: string;
    user: UserProfile;
}

export interface WorkspaceModel {
    id: string;
    user_id?: string;
    subject_id?: string;
    chapter_id?: string;
    professor_id?: string;
    section?: SectionId;
    lecture_date?: string;
    name: string;
    title?: string;
    status?: WorkspaceStatus;
    visibility?: VisibilityType;
    university: string;
    department: string;
    semester: string;
    owner_id: string;
    description?: string;
    created_at: string;
}

export interface ProfessorProfile {
    id: string;
    name: string;
    title: string;
    department: string;
    email?: string;
    avatar_url?: string;
    subjects_taught: string[];
    sections_taught: SectionId[];
    teaching_style: string;
    exam_focus_topics: string[];
    preferred_terminology: Record<string, string>;
    formatting_preferences: string;
    reference_materials_count: number;
    created_at: string;
}

export interface SubjectModel {
    id: string;
    workspace_id: string;
    name: string;
    code: string;
    teacher: string;
    professor_id?: string;
    semester: string;
    description?: string;
    color: string;
    chapters_count: number;
    active_sections: SectionId[];
    created_at: string;
}

export interface UploadedSourceItem {
    id: string;
    workspace_id?: string;
    lecture_id: string;
    user_id?: string;
    file_name?: string;
    original_filename: string;
    file_type?: string;
    storage_path?: string;
    file_path: string;
    bucket_id?: StorageBucketType;
    visibility?: VisibilityType;
    preprocessed_path?: string;
    preview_url?: string;
    source_type: SourceMaterialType;
    file_size_bytes: number;
    mime_type: string;
    page_number: number;
    ocr_confidence?: number;
    extracted_text_snippet?: string;
    metadata_json?: Record<string, any>;
    created_at: string;
}

export interface DefinitionItem {
    term: string;
    definition: string;
    context?: string;
    source_citation?: string;
}

export interface EquationItem {
    latex_or_text: string;
    explanation: string;
    variables?: Record<string, string>;
    source_attribution?: string;
}

export interface ExampleItem {
    title: string;
    description: string;
    solution_steps: string[];
    section_source?: string;
}

export interface NoteTable {
    title: string;
    headers: string[];
    rows: string[][];
    source_attribution?: string;
    caption?: string;
}

export interface ExamConceptItem {
    topic: string;
    reason: string;
    frequency_or_weight: string;
    section_emphasis?: string;
}

export interface VerificationNeedItem {
    item: string;
    reason: string;
    source_doc?: string;
    confidence?: number;
    is_conflict?: boolean;
}

export interface UncertainWordItem {
    word_or_phrase: string;
    confidence: number;
    context_line?: string;
    reason: string;
    source_doc?: string;
}

export interface ConflictItem {
    topic: string;
    classroom_statement: string;
    reference_statement: string;
    resolution_note: string;
    classroom_source?: string;
    reference_source?: string;
}

export interface ProfessorStyleAnalysis {
    professor_name: string;
    heading_hierarchy_pattern: string;
    learned_terminology: Record<string, string>;
    formatting_conventions: string[];
    chapter_structure_style: string;
    explanation_patterns: string[];
    style_disclaimer?: string;
}

export interface SourceCitation {
    citation_id: string;
    source_name: string;
    source_type: string;
    page_or_region: string;
    quote: string;
    section_tag?: string;
}

export interface NoteSection {
    heading: string;
    content: string;
    subsections: string[];
    professor_emphasis?: string;
    is_exam_critical?: boolean;
    source_attribution?: string;
}

export interface SmartDiagram {
    id: string;
    lecture_id: string;
    diagram_type: string;
    title: string;
    description: string;
    mermaid_code: string;
    svg_code?: string;
    original_image_url?: string;
    is_approximation?: boolean;
    confidence?: number;
    reconstructed_from?: string;
    uncertain_elements: string[];
    is_valid_syntax: boolean;
    created_at: string;
}

export interface MasterNoteContent {
    id: string;
    lecture_id: string;
    title: string;
    subject_id?: string;
    subject_name: string;
    subject_code: string;
    chapter: string;
    professor: string;
    section: SectionId;
    source_sections: SectionId[];
    summary: string;
    learning_objectives: string[];
    sections: NoteSection[];
    key_definitions: DefinitionItem[];
    important_formulas: EquationItem[];
    important_examples: ExampleItem[];
    tables?: NoteTable[];
    diagram_summaries?: any[];
    key_takeaways: string[];
    exam_revision_summary?: string[];
    exam_focused_concepts: ExamConceptItem[];
    needs_verification: VerificationNeedItem[];
    uncertain_words?: UncertainWordItem[];
    source_conflicts?: ConflictItem[];
    professor_style?: ProfessorStyleAnalysis;
    ocr_confidence?: number;
    citations: SourceCitation[];
    raw_board_transcription: string;
    ai_synthesized_markdown: string;
    user_markdown_override?: string;
    updated_at: string;
}

export interface MCQQuestion {
    id: string;
    question: string;
    options: string[];
    correct_option_index: number;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic_reference: string;
}

export interface FlashcardItem {
    id: string;
    question: string;
    answer: string;
    explanation?: string;
    difficulty: string;
    review_status: 'new' | 'needs_review' | 'mastered';
    topic_tag: string;
}

export interface ExamRevisionSheet {
    core_definitions: DefinitionItem[];
    critical_formulas: EquationItem[];
    high_probability_questions: { question: string; answer: string }[];
    professor_tips: string[];
}

export interface StudyKit {
    id: string;
    lecture_id: string;
    title: string;
    subject_name: string;
    chapter: string;
    key_takeaways: string[];
    mcqs: MCQQuestion[];
    flashcards: FlashcardItem[];
    revision_sheet: ExamRevisionSheet;
    created_at: string;
}

export interface SectionVaultNote {
    id: string;
    lecture_id: string;
    title: string;
    chapter: string;
    subject_id?: string;
    subject_name: string;
    subject_code: string;
    professor: string;
    section: SectionId;
    source_sections: SectionId[];
    lecture_date: string;
    contributor_id: string;
    contributor_name: string;
    contributor_avatar?: string;
    verification_status: VerificationStatus;
    upvotes: number;
    reports_count: number;
    summary: string;
    download_available: boolean;
    tags: string[];
    created_at: string;
}

export interface SectionComparisonResult {
    subject_name: string;
    chapter: string;
    compared_sections: SectionId[];
    shared_core_concepts: string[];
    section_specific_explanations: Record<string, string[]>;
    professor_emphasis_differences: Record<string, string[]>;
    exam_tips_by_section: Record<string, string[]>;
    cross_section_takeaways: string[];
}

export interface CommunityReview {
    id: string;
    vault_note_id: string;
    user_id: string;
    user_name: string;
    user_section: SectionId;
    rating: number;
    comment: string;
    is_inaccuracy_report?: boolean;
    inaccuracy_details?: string;
    created_at: string;
}

export interface NotificationItem {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    read: boolean;
    created_at: string;
}

export interface ProcessingPipelineJob {
    id: string;
    lecture_id: string;
    stage_index: number;
    total_stages?: number;
    stage_name: string;
    progress: number;
    status: 'running' | 'completed' | 'failed';
    details: string;
    error_message?: string;
    retry_count?: number;
    created_at: string;
    updated_at: string;
}

export interface DashboardMetrics {
    total_master_notes: number;
    uploaded_sources: number;
    available_study_kits: number;
    community_contributions: number;
    total_upvotes: number;
    total_workspaces?: number;
    total_flashcards?: number;
    total_quiz_questions?: number;
}
