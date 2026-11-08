"""LECTRA Domain Models (Phase 2: Supabase Database, Storage, Auth & RLS).

Defines core entities for:
- Academic Hierarchy: Universities, Courses, Subjects, Professors, Chapters
- User Profiles & Onboarding (Student Name, University, Course, Semester, Subject, Section A–I)
- Workspaces & Private/Shared Row Level Security
- Supabase Storage Buckets (private-student-uploads, shared-academic-materials, generated-documents, generated-diagrams)
- Uploaded Sources with Signed URL support
- Master Notes, Community Contributions (Vault), Study Kits, Flashcards, Quiz Questions
- Smart Digital Diagrams, Community Reviews, Notifications, and Pipeline Jobs
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SectionId(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    F = "F"
    G = "G"
    H = "H"
    I = "I"


class VerificationStatus(str, Enum):
    UNVERIFIED = "unverified"
    COMMUNITY_REVIEWED = "community_reviewed"
    SOURCE_VERIFIED = "source_verified"


class SourceMaterialType(str, Enum):
    WHITEBOARD = "whiteboard"
    BLACKBOARD = "blackboard"
    HANDWRITTEN_NOTES = "handwritten_notes"
    REFERENCE_PDF = "reference_pdf"
    PROFESSOR_SLIDES = "professor_slides"
    SYLLABUS = "syllabus"


class StorageBucketType(str, Enum):
    PRIVATE_UPLOADS = "private-student-uploads"
    SHARED_MATERIALS = "shared-academic-materials"
    GENERATED_DOCUMENTS = "generated-documents"
    GENERATED_DIAGRAMS = "generated-diagrams"


class WorkspaceStatus(str, Enum):
    ACTIVE = "active"
    DRAFT = "draft"
    UPLOADING = "uploading"
    READY = "ready"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class VisibilityType(str, Enum):
    PRIVATE = "private"
    SECTION = "section"
    PUBLIC = "public"
    SHARED = "shared"


class GenerationStyle(str, Enum):
    COMPREHENSIVE = "comprehensive"
    EXAM_FOCUSED = "exam_focused"
    DEEP_DIVE = "deep_dive"


class UniversityModel(BaseModel):
    id: str = Field(default_factory=lambda: f"univ_{uuid4().hex[:10]}")
    name: str
    domain: Optional[str] = None
    location: Optional[str] = None
    created_at: str = Field(default_factory=utc_now)


class CourseModel(BaseModel):
    id: str = Field(default_factory=lambda: f"crs_{uuid4().hex[:10]}")
    university_id: str
    course_name: str
    course_code: str
    department: Optional[str] = None
    created_at: str = Field(default_factory=utc_now)


class ChapterModel(BaseModel):
    id: str = Field(default_factory=lambda: f"chp_{uuid4().hex[:10]}")
    subject_id: str
    chapter_name: str
    chapter_number: int = 1
    created_at: str = Field(default_factory=utc_now)


class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: f"usr_{uuid4().hex[:10]}")
    email: str
    password_hash: str = Field(default="")
    full_name: str
    university_id: str = "univ_stanford"
    course_id: Optional[str] = "crs_cs_ai"
    subject_id: Optional[str] = "subj_cs244"
    university: str = "Stanford University"
    course: str = "B.S. Computer Science & AI"
    semester: str = "Semester 5 (Fall 2026)"
    subject: Optional[str] = "Distributed Systems & Cloud Computing"
    section: SectionId = SectionId.A
    role: str = "student"  # student | educator | admin
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    email_verified: bool = False
    onboarding_completed: bool = True
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)


class AuthSession(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 86400
    expires_at: int
    user: UserProfile


class ProfessorProfile(BaseModel):
    id: str = Field(default_factory=lambda: f"prof_{uuid4().hex[:10]}")
    university_id: str = "univ_stanford"
    name: str
    full_name: Optional[str] = None
    title: str = "Professor"
    department: str = "Computer Science"
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    subjects_taught: List[str] = Field(default_factory=list)
    subjects: List[str] = Field(default_factory=list)
    sections_taught: List[SectionId] = Field(default_factory=list)
    teaching_style: str = "Intuitive, proof-oriented, emphasizes algorithmic efficiency"
    exam_focus_topics: List[str] = Field(default_factory=list)
    preferred_terminology: Dict[str, str] = Field(default_factory=dict)
    formatting_preferences: str = "Structured LaTeX formulas with step-by-step invariant derivations"
    reference_materials_count: int = 0
    created_at: str = Field(default_factory=utc_now)

    def model_post_init(self, __context: Any) -> None:
        if not self.full_name:
            self.full_name = self.name
        if not self.subjects and self.subjects_taught:
            self.subjects = list(self.subjects_taught)
        elif self.subjects and not self.subjects_taught:
            self.subjects_taught = list(self.subjects)


class SubjectModel(BaseModel):
    id: str = Field(default_factory=lambda: f"subj_{uuid4().hex[:10]}")
    course_id: str = "crs_cs_ai"
    workspace_id: str = "default_ws"
    name: str
    subject_name: Optional[str] = None
    code: str
    subject_code: Optional[str] = None
    teacher: str
    professor_id: Optional[str] = None
    semester: str = "Fall 2026"
    description: Optional[str] = None
    color: str = "#1E3A8A"
    chapters_count: int = 0
    active_sections: List[SectionId] = Field(
        default_factory=lambda: [
            SectionId.A,
            SectionId.B,
            SectionId.C,
            SectionId.D,
            SectionId.E,
            SectionId.F,
            SectionId.G,
            SectionId.H,
            SectionId.I,
        ]
    )
    created_at: str = Field(default_factory=utc_now)

    def model_post_init(self, __context: Any) -> None:
        if not self.subject_name:
            self.subject_name = self.name
        if not self.subject_code:
            self.subject_code = self.code


class WorkspaceModel(BaseModel):
    id: str = Field(default_factory=lambda: f"ws_{uuid4().hex[:10]}")
    user_id: str = "usr_lectra_default"
    owner_id: str = "usr_lectra_default"
    subject_id: Optional[str] = None
    chapter_id: Optional[str] = None
    professor_id: Optional[str] = None
    section: SectionId = SectionId.A
    lecture_date: str = Field(default_factory=lambda: utc_now()[:10])
    title: str = ""
    name: str = ""
    university: str = "Stanford University"
    department: str = "Computer Science & Engineering"
    semester: str = "Fall 2026"
    description: Optional[str] = None
    status: str = "ready"  # draft | uploading | ready | processing | completed | archived
    visibility: str = "private"  # private | section | public
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    chapter_name: Optional[str] = None
    professor_name: Optional[str] = None
    sources_count: int = 0
    has_master_note: bool = False
    master_note_id: Optional[str] = None
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)

    def model_post_init(self, __context: Any) -> None:
        if not self.title and self.name:
            self.title = self.name
        elif self.title and not self.name:
            self.name = self.title
        if self.owner_id != "usr_lectra_default" and self.user_id == "usr_lectra_default":
            self.user_id = self.owner_id
        elif self.user_id != "usr_lectra_default" and self.owner_id == "usr_lectra_default":
            self.owner_id = self.user_id


class UploadedSourceItem(BaseModel):
    id: str = Field(default_factory=lambda: f"src_{uuid4().hex[:10]}")
    workspace_id: str = ""
    lecture_id: str = ""
    user_id: str = "usr_lectra_default"
    file_name: str = ""
    original_filename: str = ""
    file_type: str = "image/jpeg"
    mime_type: str = "image/jpeg"
    storage_path: str = ""
    file_path: str = ""
    preprocessed_path: Optional[str] = None
    preview_url: Optional[str] = None
    bucket_name: str = StorageBucketType.PRIVATE_UPLOADS.value
    bucket_id: StorageBucketType = StorageBucketType.PRIVATE_UPLOADS
    source_type: SourceMaterialType = SourceMaterialType.WHITEBOARD
    file_size_bytes: int = 0
    page_number: int = 1
    ocr_confidence: Optional[float] = None
    visibility: str = "private"  # private | shared
    signed_url: Optional[str] = None
    extracted_text_snippet: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=utc_now)

    def model_post_init(self, __context: Any) -> None:
        if not self.workspace_id and self.lecture_id:
            self.workspace_id = self.lecture_id
        elif self.workspace_id and not self.lecture_id:
            self.lecture_id = self.workspace_id
        if not self.file_name and self.original_filename:
            self.file_name = self.original_filename
        elif self.file_name and not self.original_filename:
            self.original_filename = self.file_name
        if not self.storage_path and self.file_path:
            self.storage_path = self.file_path
        elif self.storage_path and not self.file_path:
            self.file_path = self.storage_path
        if self.mime_type and self.file_type == "image/jpeg" and self.mime_type != "image/jpeg":
            self.file_type = self.mime_type
        elif self.file_type and self.mime_type == "image/jpeg" and self.file_type != "image/jpeg":
            self.mime_type = self.file_type


class DefinitionItem(BaseModel):
    term: str
    definition: str
    context: Optional[str] = None
    source_citation: Optional[str] = None


class EquationItem(BaseModel):
    latex_or_text: str
    explanation: str
    variables: Dict[str, str] = Field(default_factory=dict)
    source_attribution: Optional[str] = None


class ExampleItem(BaseModel):
    title: str
    description: str
    solution_steps: List[str] = Field(default_factory=list)
    section_source: Optional[str] = None


class ExamConceptItem(BaseModel):
    topic: str
    reason: str
    frequency_or_weight: str = "High Probability"
    section_emphasis: Optional[str] = None


class VerificationNeedItem(BaseModel):
    item: str
    reason: str
    source_doc: Optional[str] = None
    confidence: float = 0.85
    is_conflict: bool = False


class UncertainWordItem(BaseModel):
    word_or_phrase: str = "[uncertain]"
    text: str = ""
    confidence: float = 0.65
    context_sentence: str = ""
    context_line: str = ""
    context: str = ""
    reason: str = "Low handwriting stroke contrast"
    source_file: Optional[str] = None
    source_doc: Optional[str] = None
    suggested_alternatives: List[str] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:
        if not self.text and self.word_or_phrase:
            self.text = self.word_or_phrase
        elif self.text and self.word_or_phrase == "[uncertain]":
            self.word_or_phrase = self.text
        if not self.context and (self.context_line or self.context_sentence):
            self.context = self.context_line or self.context_sentence
        if not self.context_line and self.context:
            self.context_line = self.context
        if not self.source_file and self.source_doc:
            self.source_file = self.source_doc
        elif not self.source_doc and self.source_file:
            self.source_doc = self.source_file


class ConflictItem(BaseModel):
    topic: str
    classroom_statement: str = ""
    reference_statement: str = ""
    classroom_note_claim: str = ""
    official_reference_claim: str = ""
    resolution_note: str = ""
    classroom_source: Optional[str] = None
    reference_source: Optional[str] = None
    severity: str = "medium"

    def model_post_init(self, __context: Any) -> None:
        if not self.classroom_note_claim and self.classroom_statement:
            self.classroom_note_claim = self.classroom_statement
        elif self.classroom_note_claim and not self.classroom_statement:
            self.classroom_statement = self.classroom_note_claim
        if not self.official_reference_claim and self.reference_statement:
            self.official_reference_claim = self.reference_statement
        elif self.official_reference_claim and not self.reference_statement:
            self.reference_statement = self.official_reference_claim


class ProfessorStyleAnalysis(BaseModel):
    professor_name: str
    heading_hierarchy_pattern: str = ""
    learned_terminology: Dict[str, str] = Field(default_factory=dict)
    formatting_conventions: List[str] = Field(default_factory=list)
    chapter_structure_style: str = ""
    explanation_patterns: List[str] = Field(default_factory=list)
    style_disclaimer: str = (
        "Formatted using structural patterns and terminology learned from the professor's reference materials; "
        "this is an academic synthesis aid and does not claim to perfectly imitate the professor."
    )
    disclaimer: str = (
        "Formatted using structural patterns and terminology learned from the professor's reference materials; "
        "this is an academic synthesis aid and does not claim to perfectly imitate the professor."
    )


class NoteTable(BaseModel):
    title: str
    headers: List[str] = Field(default_factory=list)
    rows: List[List[str]] = Field(default_factory=list)
    source_attribution: Optional[str] = None
    source: Optional[str] = None
    caption: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if not self.source and self.source_attribution:
            self.source = self.source_attribution
        elif self.source and not self.source_attribution:
            self.source_attribution = self.source


class SourceCitation(BaseModel):
    citation_id: str = Field(default_factory=lambda: f"cit_{uuid4().hex[:6]}")
    source_name: str
    source_type: str
    page_or_region: str
    quote: str
    section_tag: Optional[str] = None


class NoteSection(BaseModel):
    heading: str
    content: str
    subsections: List[str] = Field(default_factory=list)
    professor_emphasis: Optional[str] = None
    is_exam_critical: bool = False
    source_attribution: Optional[str] = None


class BoardRegionDetection(BaseModel):
    region_id: str = Field(default_factory=lambda: f"reg_{uuid4().hex[:6]}")
    label: str = "handwritten_text"
    box_2d: List[int] = Field(default_factory=lambda: [0, 0, 1000, 1000])
    confidence: float = 0.92
    transcription: str = ""
    is_uncertain: bool = False


class ImagePreprocessingReport(BaseModel):
    original_filename: str
    original_path: str
    preprocessed_path: str
    original_width: int = 0
    original_height: int = 0
    cropped_width: int = 0
    cropped_height: int = 0
    orientation_corrected: bool = False
    board_region_cropped: bool = False
    contrast_factor: float = 1.0
    noise_reduction_applied: bool = True
    readability_score: float = 0.92
    detected_board_bbox: List[int] = Field(default_factory=list)


class OCRResult(BaseModel):
    filename: str
    handwritten_text: List[str] = Field(default_factory=list)
    printed_text: List[str] = Field(default_factory=list)
    headings: List[str] = Field(default_factory=list)
    bullet_points: List[str] = Field(default_factory=list)
    equations: List[EquationItem] = Field(default_factory=list)
    labels: List[str] = Field(default_factory=list)
    tables: List[NoteTable] = Field(default_factory=list)
    diagram_descriptions: List[Dict[str, Any]] = Field(default_factory=list)
    overall_confidence: float = 0.92
    uncertain_words: List[UncertainWordItem] = Field(default_factory=list)
    detected_regions: List[BoardRegionDetection] = Field(default_factory=list)
    raw_transcription: str = ""
    preprocessing_report: Optional[ImagePreprocessingReport] = None


class ReferenceAnalysisResult(BaseModel):
    filename: str
    doc_type: str = "pdf"
    page_or_slide_count: int = 1
    is_scanned_ocr_used: bool = False
    chapter_title: str = ""
    headings: List[str] = Field(default_factory=list)
    learning_objectives: List[str] = Field(default_factory=list)
    definitions: List[DefinitionItem] = Field(default_factory=list)
    important_concepts: List[str] = Field(default_factory=list)
    formulas: List[EquationItem] = Field(default_factory=list)
    tables: List[NoteTable] = Field(default_factory=list)
    professor_terminology: Dict[str, str] = Field(default_factory=dict)
    raw_text: str = ""


class SmartDiagram(BaseModel):
    id: str = Field(default_factory=lambda: f"diag_{uuid4().hex[:10]}")
    lecture_id: str
    workspace_id: Optional[str] = None
    diagram_type: str = "flowchart"
    title: str
    description: str = ""
    caption: str = ""
    mermaid_code: str
    svg_code: Optional[str] = None
    storage_path: Optional[str] = None
    original_image_url: Optional[str] = None
    is_approximation: bool = False
    confidence: float = 0.93
    reconstructed_from: Optional[str] = None
    uncertain_elements: List[str] = Field(default_factory=list)
    is_valid_syntax: bool = True
    created_at: str = Field(default_factory=utc_now)

    def model_post_init(self, __context: Any) -> None:
        if not self.caption and self.description:
            self.caption = self.description
        elif self.caption and not self.description:
            self.description = self.caption


class MasterNoteContent(BaseModel):
    id: str = Field(default_factory=lambda: f"mnote_{uuid4().hex[:10]}")
    workspace_id: str = ""
    lecture_id: str = ""
    user_id: str = "usr_lectra_default"
    title: str
    subject_id: Optional[str] = None
    subject_name: str = "Academic Subject"
    subject_code: str = "CS-101"
    chapter: str = "Chapter 1"
    professor: str = "Dr. Aris Thorne"
    section: SectionId = SectionId.A
    source_sections: List[SectionId] = Field(default_factory=lambda: [SectionId.A])
    summary: str = ""
    learning_objectives: List[str] = Field(default_factory=list)
    sections: List[NoteSection] = Field(default_factory=list)
    key_definitions: List[DefinitionItem] = Field(default_factory=list)
    important_formulas: List[EquationItem] = Field(default_factory=list)
    important_examples: List[ExampleItem] = Field(default_factory=list)
    tables: List[NoteTable] = Field(default_factory=list)
    diagram_summaries: List[Any] = Field(default_factory=list)
    key_takeaways: List[str] = Field(default_factory=list)
    exam_revision_summary: List[str] = Field(default_factory=list)
    exam_focused_concepts: List[ExamConceptItem] = Field(default_factory=list)
    needs_verification: List[VerificationNeedItem] = Field(default_factory=list)
    uncertain_words: List[UncertainWordItem] = Field(default_factory=list)
    source_conflicts: List[ConflictItem] = Field(default_factory=list)
    professor_style: Optional[ProfessorStyleAnalysis] = None
    ocr_confidence: float = 0.94
    citations: List[SourceCitation] = Field(default_factory=list)
    raw_board_transcription: str = ""
    ai_synthesized_markdown: str = ""
    user_markdown_override: Optional[str] = None
    version: int = 1
    status: str = "published"  # draft | published | verified | archived
    visibility: str = "private"  # private | section | public
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)

    def model_post_init(self, __context: Any) -> None:
        if not self.workspace_id and self.lecture_id:
            self.workspace_id = self.lecture_id
        elif self.workspace_id and not self.lecture_id:
            self.lecture_id = self.workspace_id


class MCQOption(BaseModel):
    option_id: str
    text: str


class MCQQuestion(BaseModel):
    id: str = Field(default_factory=lambda: f"mcq_{uuid4().hex[:10]}")
    study_kit_id: Optional[str] = None
    question: str
    options: List[str] = Field(default_factory=list)
    correct_option_index: int = 0
    correct_answer: Optional[str] = None
    explanation: str
    difficulty: str = "medium"  # easy | medium | hard
    topic_reference: str = "Core Concept"

    def model_post_init(self, __context: Any) -> None:
        if not self.correct_answer and self.options and 0 <= self.correct_option_index < len(self.options):
            self.correct_answer = self.options[self.correct_option_index]


class FlashcardItem(BaseModel):
    id: str = Field(default_factory=lambda: f"fc_{uuid4().hex[:10]}")
    study_kit_id: Optional[str] = None
    question: str
    answer: str
    explanation: Optional[str] = None
    difficulty: str = "medium"
    review_status: str = "new"  # new | needs_review | mastered
    topic_tag: str = "Core Concept"


class ExamRevisionSheet(BaseModel):
    core_definitions: List[DefinitionItem] = Field(default_factory=list)
    critical_formulas: List[EquationItem] = Field(default_factory=list)
    high_probability_questions: List[Dict[str, str]] = Field(default_factory=list)
    professor_tips: List[str] = Field(default_factory=list)


class StudyKit(BaseModel):
    id: str = Field(default_factory=lambda: f"skit_{uuid4().hex[:10]}")
    master_notes_id: str = ""
    lecture_id: str = ""
    kit_type: str = "comprehensive"
    title: str
    subject_name: str
    chapter: str
    key_takeaways: List[str] = Field(default_factory=list)
    mcqs: List[MCQQuestion] = Field(default_factory=list)
    flashcards: List[FlashcardItem] = Field(default_factory=list)
    revision_sheet: ExamRevisionSheet = Field(default_factory=ExamRevisionSheet)
    created_at: str = Field(default_factory=utc_now)

    def model_post_init(self, __context: Any) -> None:
        if not self.master_notes_id and self.lecture_id:
            self.master_notes_id = self.lecture_id
        elif self.master_notes_id and not self.lecture_id:
            self.lecture_id = self.master_notes_id


class SectionVaultNote(BaseModel):
    id: str = Field(default_factory=lambda: f"vlt_{uuid4().hex[:10]}")
    master_notes_id: str = ""
    lecture_id: str = ""
    title: str
    chapter: str
    subject_id: Optional[str] = None
    subject_name: str
    subject_code: str
    professor: str
    section: SectionId
    source_sections: List[SectionId] = Field(default_factory=list)
    lecture_date: str
    contributor_id: str
    contributor_name: str
    contributor_avatar: Optional[str] = None
    visibility: str = "section"  # private | section | public
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED
    upvotes: int = 0
    reports_count: int = 0
    summary: str
    download_available: bool = True
    tags: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=utc_now)

    def model_post_init(self, __context: Any) -> None:
        if not self.master_notes_id and self.lecture_id:
            self.master_notes_id = self.lecture_id
        elif self.master_notes_id and not self.lecture_id:
            self.lecture_id = self.master_notes_id


class SectionComparisonResult(BaseModel):
    subject_name: str
    chapter: str
    compared_sections: List[SectionId]
    shared_core_concepts: List[str] = Field(default_factory=list)
    section_specific_explanations: Dict[str, List[str]] = Field(default_factory=dict)
    professor_emphasis_differences: Dict[str, List[str]] = Field(default_factory=dict)
    exam_tips_by_section: Dict[str, List[str]] = Field(default_factory=dict)
    cross_section_takeaways: List[str] = Field(default_factory=list)


class CommunityReview(BaseModel):
    id: str = Field(default_factory=lambda: f"rev_{uuid4().hex[:10]}")
    vault_note_id: str
    user_id: str
    user_name: str
    user_section: SectionId
    rating: int = 5  # 1-5
    comment: str
    is_inaccuracy_report: bool = False
    inaccuracy_details: Optional[str] = None
    created_at: str = Field(default_factory=utc_now)


class NotificationItem(BaseModel):
    id: str = Field(default_factory=lambda: f"notif_{uuid4().hex[:10]}")
    user_id: str
    title: str
    message: str
    type: str = "vault"  # vault | study_kit | review | system
    link: Optional[str] = None
    read: bool = False
    created_at: str = Field(default_factory=utc_now)


class ProcessingPipelineJob(BaseModel):
    id: str = Field(default_factory=lambda: f"pjob_{uuid4().hex[:10]}")
    lecture_id: str
    stage_index: int = 1
    total_stages: int = 10
    stage_name: str = "Uploading Sources"
    progress: int = 0
    status: str = "running"  # running | completed | failed
    details: str = "Initializing AI processing pipeline..."
    error_message: Optional[str] = None
    retry_count: int = 0
    job_payload_json: Optional[str] = None
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)
