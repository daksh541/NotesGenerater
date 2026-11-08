"""Persistent SQLite repository for Stellegent entities.

Manages users, workspaces, subjects, lectures, lecture pages,
extracted OCR contents, structured notes, diagrams, flashcards,
cross-lecture connections, processing jobs, and study chat history.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, List, Optional
from uuid import uuid4

from ...domain.stellegent import (
    Citation,
    CrossLectureConnection,
    DetectedRegion,
    DiagramArtifact,
    DifficultyLevel,
    ExtractedContent,
    Flashcard,
    Lecture,
    LecturePage,
    ProcessingJob,
    ProcessingStatus,
    QuestionType,
    ReviewStatus,
    SourceType,
    StructuredNote,
    StudyChatMessage,
    Subject,
    User,
    Workspace,
    utc_now,
)


class StellegentRepository:
    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._init_schema()

    def _init_schema(self) -> None:
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS stellegent_users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS stellegent_workspaces (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES stellegent_users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS stellegent_subjects (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                code TEXT,
                teacher TEXT,
                semester TEXT,
                description TEXT,
                color TEXT NOT NULL DEFAULT '#6366f1',
                created_at TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES stellegent_workspaces(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_subjects_workspace ON stellegent_subjects(workspace_id);

            CREATE TABLE IF NOT EXISTS stellegent_lectures (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                subject_id TEXT,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                teacher TEXT,
                semester TEXT,
                lecture_date TEXT,
                tags TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'pending',
                page_count INTEGER NOT NULL DEFAULT 1,
                content_hash TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES stellegent_workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(subject_id) REFERENCES stellegent_subjects(id) ON DELETE SET NULL,
                FOREIGN KEY(user_id) REFERENCES stellegent_users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_lectures_workspace ON stellegent_lectures(workspace_id);
            CREATE INDEX IF NOT EXISTS idx_lectures_subject ON stellegent_lectures(subject_id);
            CREATE INDEX IF NOT EXISTS idx_lectures_date ON stellegent_lectures(lecture_date);

            CREATE TABLE IF NOT EXISTS stellegent_lecture_pages (
                id TEXT PRIMARY KEY,
                lecture_id TEXT NOT NULL,
                page_number INTEGER NOT NULL DEFAULT 1,
                file_path TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                source_type TEXT NOT NULL DEFAULT 'whiteboard',
                mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
                file_size_bytes INTEGER NOT NULL DEFAULT 0,
                width INTEGER,
                height INTEGER,
                regions_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                FOREIGN KEY(lecture_id) REFERENCES stellegent_lectures(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_pages_lecture ON stellegent_lecture_pages(lecture_id);

            CREATE TABLE IF NOT EXISTS stellegent_extracted_contents (
                id TEXT PRIMARY KEY,
                lecture_id TEXT NOT NULL,
                page_id TEXT NOT NULL,
                raw_transcription TEXT NOT NULL,
                headings_json TEXT NOT NULL DEFAULT '[]',
                equations_json TEXT NOT NULL DEFAULT '[]',
                diagram_elements_json TEXT NOT NULL DEFAULT '[]',
                confidence REAL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(lecture_id) REFERENCES stellegent_lectures(id) ON DELETE CASCADE,
                FOREIGN KEY(page_id) REFERENCES stellegent_lecture_pages(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_ext_lecture ON stellegent_extracted_contents(lecture_id);

            CREATE TABLE IF NOT EXISTS stellegent_structured_notes (
                id TEXT PRIMARY KEY,
                lecture_id TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                sections_json TEXT NOT NULL DEFAULT '[]',
                definitions_json TEXT NOT NULL DEFAULT '[]',
                examples_json TEXT NOT NULL DEFAULT '[]',
                equations_json TEXT NOT NULL DEFAULT '[]',
                steps_json TEXT NOT NULL DEFAULT '[]',
                concept_relationships_json TEXT NOT NULL DEFAULT '[]',
                takeaways_json TEXT NOT NULL DEFAULT '[]',
                original_transcription TEXT NOT NULL DEFAULT '',
                ai_organized_notes TEXT NOT NULL DEFAULT '',
                ai_added_explanations TEXT NOT NULL DEFAULT '',
                user_markdown_override TEXT,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(lecture_id) REFERENCES stellegent_lectures(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS stellegent_diagrams (
                id TEXT PRIMARY KEY,
                lecture_id TEXT NOT NULL,
                diagram_type TEXT NOT NULL DEFAULT 'flowchart',
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                mermaid_code TEXT NOT NULL,
                elements_json TEXT NOT NULL DEFAULT '{}',
                is_valid_syntax INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(lecture_id) REFERENCES stellegent_lectures(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_diagrams_lecture ON stellegent_diagrams(lecture_id);

            CREATE TABLE IF NOT EXISTS stellegent_flashcards (
                id TEXT PRIMARY KEY,
                lecture_id TEXT NOT NULL,
                question_type TEXT NOT NULL DEFAULT 'qa',
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                explanation TEXT,
                options_json TEXT NOT NULL DEFAULT '[]',
                correct_option_index INTEGER,
                difficulty TEXT NOT NULL DEFAULT 'medium',
                review_status TEXT NOT NULL DEFAULT 'new',
                tags_json TEXT NOT NULL DEFAULT '[]',
                source_citation TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(lecture_id) REFERENCES stellegent_lectures(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_cards_lecture ON stellegent_flashcards(lecture_id);

            CREATE TABLE IF NOT EXISTS stellegent_cross_lecture_connections (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                source_lecture_id TEXT NOT NULL,
                source_lecture_title TEXT NOT NULL,
                target_lecture_id TEXT NOT NULL,
                target_lecture_title TEXT NOT NULL,
                concept_name TEXT NOT NULL,
                relationship_type TEXT NOT NULL DEFAULT 'shared_concept',
                explanation TEXT NOT NULL,
                is_suggestion INTEGER NOT NULL DEFAULT 1,
                confidence REAL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES stellegent_workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(source_lecture_id) REFERENCES stellegent_lectures(id) ON DELETE CASCADE,
                FOREIGN KEY(target_lecture_id) REFERENCES stellegent_lectures(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_conn_workspace ON stellegent_cross_lecture_connections(workspace_id);

            CREATE TABLE IF NOT EXISTS stellegent_processing_jobs (
                id TEXT PRIMARY KEY,
                lecture_id TEXT NOT NULL,
                workspace_id TEXT NOT NULL,
                stage TEXT NOT NULL DEFAULT 'pending',
                progress INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'running',
                error_message TEXT,
                retry_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(lecture_id) REFERENCES stellegent_lectures(id) ON DELETE CASCADE,
                FOREIGN KEY(workspace_id) REFERENCES stellegent_workspaces(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_jobs_lecture ON stellegent_processing_jobs(lecture_id);

            CREATE TABLE IF NOT EXISTS stellegent_chat_messages (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                lecture_id TEXT,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                citations_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES stellegent_workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES stellegent_users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_chat_workspace ON stellegent_chat_messages(workspace_id);
            """
        )
        self._conn.commit()

    # --- User & Workspace operations ---
    def create_user(self, user: User) -> User:
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO stellegent_users (id, email, password_hash, full_name, role, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user.id, user.email.lower().strip(), user.password_hash, user.full_name, user.role.value, user.created_at),
            )
        return user

    def get_user_by_email(self, email: str) -> Optional[User]:
        row = self._conn.execute(
            "SELECT * FROM stellegent_users WHERE email = ?", (email.lower().strip(),)
        ).fetchone()
        if not row:
            return None
        return User(
            id=row["id"],
            email=row["email"],
            password_hash=row["password_hash"],
            full_name=row["full_name"],
            role=row["role"],
            created_at=row["created_at"],
        )

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        row = self._conn.execute("SELECT * FROM stellegent_users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            return None
        return User(
            id=row["id"],
            email=row["email"],
            password_hash=row["password_hash"],
            full_name=row["full_name"],
            role=row["role"],
            created_at=row["created_at"],
        )

    def get_or_create_default_workspace(self, user_id: str) -> Workspace:
        row = self._conn.execute(
            "SELECT * FROM stellegent_workspaces WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
            (user_id,),
        ).fetchone()
        if row:
            return Workspace(
                id=row["id"],
                user_id=row["user_id"],
                name=row["name"],
                description=row["description"],
                created_at=row["created_at"],
            )
        ws = Workspace(user_id=user_id, name="Default Workspace", description="My lecture notes and study workspace")
        with self._conn:
            self._conn.execute(
                "INSERT INTO stellegent_workspaces (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)",
                (ws.id, ws.user_id, ws.name, ws.description, ws.created_at),
            )
        return ws

    def list_workspaces(self, user_id: str) -> List[Workspace]:
        rows = self._conn.execute(
            "SELECT * FROM stellegent_workspaces WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
        return [
            Workspace(
                id=r["id"],
                user_id=r["user_id"],
                name=r["name"],
                description=r["description"],
                created_at=r["created_at"],
            )
            for r in rows
        ]

    # --- Subject operations ---
    def create_subject(self, subject: Subject) -> Subject:
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO stellegent_subjects (id, workspace_id, name, code, teacher, semester, description, color, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    subject.id,
                    subject.workspace_id,
                    subject.name,
                    subject.code,
                    subject.teacher,
                    subject.semester,
                    subject.description,
                    subject.color,
                    subject.created_at,
                ),
            )
        return subject

    def list_subjects(self, workspace_id: str) -> List[Subject]:
        rows = self._conn.execute(
            "SELECT * FROM stellegent_subjects WHERE workspace_id = ? ORDER BY name ASC",
            (workspace_id,),
        ).fetchall()
        return [
            Subject(
                id=r["id"],
                workspace_id=r["workspace_id"],
                name=r["name"],
                code=r["code"],
                teacher=r["teacher"],
                semester=r["semester"],
                description=r["description"],
                color=r["color"],
                created_at=r["created_at"],
            )
            for r in rows
        ]

    def get_subject(self, subject_id: str) -> Optional[Subject]:
        row = self._conn.execute("SELECT * FROM stellegent_subjects WHERE id = ?", (subject_id,)).fetchone()
        if not row:
            return None
        return Subject(
            id=row["id"],
            workspace_id=row["workspace_id"],
            name=row["name"],
            code=row["code"],
            teacher=row["teacher"],
            semester=row["semester"],
            description=row["description"],
            color=row["color"],
            created_at=row["created_at"],
        )

    def delete_subject(self, subject_id: str) -> bool:
        with self._conn:
            res = self._conn.execute("DELETE FROM stellegent_subjects WHERE id = ?", (subject_id,))
            return res.rowcount > 0

    # --- Lecture operations ---
    def create_lecture(self, lecture: Lecture) -> Lecture:
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO stellegent_lectures (
                    id, workspace_id, subject_id, user_id, title, teacher, semester,
                    lecture_date, tags, status, page_count, content_hash, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lecture.id,
                    lecture.workspace_id,
                    lecture.subject_id,
                    lecture.user_id,
                    lecture.title,
                    lecture.teacher,
                    lecture.semester,
                    lecture.lecture_date,
                    json.dumps(lecture.tags),
                    lecture.status.value,
                    lecture.page_count,
                    lecture.content_hash,
                    lecture.created_at,
                    lecture.updated_at,
                ),
            )
        return lecture

    def get_lecture_by_hash(self, workspace_id: str, content_hash: str) -> Optional[Lecture]:
        row = self._conn.execute(
            "SELECT * FROM stellegent_lectures WHERE workspace_id = ? AND content_hash = ?",
            (workspace_id, content_hash),
        ).fetchone()
        if not row:
            return None
        return self._row_to_lecture(row)

    def update_lecture_status(self, lecture_id: str, status: ProcessingStatus) -> None:
        with self._conn:
            self._conn.execute(
                "UPDATE stellegent_lectures SET status = ?, updated_at = ? WHERE id = ?",
                (status.value, utc_now(), lecture_id),
            )

    def get_lecture(self, lecture_id: str) -> Optional[Lecture]:
        row = self._conn.execute("SELECT * FROM stellegent_lectures WHERE id = ?", (lecture_id,)).fetchone()
        if not row:
            return None
        return self._row_to_lecture(row)

    def list_lectures(
        self,
        workspace_id: str,
        subject_id: Optional[str] = None,
        teacher: Optional[str] = None,
        semester: Optional[str] = None,
        search_query: Optional[str] = None,
    ) -> List[Lecture]:
        query = "SELECT * FROM stellegent_lectures WHERE workspace_id = ?"
        params: List[Any] = [workspace_id]

        if subject_id:
            query += " AND subject_id = ?"
            params.append(subject_id)
        if teacher:
            query += " AND teacher LIKE ?"
            params.append(f"%{teacher}%")
        if semester:
            query += " AND semester = ?"
            params.append(semester)
        if search_query:
            query += " AND (title LIKE ? OR tags LIKE ?)"
            params.extend([f"%{search_query}%", f"%{search_query}%"])

        query += " ORDER BY created_at DESC"
        rows = self._conn.execute(query, params).fetchall()
        return [self._row_to_lecture(r) for r in rows]

    def delete_lecture(self, lecture_id: str) -> bool:
        with self._conn:
            res = self._conn.execute("DELETE FROM stellegent_lectures WHERE id = ?", (lecture_id,))
            return res.rowcount > 0

    def _row_to_lecture(self, r: sqlite3.Row) -> Lecture:
        return Lecture(
            id=r["id"],
            workspace_id=r["workspace_id"],
            subject_id=r["subject_id"],
            user_id=r["user_id"],
            title=r["title"],
            teacher=r["teacher"],
            semester=r["semester"],
            lecture_date=r["lecture_date"],
            tags=json.loads(r["tags"]),
            status=ProcessingStatus(r["status"]),
            page_count=r["page_count"],
            content_hash=r["content_hash"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )

    # --- Lecture Page operations ---
    def add_lecture_page(self, page: LecturePage) -> LecturePage:
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO stellegent_lecture_pages (
                    id, lecture_id, page_number, file_path, original_filename,
                    source_type, mime_type, file_size_bytes, width, height, regions_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    page.id,
                    page.lecture_id,
                    page.page_number,
                    page.file_path,
                    page.original_filename,
                    page.source_type.value,
                    page.mime_type,
                    page.file_size_bytes,
                    page.width,
                    page.height,
                    json.dumps([r.model_dump() for r in page.regions]),
                    page.created_at,
                ),
            )
        return page

    def get_lecture_pages(self, lecture_id: str) -> List[LecturePage]:
        rows = self._conn.execute(
            "SELECT * FROM stellegent_lecture_pages WHERE lecture_id = ? ORDER BY page_number ASC",
            (lecture_id,),
        ).fetchall()
        pages = []
        for r in rows:
            regions_data = json.loads(r["regions_json"])
            regions = [DetectedRegion(**item) for item in regions_data]
            pages.append(
                LecturePage(
                    id=r["id"],
                    lecture_id=r["lecture_id"],
                    page_number=r["page_number"],
                    file_path=r["file_path"],
                    original_filename=r["original_filename"],
                    source_type=SourceType(r["source_type"]),
                    mime_type=r["mime_type"],
                    file_size_bytes=r["file_size_bytes"],
                    width=r["width"],
                    height=r["height"],
                    regions=regions,
                    created_at=r["created_at"],
                )
            )
        return pages

    # --- Extracted Content operations ---
    def save_extracted_content(self, ext: ExtractedContent) -> ExtractedContent:
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO stellegent_extracted_contents (
                    id, lecture_id, page_id, raw_transcription, headings_json,
                    equations_json, diagram_elements_json, confidence, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ext.id,
                    ext.lecture_id,
                    ext.page_id,
                    ext.raw_transcription,
                    json.dumps(ext.headings_detected),
                    json.dumps(ext.equations_detected),
                    json.dumps(ext.diagram_elements_detected),
                    ext.confidence,
                    ext.created_at,
                ),
            )
        return ext

    def get_extracted_contents(self, lecture_id: str) -> List[ExtractedContent]:
        rows = self._conn.execute(
            "SELECT * FROM stellegent_extracted_contents WHERE lecture_id = ? ORDER BY created_at ASC",
            (lecture_id,),
        ).fetchall()
        return [
            ExtractedContent(
                id=r["id"],
                lecture_id=r["lecture_id"],
                page_id=r["page_id"],
                raw_transcription=r["raw_transcription"],
                headings_detected=json.loads(r["headings_json"]),
                equations_detected=json.loads(r["equations_json"]),
                diagram_elements_detected=json.loads(r["diagram_elements_json"]),
                confidence=r["confidence"],
                created_at=r["created_at"],
            )
            for r in rows
        ]

    # --- Structured Notes operations ---
    def save_structured_note(self, note: StructuredNote) -> StructuredNote:
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO stellegent_structured_notes (
                    id, lecture_id, title, summary, sections_json, definitions_json,
                    examples_json, equations_json, steps_json, concept_relationships_json,
                    takeaways_json, original_transcription, ai_organized_notes,
                    ai_added_explanations, user_markdown_override, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(lecture_id) DO UPDATE SET
                    title = excluded.title,
                    summary = excluded.summary,
                    sections_json = excluded.sections_json,
                    definitions_json = excluded.definitions_json,
                    examples_json = excluded.examples_json,
                    equations_json = excluded.equations_json,
                    steps_json = excluded.steps_json,
                    concept_relationships_json = excluded.concept_relationships_json,
                    takeaways_json = excluded.takeaways_json,
                    original_transcription = excluded.original_transcription,
                    ai_organized_notes = excluded.ai_organized_notes,
                    ai_added_explanations = excluded.ai_added_explanations,
                    user_markdown_override = excluded.user_markdown_override,
                    updated_at = excluded.updated_at
                """,
                (
                    note.id,
                    note.lecture_id,
                    note.title,
                    note.summary,
                    json.dumps([s.model_dump() for s in note.sections]),
                    json.dumps([d.model_dump() for d in note.key_definitions]),
                    json.dumps(note.important_examples),
                    json.dumps([e.model_dump() for e in note.equations_and_formulas]),
                    json.dumps(note.step_by_step_explanations),
                    json.dumps(note.concept_relationships),
                    json.dumps(note.key_takeaways),
                    note.original_transcription,
                    note.ai_organized_notes,
                    note.ai_added_explanations,
                    note.user_markdown_override,
                    utc_now(),
                ),
            )
        return note

    def get_structured_note(self, lecture_id: str) -> Optional[StructuredNote]:
        row = self._conn.execute(
            "SELECT * FROM stellegent_structured_notes WHERE lecture_id = ?", (lecture_id,)
        ).fetchone()
        if not row:
            return None
        sections = [json.loads(s) if isinstance(s, str) else s for s in json.loads(row["sections_json"])]
        definitions = [json.loads(d) if isinstance(d, str) else d for d in json.loads(row["definitions_json"])]
        equations = [json.loads(e) if isinstance(e, str) else e for e in json.loads(row["equations_json"])]
        return StructuredNote(
            id=row["id"],
            lecture_id=row["lecture_id"],
            title=row["title"],
            summary=row["summary"],
            sections=sections,
            key_definitions=definitions,
            important_examples=json.loads(row["examples_json"]),
            equations_and_formulas=equations,
            step_by_step_explanations=json.loads(row["steps_json"]),
            concept_relationships=json.loads(row["concept_relationships_json"]),
            key_takeaways=json.loads(row["takeaways_json"]),
            original_transcription=row["original_transcription"],
            ai_organized_notes=row["ai_organized_notes"],
            ai_added_explanations=row["ai_added_explanations"],
            user_markdown_override=row["user_markdown_override"],
            updated_at=row["updated_at"],
        )

    # --- Diagrams operations ---
    def save_diagram(self, diagram: DiagramArtifact) -> DiagramArtifact:
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO stellegent_diagrams (
                    id, lecture_id, diagram_type, title, description,
                    mermaid_code, elements_json, is_valid_syntax, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    diagram_type = excluded.diagram_type,
                    title = excluded.title,
                    description = excluded.description,
                    mermaid_code = excluded.mermaid_code,
                    elements_json = excluded.elements_json,
                    is_valid_syntax = excluded.is_valid_syntax,
                    updated_at = excluded.updated_at
                """,
                (
                    diagram.id,
                    diagram.lecture_id,
                    diagram.diagram_type.value,
                    diagram.title,
                    diagram.description,
                    diagram.mermaid_code,
                    json.dumps(diagram.elements_json),
                    1 if diagram.is_valid_syntax else 0,
                    diagram.created_at,
                    utc_now(),
                ),
            )
        return diagram

    def get_diagrams(self, lecture_id: str) -> List[DiagramArtifact]:
        rows = self._conn.execute(
            "SELECT * FROM stellegent_diagrams WHERE lecture_id = ? ORDER BY created_at ASC", (lecture_id,)
        ).fetchall()
        return [
            DiagramArtifact(
                id=r["id"],
                lecture_id=r["lecture_id"],
                diagram_type=r["diagram_type"],
                title=r["title"],
                description=r["description"],
                mermaid_code=r["mermaid_code"],
                elements_json=json.loads(r["elements_json"]),
                is_valid_syntax=bool(r["is_valid_syntax"]),
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ]

    # --- Flashcards operations ---
    def save_flashcards(self, cards: List[Flashcard]) -> List[Flashcard]:
        with self._conn:
            for card in cards:
                self._conn.execute(
                    """
                    INSERT INTO stellegent_flashcards (
                        id, lecture_id, question_type, question, answer, explanation,
                        options_json, correct_option_index, difficulty, review_status,
                        tags_json, source_citation, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        question = excluded.question,
                        answer = excluded.answer,
                        explanation = excluded.explanation,
                        options_json = excluded.options_json,
                        correct_option_index = excluded.correct_option_index,
                        difficulty = excluded.difficulty,
                        review_status = excluded.review_status,
                        tags_json = excluded.tags_json,
                        source_citation = excluded.source_citation
                    """,
                    (
                        card.id,
                        card.lecture_id,
                        card.question_type.value,
                        card.question,
                        card.answer,
                        card.explanation,
                        json.dumps(card.options),
                        card.correct_option_index,
                        card.difficulty.value,
                        card.review_status.value,
                        json.dumps(card.tags),
                        card.source_citation,
                        card.created_at,
                    ),
                )
        return cards

    def list_flashcards(
        self,
        lecture_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        review_status: Optional[str] = None,
    ) -> List[Flashcard]:
        query = "SELECT f.* FROM stellegent_flashcards f"
        params: List[Any] = []
        if workspace_id:
            query += " JOIN stellegent_lectures l ON f.lecture_id = l.id WHERE l.workspace_id = ?"
            params.append(workspace_id)
            if lecture_id:
                query += " AND f.lecture_id = ?"
                params.append(lecture_id)
        elif lecture_id:
            query += " WHERE f.lecture_id = ?"
            params.append(lecture_id)

        if review_status:
            prefix = " AND " if ("WHERE" in query) else " WHERE "
            query += f"{prefix}f.review_status = ?"
            params.append(review_status)

        query += " ORDER BY f.created_at ASC"
        rows = self._conn.execute(query, params).fetchall()
        return [
            Flashcard(
                id=r["id"],
                lecture_id=r["lecture_id"],
                question_type=QuestionType(r["question_type"]),
                question=r["question"],
                answer=r["answer"],
                explanation=r["explanation"],
                options=json.loads(r["options_json"]),
                correct_option_index=r["correct_option_index"],
                difficulty=DifficultyLevel(r["difficulty"]),
                review_status=ReviewStatus(r["review_status"]),
                tags=json.loads(r["tags_json"]),
                source_citation=r["source_citation"],
                created_at=r["created_at"],
            )
            for r in rows
        ]

    def update_flashcard_review(self, card_id: str, status: ReviewStatus) -> bool:
        with self._conn:
            res = self._conn.execute(
                "UPDATE stellegent_flashcards SET review_status = ? WHERE id = ?",
                (status.value, card_id),
            )
            return res.rowcount > 0

    def delete_flashcard(self, card_id: str) -> bool:
        with self._conn:
            res = self._conn.execute("DELETE FROM stellegent_flashcards WHERE id = ?", (card_id,))
            return res.rowcount > 0

    # --- Cross-lecture connections operations ---
    def save_cross_lecture_connections(self, conns: List[CrossLectureConnection]) -> None:
        with self._conn:
            for c in conns:
                self._conn.execute(
                    """
                    INSERT INTO stellegent_cross_lecture_connections (
                        id, workspace_id, source_lecture_id, source_lecture_title,
                        target_lecture_id, target_lecture_title, concept_name,
                        relationship_type, explanation, is_suggestion, confidence, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        c.id,
                        c.workspace_id,
                        c.source_lecture_id,
                        c.source_lecture_title,
                        c.target_lecture_id,
                        c.target_lecture_title,
                        c.concept_name,
                        c.relationship_type,
                        c.explanation,
                        1 if c.is_suggestion else 0,
                        c.confidence,
                        c.created_at,
                    ),
                )

    def list_cross_lecture_connections(self, workspace_id: str) -> List[CrossLectureConnection]:
        rows = self._conn.execute(
            "SELECT * FROM stellegent_cross_lecture_connections WHERE workspace_id = ? ORDER BY created_at DESC",
            (workspace_id,),
        ).fetchall()
        return [
            CrossLectureConnection(
                id=r["id"],
                workspace_id=r["workspace_id"],
                source_lecture_id=r["source_lecture_id"],
                source_lecture_title=r["source_lecture_title"],
                target_lecture_id=r["target_lecture_id"],
                target_lecture_title=r["target_lecture_title"],
                concept_name=r["concept_name"],
                relationship_type=r["relationship_type"],
                explanation=r["explanation"],
                is_suggestion=bool(r["is_suggestion"]),
                confidence=r["confidence"],
                created_at=r["created_at"],
            )
            for r in rows
        ]

    # --- Processing Jobs operations ---
    def create_or_update_job(self, job: ProcessingJob) -> ProcessingJob:
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO stellegent_processing_jobs (
                    id, lecture_id, workspace_id, stage, progress, status, error_message, retry_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    stage = excluded.stage,
                    progress = excluded.progress,
                    status = excluded.status,
                    error_message = excluded.error_message,
                    retry_count = excluded.retry_count,
                    updated_at = excluded.updated_at
                """,
                (
                    job.id,
                    job.lecture_id,
                    job.workspace_id,
                    job.stage.value if hasattr(job.stage, "value") else str(job.stage),
                    job.progress,
                    job.status,
                    job.error_message,
                    job.retry_count,
                    job.created_at,
                    utc_now(),
                ),
            )
        return job

    def get_job(self, job_id: str) -> Optional[ProcessingJob]:
        row = self._conn.execute("SELECT * FROM stellegent_processing_jobs WHERE id = ?", (job_id,)).fetchone()
        if not row:
            return None
        return self._row_to_job(row)

    def get_job_by_lecture(self, lecture_id: str) -> Optional[ProcessingJob]:
        row = self._conn.execute(
            "SELECT * FROM stellegent_processing_jobs WHERE lecture_id = ? ORDER BY created_at DESC LIMIT 1",
            (lecture_id,),
        ).fetchone()
        if not row:
            return None
        return self._row_to_job(row)

    def _row_to_job(self, r: sqlite3.Row) -> ProcessingJob:
        return ProcessingJob(
            id=r["id"],
            lecture_id=r["lecture_id"],
            workspace_id=r["workspace_id"],
            stage=ProcessingStatus(r["stage"]),
            progress=r["progress"],
            status=r["status"],
            error_message=r["error_message"],
            retry_count=r["retry_count"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )

    # --- Chat Messages operations ---
    def save_chat_message(self, msg: StudyChatMessage) -> StudyChatMessage:
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO stellegent_chat_messages (
                    id, workspace_id, lecture_id, user_id, role, content, citations_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    msg.id,
                    msg.workspace_id,
                    msg.lecture_id,
                    msg.user_id,
                    msg.role,
                    msg.content,
                    json.dumps([c.model_dump() for c in msg.citations]),
                    msg.created_at,
                ),
            )
        return msg

    def list_chat_messages(
        self, workspace_id: str, lecture_id: Optional[str] = None, limit: int = 50
    ) -> List[StudyChatMessage]:
        query = "SELECT * FROM stellegent_chat_messages WHERE workspace_id = ?"
        params: List[Any] = [workspace_id]
        if lecture_id:
            query += " AND (lecture_id = ? OR lecture_id IS NULL)"
            params.append(lecture_id)
        query += " ORDER BY created_at ASC LIMIT ?"
        params.append(limit)
        rows = self._conn.execute(query, params).fetchall()
        messages = []
        for r in rows:
            citations_data = json.loads(r["citations_json"])
            citations = [Citation(**c) for c in citations_data]
            messages.append(
                StudyChatMessage(
                    id=r["id"],
                    workspace_id=r["workspace_id"],
                    lecture_id=r["lecture_id"],
                    user_id=r["user_id"],
                    role=r["role"],
                    content=r["content"],
                    citations=citations,
                    created_at=r["created_at"],
                )
            )
        return messages

    # --- Search across lectures ---
    def search_lectures(
        self,
        workspace_id: str,
        query: str,
        subject_id: Optional[str] = None,
        teacher: Optional[str] = None,
        semester: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        source_type: Optional[str] = None,
    ) -> List[dict]:
        """Perform search across lecture titles, tags, structured notes, and transcriptions."""
        sql = """
            SELECT DISTINCT
                l.id as lecture_id,
                l.title as lecture_title,
                l.teacher,
                l.semester,
                l.lecture_date,
                l.tags,
                l.status,
                s.name as subject_name,
                s.color as subject_color,
                n.summary as note_summary,
                n.original_transcription as transcription
            FROM stellegent_lectures l
            LEFT JOIN stellegent_subjects s ON l.subject_id = s.id
            LEFT JOIN stellegent_structured_notes n ON l.id = n.lecture_id
            LEFT JOIN stellegent_lecture_pages p ON l.id = p.lecture_id
            WHERE l.workspace_id = ?
        """
        params: List[Any] = [workspace_id]

        if subject_id:
            sql += " AND l.subject_id = ?"
            params.append(subject_id)
        if teacher:
            sql += " AND l.teacher LIKE ?"
            params.append(f"%{teacher}%")
        if semester:
            sql += " AND l.semester = ?"
            params.append(semester)
        if date_from:
            sql += " AND l.lecture_date >= ?"
            params.append(date_from)
        if date_to:
            sql += " AND l.lecture_date <= ?"
            params.append(date_to)
        if source_type:
            sql += " AND p.source_type = ?"
            params.append(source_type)

        if query and query.strip():
            terms = f"%{query.strip()}%"
            sql += """
                AND (
                    l.title LIKE ? OR
                    l.tags LIKE ? OR
                    n.summary LIKE ? OR
                    n.original_transcription LIKE ? OR
                    n.ai_organized_notes LIKE ?
                )
            """
            params.extend([terms, terms, terms, terms, terms])

        sql += " ORDER BY l.lecture_date DESC, l.created_at DESC"
        rows = self._conn.execute(sql, params).fetchall()

        results = []
        for r in rows:
            results.append({
                "lecture_id": r["lecture_id"],
                "lecture_title": r["lecture_title"],
                "teacher": r["teacher"],
                "semester": r["semester"],
                "lecture_date": r["lecture_date"],
                "tags": json.loads(r["tags"]),
                "status": r["status"],
                "subject_name": r["subject_name"],
                "subject_color": r["subject_color"],
                "note_summary": r["note_summary"],
                "transcription_snippet": (r["transcription"] or "")[:300] if r["transcription"] else None,
            })
        return results

    def close(self) -> None:
        try:
            self._conn.close()
        except Exception:
            pass
