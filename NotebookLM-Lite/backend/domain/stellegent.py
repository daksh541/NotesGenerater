"""Stellegent domain models.

Defines core entities for subjects, whiteboard/handwritten lectures,
multimodal extraction, structured notes, diagrams, study flashcards,
cross-lecture connections, and processing pipelines.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class UserRole(str, Enum):
    STUDENT = "student"
    RESEARCHER = "researcher"
    EDUCATOR = "educator"
    ADMIN = "admin"


class User(BaseModel):
    id: str = Field(default_factory=lambda: f"user_{uuid4().hex[:12]}")
    email: str
    password_hash: str
    full_name: str
    role: UserRole = UserRole.STUDENT
    created_at: str = Field(default_factory=utc_now)


class Workspace(BaseModel):
    id: str = Field(default_factory=lambda: f"ws_{uuid4().hex[:12]}")
    user_id: str
    name: str = "My Knowledge Base"
    description: str = "Personal lecture and study workspace"
    created_at: str = Field(default_factory=utc_now)


class Subject(BaseModel):
    id: str = Field(default_factory=lambda: f"subj_{uuid4().hex[:12]}")
    workspace_id: str
    name: str
    code: Optional[str] = None
    teacher: Optional[str] = None
    semester: Optional[str] = None
    description: Optional[str] = None
    color: str = "#6366f1"
    created_at: str = Field(default_factory=utc_now)


class SourceType(str, Enum):
    WHITEBOARD = "whiteboard"
    HANDWRITTEN_NOTES = "handwritten_notes"
    PRINTED_NOTES = "printed_notes"
    DIAGRAM_EQUATION = "diagram_equation"
    PDF_DOCUMENT = "pdf_document"


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PREPROCESSING = "preprocessing"
    EXTRACTING = "extracting"
    GENERATING_NOTES = "generating_notes"
    GENERATING_DIAGRAMS = "generating_diagrams"
    COMPLETED = "completed"
    FAILED = "failed"


class DetectedRegion(BaseModel):
    box_2d: List[float] = Field(default_factory=list)  # [ymin, xmin, ymax, xmax] in 0..1000
    label: str = "text"
    confidence: Optional[float] = None
    transcription: Optional[str] = None


class LecturePage(BaseModel):
    id: str = Field(default_factory=lambda: f"page_{uuid4().hex[:12]}")
    lecture_id: str
    page_number: int = 1
    file_path: str
    original_filename: str
    source_type: SourceType = SourceType.WHITEBOARD
    mime_type: str = "image/jpeg"
    file_size_bytes: int = 0
    width: Optional[int] = None
    height: Optional[int] = None
    regions: List[DetectedRegion] = Field(default_factory=list)
    created_at: str = Field(default_factory=utc_now)


class ExtractedContent(BaseModel):
    id: str = Field(default_factory=lambda: f"ext_{uuid4().hex[:12]}")
    lecture_id: str
    page_id: str
    raw_transcription: str = ""
    headings_detected: List[str] = Field(default_factory=list)
    equations_detected: List[str] = Field(default_factory=list)
    diagram_elements_detected: List[dict] = Field(default_factory=list)
    confidence: Optional[float] = None
    created_at: str = Field(default_factory=utc_now)


class NoteSection(BaseModel):
    heading: str
    content: str
    subsections: List[str] = Field(default_factory=list)


class DefinitionItem(BaseModel):
    term: str
    definition: str
    context: Optional[str] = None


class EquationItem(BaseModel):
    latex_or_text: str
    explanation: str
    variables: dict[str, str] = Field(default_factory=dict)


class StructuredNote(BaseModel):
    id: str = Field(default_factory=lambda: f"note_{uuid4().hex[:12]}")
    lecture_id: str
    title: str
    summary: str
    sections: List[NoteSection] = Field(default_factory=list)
    key_definitions: List[DefinitionItem] = Field(default_factory=list)
    important_examples: List[str] = Field(default_factory=list)
    equations_and_formulas: List[EquationItem] = Field(default_factory=list)
    step_by_step_explanations: List[str] = Field(default_factory=list)
    concept_relationships: List[str] = Field(default_factory=list)
    key_takeaways: List[str] = Field(default_factory=list)
    original_transcription: str = ""
    ai_organized_notes: str = ""
    ai_added_explanations: str = ""
    user_markdown_override: Optional[str] = None
    updated_at: str = Field(default_factory=utc_now)


class DiagramType(str, Enum):
    FLOWCHART = "flowchart"
    MIND_MAP = "mind_map"
    TREE_HIERARCHY = "tree_hierarchy"
    COMPARISON_TABLE = "comparison_table"
    SEQUENCE = "sequence"
    CONCEPT_MAP = "concept_map"


class DiagramArtifact(BaseModel):
    id: str = Field(default_factory=lambda: f"diag_{uuid4().hex[:12]}")
    lecture_id: str
    diagram_type: DiagramType = DiagramType.FLOWCHART
    title: str
    description: str = ""
    mermaid_code: str
    elements_json: Any = Field(default_factory=dict)
    is_valid_syntax: bool = True
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)


class QuestionType(str, Enum):
    QA = "qa"
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class ReviewStatus(str, Enum):
    NEW = "new"
    NEEDS_REVIEW = "needs_review"
    MASTERED = "mastered"


class Flashcard(BaseModel):
    id: str = Field(default_factory=lambda: f"card_{uuid4().hex[:12]}")
    lecture_id: str
    question_type: QuestionType = QuestionType.QA
    question: str
    answer: str
    explanation: Optional[str] = None
    options: List[str] = Field(default_factory=list)
    correct_option_index: Optional[int] = None
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    review_status: ReviewStatus = ReviewStatus.NEW
    tags: List[str] = Field(default_factory=list)
    source_citation: Optional[str] = None
    created_at: str = Field(default_factory=utc_now)


class CrossLectureConnection(BaseModel):
    id: str = Field(default_factory=lambda: f"conn_{uuid4().hex[:12]}")
    workspace_id: str
    source_lecture_id: str
    source_lecture_title: str
    target_lecture_id: str
    target_lecture_title: str
    concept_name: str
    relationship_type: str = "shared_concept"
    explanation: str
    is_suggestion: bool = True
    confidence: Optional[float] = None
    created_at: str = Field(default_factory=utc_now)


class Lecture(BaseModel):
    id: str = Field(default_factory=lambda: f"lec_{uuid4().hex[:12]}")
    workspace_id: str
    subject_id: Optional[str] = None
    user_id: str
    title: str
    teacher: Optional[str] = None
    semester: Optional[str] = None
    lecture_date: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    status: ProcessingStatus = ProcessingStatus.PENDING
    page_count: int = 1
    content_hash: Optional[str] = None
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)


class ProcessingJob(BaseModel):
    id: str = Field(default_factory=lambda: f"job_{uuid4().hex[:12]}")
    lecture_id: str
    workspace_id: str
    stage: ProcessingStatus = ProcessingStatus.PENDING
    progress: int = 0  # 0 to 100
    status: str = "running"  # running, completed, failed
    error_message: Optional[str] = None
    retry_count: int = 0
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)


class Citation(BaseModel):
    citation_id: str
    lecture_id: str
    lecture_title: str
    page_number: int = 1
    quote: str
    region_box: Optional[List[float]] = None
    is_verified: bool = False


class StudyChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: f"msg_{uuid4().hex[:12]}")
    workspace_id: str
    lecture_id: Optional[str] = None
    user_id: str
    role: str  # "user" | "assistant"
    content: str
    citations: List[Citation] = Field(default_factory=list)
    created_at: str = Field(default_factory=utc_now)
