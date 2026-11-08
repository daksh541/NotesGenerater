"""LECTRA SQLite Repository.

Full relational persistence with initial academic seed data covering:
- Nine Sections: A, B, C, D, E, F, G, H, I
- Multiple Subjects & Professors
- Master Notes with 6-stage synthesized notes
- Smart Diagrams (Mermaid)
- Study Kits (MCQs, Flashcards, Practice Quizzes, Revision Sheets)
- Section Vault with cross-section comparisons and trust statuses
- Community reviews, upvotes, and notifications
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from ...domain.lectra import (
    ChapterModel,
    CommunityReview,
    ConflictItem,
    CourseModel,
    DefinitionItem,
    EquationItem,
    ExamConceptItem,
    ExamRevisionSheet,
    ExampleItem,
    FlashcardItem,
    MasterNoteContent,
    MCQQuestion,
    NoteSection,
    NoteTable,
    NotificationItem,
    ProcessingPipelineJob,
    ProfessorProfile,
    ProfessorStyleAnalysis,
    SectionComparisonResult,
    SectionId,
    SectionVaultNote,
    SmartDiagram,
    SourceCitation,
    SourceMaterialType,
    StorageBucketType,
    StudyKit,
    SubjectModel,
    UncertainWordItem,
    UniversityModel,
    UploadedSourceItem,
    UserProfile,
    VerificationNeedItem,
    VerificationStatus,
    VisibilityType,
    WorkspaceModel,
    WorkspaceStatus,
    utc_now,
)
from ..supabase_client import hash_password, realtime_broker


_DEFAULT_DB_PATH = Path(__file__).resolve().parents[3] / "data" / "lectra.db"


class LectraRepository:
    def __init__(self, db_path: str | Path = _DEFAULT_DB_PATH) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._init_schema()
        self._seed_initial_data()
        self._seed_phase2_tables()

    def _ensure_column(self, table: str, column: str, definition: str) -> None:
        cursor = self._conn.cursor()
        cursor.execute(f"PRAGMA table_info({table})")
        existing = {row["name"] for row in cursor.fetchall()}
        if column not in existing:
            self._conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

    def _init_schema(self) -> None:
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS lectra_users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                university TEXT NOT NULL,
                course TEXT NOT NULL,
                section TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                avatar_url TEXT,
                bio TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lectra_professors (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                title TEXT NOT NULL,
                department TEXT NOT NULL,
                email TEXT,
                avatar_url TEXT,
                subjects_taught_json TEXT NOT NULL DEFAULT '[]',
                sections_taught_json TEXT NOT NULL DEFAULT '[]',
                teaching_style TEXT NOT NULL,
                exam_focus_topics_json TEXT NOT NULL DEFAULT '[]',
                preferred_terminology_json TEXT NOT NULL DEFAULT '{}',
                formatting_preferences TEXT NOT NULL,
                reference_materials_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lectra_subjects (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                code TEXT NOT NULL,
                teacher TEXT NOT NULL,
                professor_id TEXT,
                semester TEXT NOT NULL,
                description TEXT,
                color TEXT NOT NULL,
                chapters_count INTEGER NOT NULL DEFAULT 0,
                active_sections_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lectra_uploaded_sources (
                id TEXT PRIMARY KEY,
                lecture_id TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                source_type TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL DEFAULT 0,
                mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
                page_number INTEGER NOT NULL DEFAULT 1,
                extracted_text_snippet TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_lectra_sources_lecture ON lectra_uploaded_sources(lecture_id);

            CREATE TABLE IF NOT EXISTS lectra_master_notes (
                id TEXT PRIMARY KEY,
                lecture_id TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                subject_id TEXT,
                subject_name TEXT NOT NULL,
                subject_code TEXT NOT NULL,
                chapter TEXT NOT NULL,
                professor TEXT NOT NULL,
                section TEXT NOT NULL,
                source_sections_json TEXT NOT NULL DEFAULT '[]',
                summary TEXT NOT NULL,
                learning_objectives_json TEXT NOT NULL DEFAULT '[]',
                sections_json TEXT NOT NULL DEFAULT '[]',
                key_definitions_json TEXT NOT NULL DEFAULT '[]',
                important_formulas_json TEXT NOT NULL DEFAULT '[]',
                important_examples_json TEXT NOT NULL DEFAULT '[]',
                key_takeaways_json TEXT NOT NULL DEFAULT '[]',
                exam_focused_concepts_json TEXT NOT NULL DEFAULT '[]',
                needs_verification_json TEXT NOT NULL DEFAULT '[]',
                citations_json TEXT NOT NULL DEFAULT '[]',
                raw_board_transcription TEXT NOT NULL DEFAULT '',
                ai_synthesized_markdown TEXT NOT NULL DEFAULT '',
                user_markdown_override TEXT,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_lectra_notes_lecture ON lectra_master_notes(lecture_id);

            CREATE TABLE IF NOT EXISTS lectra_smart_diagrams (
                id TEXT PRIMARY KEY,
                lecture_id TEXT NOT NULL,
                diagram_type TEXT NOT NULL DEFAULT 'flowchart',
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                mermaid_code TEXT NOT NULL,
                svg_code TEXT,
                uncertain_elements_json TEXT NOT NULL DEFAULT '[]',
                is_valid_syntax INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_lectra_diagrams_lecture ON lectra_smart_diagrams(lecture_id);

            CREATE TABLE IF NOT EXISTS lectra_study_kits (
                id TEXT PRIMARY KEY,
                lecture_id TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                subject_name TEXT NOT NULL,
                chapter TEXT NOT NULL,
                key_takeaways_json TEXT NOT NULL DEFAULT '[]',
                mcqs_json TEXT NOT NULL DEFAULT '[]',
                flashcards_json TEXT NOT NULL DEFAULT '[]',
                revision_sheet_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lectra_vault_notes (
                id TEXT PRIMARY KEY,
                lecture_id TEXT NOT NULL,
                title TEXT NOT NULL,
                chapter TEXT NOT NULL,
                subject_id TEXT,
                subject_name TEXT NOT NULL,
                subject_code TEXT NOT NULL,
                professor TEXT NOT NULL,
                section TEXT NOT NULL,
                source_sections_json TEXT NOT NULL DEFAULT '[]',
                lecture_date TEXT NOT NULL,
                contributor_id TEXT NOT NULL,
                contributor_name TEXT NOT NULL,
                contributor_avatar TEXT,
                verification_status TEXT NOT NULL DEFAULT 'unverified',
                upvotes INTEGER NOT NULL DEFAULT 0,
                reports_count INTEGER NOT NULL DEFAULT 0,
                summary TEXT NOT NULL,
                download_available INTEGER NOT NULL DEFAULT 1,
                tags_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_lectra_vault_section ON lectra_vault_notes(section);
            CREATE INDEX IF NOT EXISTS idx_lectra_vault_subject ON lectra_vault_notes(subject_code);

            CREATE TABLE IF NOT EXISTS lectra_community_reviews (
                id TEXT PRIMARY KEY,
                vault_note_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                user_section TEXT NOT NULL,
                rating INTEGER NOT NULL DEFAULT 5,
                comment TEXT NOT NULL,
                is_inaccuracy_report INTEGER NOT NULL DEFAULT 0,
                inaccuracy_details TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_lectra_reviews_note ON lectra_community_reviews(vault_note_id);

            CREATE TABLE IF NOT EXISTS lectra_notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'vault',
                link TEXT,
                read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lectra_pipeline_jobs (
                id TEXT PRIMARY KEY,
                lecture_id TEXT NOT NULL,
                stage_index INTEGER NOT NULL DEFAULT 1,
                total_stages INTEGER NOT NULL DEFAULT 10,
                stage_name TEXT NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'running',
                details TEXT NOT NULL,
                error_message TEXT,
                retry_count INTEGER NOT NULL DEFAULT 0,
                job_payload_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_lectra_jobs_lecture ON lectra_pipeline_jobs(lecture_id);

            CREATE TABLE IF NOT EXISTS lectra_workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                university TEXT NOT NULL,
                department TEXT NOT NULL,
                semester TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL
            );

            -- ================================================================
            -- PHASE 2 SUPABASE POSTGRESQL SCHEMA TABLES
            -- ================================================================
            CREATE TABLE IF NOT EXISTS universities (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                domain TEXT,
                location TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS courses (
                id TEXT PRIMARY KEY,
                university_id TEXT NOT NULL,
                course_name TEXT NOT NULL,
                course_code TEXT NOT NULL,
                department TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_courses_university ON courses(university_id);

            CREATE TABLE IF NOT EXISTS professors (
                id TEXT PRIMARY KEY,
                university_id TEXT,
                full_name TEXT NOT NULL,
                subjects TEXT NOT NULL DEFAULT '[]',
                title TEXT NOT NULL DEFAULT 'Professor',
                department TEXT NOT NULL DEFAULT 'Computer Science',
                email TEXT,
                avatar_url TEXT,
                sections_taught_json TEXT NOT NULL DEFAULT '[]',
                teaching_style TEXT NOT NULL DEFAULT '',
                exam_focus_topics_json TEXT NOT NULL DEFAULT '[]',
                preferred_terminology_json TEXT NOT NULL DEFAULT '{}',
                formatting_preferences TEXT NOT NULL DEFAULT '',
                reference_materials_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS subjects (
                id TEXT PRIMARY KEY,
                course_id TEXT,
                subject_name TEXT NOT NULL,
                subject_code TEXT NOT NULL,
                professor_id TEXT,
                teacher TEXT NOT NULL DEFAULT '',
                semester TEXT NOT NULL DEFAULT 'Fall 2026',
                description TEXT,
                color TEXT NOT NULL DEFAULT '#0F172A',
                chapters_count INTEGER NOT NULL DEFAULT 0,
                active_sections_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_subjects_course ON subjects(course_id);

            CREATE TABLE IF NOT EXISTS chapters (
                id TEXT PRIMARY KEY,
                subject_id TEXT NOT NULL,
                chapter_name TEXT NOT NULL,
                chapter_number INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id);

            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                university_id TEXT,
                university TEXT NOT NULL DEFAULT 'Stanford University',
                course_id TEXT,
                course TEXT NOT NULL DEFAULT 'B.S. Computer Science & AI',
                subject_id TEXT,
                subject TEXT,
                semester TEXT NOT NULL DEFAULT 'Fall 2026',
                section TEXT NOT NULL DEFAULT 'A',
                role TEXT NOT NULL DEFAULT 'student',
                avatar_url TEXT,
                bio TEXT,
                email_verified INTEGER NOT NULL DEFAULT 1,
                onboarding_completed INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_profiles_university ON profiles(university_id);
            CREATE INDEX IF NOT EXISTS idx_profiles_section ON profiles(section);

            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                subject_id TEXT,
                chapter_id TEXT,
                professor_id TEXT,
                section TEXT NOT NULL DEFAULT 'A',
                lecture_date TEXT NOT NULL,
                title TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                visibility TEXT NOT NULL DEFAULT 'private',
                university TEXT NOT NULL DEFAULT 'Stanford University',
                department TEXT NOT NULL DEFAULT 'Computer Science & Engineering',
                semester TEXT NOT NULL DEFAULT 'Fall 2026',
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);
            CREATE INDEX IF NOT EXISTS idx_workspaces_subject ON workspaces(subject_id);

            CREATE TABLE IF NOT EXISTS uploaded_sources (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_type TEXT NOT NULL,
                storage_path TEXT NOT NULL,
                bucket_id TEXT NOT NULL DEFAULT 'private-student-uploads',
                source_type TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL DEFAULT 0,
                page_number INTEGER NOT NULL DEFAULT 1,
                extracted_text_snippet TEXT,
                visibility TEXT NOT NULL DEFAULT 'private',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_uploaded_sources_workspace ON uploaded_sources(workspace_id);
            CREATE INDEX IF NOT EXISTS idx_uploaded_sources_user ON uploaded_sources(user_id);

            CREATE TABLE IF NOT EXISTS master_notes (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                user_id TEXT NOT NULL DEFAULT 'usr_lectra_default',
                title TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '{}',
                version INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'published',
                visibility TEXT NOT NULL DEFAULT 'private',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_master_notes_workspace ON master_notes(workspace_id);
            CREATE INDEX IF NOT EXISTS idx_master_notes_user ON master_notes(user_id);

            CREATE TABLE IF NOT EXISTS community_contributions (
                id TEXT PRIMARY KEY,
                master_notes_id TEXT NOT NULL,
                contributor_id TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'section',
                verification_status TEXT NOT NULL DEFAULT 'unverified',
                section TEXT NOT NULL DEFAULT 'A',
                upvotes INTEGER NOT NULL DEFAULT 0,
                reports_count INTEGER NOT NULL DEFAULT 0,
                title TEXT,
                chapter TEXT,
                subject_id TEXT,
                subject_name TEXT,
                subject_code TEXT,
                professor TEXT,
                source_sections_json TEXT NOT NULL DEFAULT '[]',
                lecture_date TEXT,
                contributor_name TEXT,
                contributor_avatar TEXT,
                summary TEXT,
                download_available INTEGER NOT NULL DEFAULT 1,
                tags_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_community_master_notes ON community_contributions(master_notes_id);
            CREATE INDEX IF NOT EXISTS idx_community_contributor ON community_contributions(contributor_id);

            CREATE TABLE IF NOT EXISTS study_kits (
                id TEXT PRIMARY KEY,
                master_notes_id TEXT NOT NULL,
                kit_type TEXT NOT NULL DEFAULT 'complete',
                content TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_study_kits_master_notes ON study_kits(master_notes_id);

            CREATE TABLE IF NOT EXISTS flashcards (
                id TEXT PRIMARY KEY,
                study_kit_id TEXT NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                explanation TEXT,
                difficulty TEXT NOT NULL DEFAULT 'medium',
                review_status TEXT NOT NULL DEFAULT 'new',
                topic_tag TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_flashcards_study_kit ON flashcards(study_kit_id);

            CREATE TABLE IF NOT EXISTS quiz_questions (
                id TEXT PRIMARY KEY,
                study_kit_id TEXT NOT NULL,
                question TEXT NOT NULL,
                options TEXT NOT NULL DEFAULT '[]',
                correct_answer TEXT NOT NULL,
                correct_option_index INTEGER NOT NULL DEFAULT 0,
                explanation TEXT NOT NULL,
                difficulty TEXT NOT NULL DEFAULT 'medium',
                topic_reference TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_quiz_questions_study_kit ON quiz_questions(study_kit_id);

            -- Auth Sessions & Verification / Reset Tokens
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                access_token TEXT UNIQUE NOT NULL,
                refresh_token TEXT UNIQUE NOT NULL,
                expires_at INTEGER NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(access_token);
            CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                email TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                email TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            """
        )
        # Ensure new columns exist on existing databases
        self._ensure_column("lectra_users", "university_id", "TEXT")
        self._ensure_column("lectra_users", "course_id", "TEXT")
        self._ensure_column("lectra_users", "subject_id", "TEXT")
        self._ensure_column("lectra_users", "subject", "TEXT")
        self._ensure_column("lectra_users", "semester", "TEXT NOT NULL DEFAULT 'Fall 2026'")
        self._ensure_column("lectra_users", "email_verified", "INTEGER NOT NULL DEFAULT 1")
        self._ensure_column("lectra_users", "onboarding_completed", "INTEGER NOT NULL DEFAULT 1")

        self._ensure_column("lectra_workspaces", "user_id", "TEXT")
        self._ensure_column("lectra_workspaces", "subject_id", "TEXT")
        self._ensure_column("lectra_workspaces", "chapter_id", "TEXT")
        self._ensure_column("lectra_workspaces", "professor_id", "TEXT")
        self._ensure_column("lectra_workspaces", "section", "TEXT NOT NULL DEFAULT 'A'")
        self._ensure_column("lectra_workspaces", "lecture_date", "TEXT")
        self._ensure_column("lectra_workspaces", "title", "TEXT")
        self._ensure_column("lectra_workspaces", "status", "TEXT NOT NULL DEFAULT 'active'")
        self._ensure_column("lectra_workspaces", "visibility", "TEXT NOT NULL DEFAULT 'private'")

        self._ensure_column("lectra_master_notes", "workspace_id", "TEXT")
        self._ensure_column("lectra_master_notes", "user_id", "TEXT NOT NULL DEFAULT 'usr_lectra_default'")
        self._ensure_column("lectra_master_notes", "version", "INTEGER NOT NULL DEFAULT 1")
        self._ensure_column("lectra_master_notes", "status", "TEXT NOT NULL DEFAULT 'published'")
        self._ensure_column("lectra_master_notes", "visibility", "TEXT NOT NULL DEFAULT 'private'")
        self._ensure_column("lectra_master_notes", "created_at", "TEXT")
        self._ensure_column("lectra_master_notes", "tables_json", "TEXT NOT NULL DEFAULT '[]'")
        self._ensure_column("lectra_master_notes", "diagram_summaries_json", "TEXT NOT NULL DEFAULT '[]'")
        self._ensure_column("lectra_master_notes", "exam_revision_summary_json", "TEXT NOT NULL DEFAULT '[]'")
        self._ensure_column("lectra_master_notes", "uncertain_words_json", "TEXT NOT NULL DEFAULT '[]'")
        self._ensure_column("lectra_master_notes", "source_conflicts_json", "TEXT NOT NULL DEFAULT '[]'")
        self._ensure_column("lectra_master_notes", "professor_style_json", "TEXT")
        self._ensure_column("lectra_master_notes", "ocr_confidence", "REAL NOT NULL DEFAULT 0.94")

        self._ensure_column("lectra_smart_diagrams", "original_image_url", "TEXT")
        self._ensure_column("lectra_smart_diagrams", "is_approximation", "INTEGER NOT NULL DEFAULT 0")
        self._ensure_column("lectra_smart_diagrams", "confidence", "REAL NOT NULL DEFAULT 0.93")
        self._ensure_column("lectra_smart_diagrams", "reconstructed_from", "TEXT")

        self._ensure_column("lectra_uploaded_sources", "workspace_id", "TEXT")
        self._ensure_column("lectra_uploaded_sources", "user_id", "TEXT NOT NULL DEFAULT 'usr_lectra_default'")
        self._ensure_column("lectra_uploaded_sources", "file_name", "TEXT")
        self._ensure_column("lectra_uploaded_sources", "file_type", "TEXT")
        self._ensure_column("lectra_uploaded_sources", "storage_path", "TEXT")
        self._ensure_column("lectra_uploaded_sources", "bucket_id", "TEXT NOT NULL DEFAULT 'private-student-uploads'")
        self._ensure_column("lectra_uploaded_sources", "visibility", "TEXT NOT NULL DEFAULT 'private'")
        self._ensure_column("lectra_uploaded_sources", "preprocessed_path", "TEXT")
        self._ensure_column("lectra_uploaded_sources", "preview_url", "TEXT")
        self._ensure_column("lectra_uploaded_sources", "ocr_confidence", "REAL")
        self._ensure_column("lectra_uploaded_sources", "metadata_json", "TEXT NOT NULL DEFAULT '{}'")

        self._ensure_column("lectra_vault_notes", "master_notes_id", "TEXT")
        self._ensure_column("lectra_vault_notes", "visibility", "TEXT NOT NULL DEFAULT 'section'")

        self._ensure_column("lectra_pipeline_jobs", "total_stages", "INTEGER NOT NULL DEFAULT 10")
        self._ensure_column("lectra_pipeline_jobs", "retry_count", "INTEGER NOT NULL DEFAULT 0")
        self._ensure_column("lectra_pipeline_jobs", "job_payload_json", "TEXT")

        self._conn.commit()
        self._ensure_default_workspace()

    def _ensure_default_workspace(self) -> None:
        cursor = self._conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM lectra_workspaces")
        if cursor.fetchone()[0] == 0:
            ws = WorkspaceModel(
                id="ws_main",
                user_id="usr_lectra_default",
                subject_id="subj_cs244",
                chapter_id="chap_cs244_4",
                professor_id="prof_thorne",
                section=SectionId.A,
                lecture_date="2026-10-24",
                title="Stanford Computer Science & AI Workspace",
                name="Stanford Computer Science & AI Workspace",
                status=WorkspaceStatus.ACTIVE,
                visibility=VisibilityType.SECTION,
                university="Stanford University",
                department="Computer Science & Engineering",
                semester="Fall 2026",
                owner_id="usr_lectra_default",
                description="Primary multi-section academic collaboration workspace for Sections A through I.",
            )
            self.save_workspace(ws)

    def _seed_initial_data(self) -> None:
        """Seed realistic university courses, professors across sections A-I, master notes, study kits, and vault."""
        cursor = self._conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM lectra_users")
        if cursor.fetchone()[0] > 0:
            return  # Already seeded

        # 1. Default user profile
        default_user = UserProfile(
            id="usr_lectra_default",
            email="alex.rivera@stanford.edu",
            password_hash=hash_password("LectraPass2026!"),
            full_name="Alex Rivera",
            university_id="univ_stanford",
            university="Stanford University",
            course_id="crs_cs_bs",
            course="B.S. Computer Science & AI",
            subject_id="subj_cs244",
            subject="Distributed Systems & Cloud Computing",
            semester="Fall 2026",
            section=SectionId.A,
            role="student",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            bio="Junior year CS student specializing in Systems and AI. Section A representative.",
            email_verified=True,
            onboarding_completed=True,
        )
        self.save_user(default_user)

        # 2. Professors across Sections
        professors = [
            ProfessorProfile(
                id="prof_thorne",
                name="Dr. Aris Thorne",
                title="Associate Professor",
                department="Computer Science & Systems",
                email="athorne@stanford.edu",
                avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                subjects_taught=["Distributed Systems & Cloud Computing", "Operating Systems Architecture"],
                sections_taught=[SectionId.A, SectionId.C, SectionId.E],
                teaching_style="Deep structural proofs, whiteboard consensus diagrams, emphasizes edge failure modes",
                exam_focus_topics=["Raft Invariants & Leader Election", "Split-Brain Resolution", "Byzantine Fault Tolerance", "CAP Theorem trade-offs"],
                preferred_terminology={
                    "consensus": "Distributed State Machine Agreement",
                    "heartbeat": "Periodic Leader Liveness Probe",
                    "term": "Monotonically Increasing Epoch Identifier"
                },
                formatting_preferences="Always numbers state-machine invariants (I1..In) and draws log index tables",
                reference_materials_count=14,
            ),
            ProfessorProfile(
                id="prof_vance",
                name="Prof. Elena Vance",
                title="Full Professor & Chair",
                department="Computer Science & Machine Intelligence",
                email="evance@stanford.edu",
                avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
                subjects_taught=["Deep Neural Architectures & Attention", "Statistical Machine Learning"],
                sections_taught=[SectionId.B, SectionId.D, SectionId.F, SectionId.G],
                teaching_style="Linear algebra geometric intuition, mathematical rigor, detailed forward/backward pass board layouts",
                exam_focus_topics=["Self-Attention Multi-Head Matrix Derivations", "Scaled Dot-Product Numerical Stability", "Positional Encodings in High Dimensions"],
                preferred_terminology={
                    "query_key_product": "Bilinear Semantic Alignment Matrix",
                    "residual_connection": "Identity Gradient Highway",
                    "layer_norm": "Per-Token Feature Normalization"
                },
                formatting_preferences="Detailed tensor shape annotations (e.g. [B, S, H, D]) on all matrix operations",
                reference_materials_count=22,
            ),
            ProfessorProfile(
                id="prof_brody",
                name="Dr. Marcus Brody",
                title="Distinguished Lecturer",
                department="Computer Science & Theory",
                email="mbrody@stanford.edu",
                avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
                subjects_taught=["Advanced Algorithms & Optimization", "Discrete Structures"],
                sections_taught=[SectionId.H, SectionId.I],
                teaching_style="Socratic problem reduction, blackboard recursion trees, amortized analysis tables",
                exam_focus_topics=["Dynamic Programming State Space Compression", "Network Flow Minimum Cut Reductions", "NP-Completeness 3-SAT Reductions"],
                preferred_terminology={
                    "dp_table": "Optimal Substructure Memoization Lattice",
                    "reduction": "Polynomial Time Mapping Transformation"
                },
                formatting_preferences="Requires formal inductive recurrence relations before any pseudocode",
                reference_materials_count=18,
            ),
        ]
        for p in professors:
            self.save_professor(p)

        # 3. Subjects
        subjects = [
            SubjectModel(
                id="subj_cs244",
                workspace_id="ws_main",
                name="Distributed Systems & Cloud Computing",
                code="CS-244",
                teacher="Dr. Aris Thorne",
                professor_id="prof_thorne",
                semester="Fall 2026",
                description="Consensus algorithms, replication protocols, fault tolerance, Raft, Paxos, and large-scale cloud architectures.",
                color="#0F172A",
                chapters_count=8,
                active_sections=[SectionId.A, SectionId.B, SectionId.C, SectionId.D, SectionId.E, SectionId.F, SectionId.G, SectionId.H, SectionId.I],
            ),
            SubjectModel(
                id="subj_cs224n",
                workspace_id="ws_main",
                name="Deep Neural Architectures & Attention",
                code="CS-224N",
                teacher="Prof. Elena Vance",
                professor_id="prof_vance",
                semester="Fall 2026",
                description="Transformer models, Multi-Head Self Attention, Vision Transformers, and modern foundation model pretraining.",
                color="#1E3A8A",
                chapters_count=10,
                active_sections=[SectionId.A, SectionId.B, SectionId.C, SectionId.D, SectionId.E, SectionId.F, SectionId.G, SectionId.H, SectionId.I],
            ),
            SubjectModel(
                id="subj_cs161",
                workspace_id="ws_main",
                name="Advanced Algorithms & Optimization",
                code="CS-161",
                teacher="Dr. Marcus Brody",
                professor_id="prof_brody",
                semester="Fall 2026",
                description="Divide-and-conquer, graph algorithms, dynamic programming, network flow, and NP-completeness.",
                color="#312E81",
                chapters_count=12,
                active_sections=[SectionId.A, SectionId.B, SectionId.C, SectionId.D, SectionId.E, SectionId.F, SectionId.G, SectionId.H, SectionId.I],
            ),
        ]
        for s in subjects:
            self.save_subject(s)

        # 4. Master Note 1: Raft Consensus Protocol
        lec1_id = "lec_raft_consensus_01"
        raft_note = MasterNoteContent(
            id="mnote_raft_01",
            lecture_id=lec1_id,
            title="Raft Consensus Protocol & Distributed State Machine Replication",
            subject_id="subj_cs244",
            subject_name="Distributed Systems & Cloud Computing",
            subject_code="CS-244",
            chapter="Chapter 4: Consensus in Fault-Tolerant Clusters",
            professor="Dr. Aris Thorne",
            section=SectionId.A,
            source_sections=[SectionId.A, SectionId.C],
            summary="A comprehensive, multi-section master guide synthesizing Dr. Thorne's Section A blackboard derivations and Section C edge-case clarifications with the official Ongaro & Ousterhout Raft paper and course syllabus.",
            learning_objectives=[
                "Understand the Leader Election safety invariants and randomized timer mechanisms.",
                "Derive the Log Matching Property and explain how log conflicts are pruned and overwritten.",
                "Distinguish commit condition in the current term vs older terms (Figure 8 edge case).",
                "Synthesize Section A's proof of leader completeness with Section C's network partition examples."
            ],
            sections=[
                NoteSection(
                    heading="1. Cluster States & Leader Election Mechanics",
                    content="A Raft cluster consists of typically 2F+1 nodes to tolerate F crash failures. Each server exists in one of three mutually exclusive states: Follower, Candidate, or Leader.\n\n- Follower: Responds to RPCs from candidates and leaders. If no heartbeat is received within electionTimeout (randomized between 150ms-300ms), transitions to Candidate.\n- Candidate: Increments currentTerm, votes for itself, and broadcasts RequestVote RPCs to all peers.\n- Leader: Once receiving votes from a strict quorum (majority: (N/2)+1), asserts authority by immediately broadcasting empty AppendEntries heartbeats.",
                    subsections=["Randomized Election Timeout Rationale", "Quorum Intersection Rule"],
                    professor_emphasis="Dr. Thorne highlighted on Section A board: 'Randomized timers split split-votes before they cascade. Exam question guaranteed on minimum quorum sizes!'",
                    is_exam_critical=True
                ),
                NoteSection(
                    heading="2. Log Replication & The Log Matching Invariant",
                    content="The leader receives client commands, appends them to its local log as uncommitted entries, and issues AppendEntries RPCs.\n\nLog Matching Invariant:\n1. If two entries in different logs have the same index and term, then they store the same command.\n2. If two entries in different logs have the same index and term, then their logs are identical in all preceding entries.\n\nConsistency Check: When sending AppendEntries, the leader includes (prevLogIndex, prevLogTerm). If the follower does not find a matching entry, it rejects the RPC. The leader then decrements nextIndex[peer] and retries until the logs converge.",
                    subsections=["prevLogIndex Induction", "Fast Rollback Optimization (Section C Note)"],
                    professor_emphasis="Section C Lecture added: 'On network partition healing, follower overwrites all conflicting entries starting at the first mismatched index.'",
                    is_exam_critical=True
                ),
                NoteSection(
                    heading="3. The Commit Condition & Current Term Constraint (Figure 8)",
                    content="A leader cannot safely commit a log entry from an older term simply by counting replicas. An entry from an older term is only committed indirectly once an entry from the leader's current term is replicated on a majority.",
                    subsections=["The Corner Case Vulnerability", "Direct vs Indirect Commitment"],
                    professor_emphasis="Dr. Thorne explicitly warned: 'Memorize Figure 8 from the Raft paper. You must never update commitIndex using prior terms directly.'",
                    is_exam_critical=True
                )
            ],
            key_definitions=[
                DefinitionItem(
                    term="Leader Completeness",
                    definition="If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.",
                    context="Proof relies on the majority overlap between the voting quorum and the replication quorum.",
                    source_citation="Ongaro et al., Section 5.4.1"
                ),
                DefinitionItem(
                    term="Split-Brain",
                    definition="A state where network partition isolates servers into multiple sub-clusters, each attempting to independently elect a leader.",
                    context="Prevented in Raft by requiring a strict strict majority (floor(N/2)+1). Only the majority partition can elect a leader.",
                    source_citation="Section A Whiteboard Diagram"
                )
            ],
            important_formulas=[
                EquationItem(
                    latex_or_text="N \\ge 2F + 1 \\quad \\implies \\quad \\text{Quorum} = \\lfloor N/2 \\rfloor + 1",
                    explanation="Determines the minimum cluster size N required to tolerate F simultaneous crash faults with majority overlap.",
                    variables={"N": "Total servers in cluster", "F": "Tolerated Byzantine or crash failures"}
                ),
                EquationItem(
                    latex_or_text="\\text{ElectionTimeout} \\sim \\mathcal{U}(150\\text{ms}, 300\\text{ms})",
                    explanation="Uniform distribution ensures candidate election timers rarely expire in synchrony, breaking vote ties.",
                    variables={"U": "Continuous Uniform Distribution"}
                )
            ],
            important_examples=[
                ExampleItem(
                    title="Five-Node Partition Scenario (Sections A & C Unified)",
                    description="Cluster nodes {S1, S2, S3, S4, S5}. Network splits into partition Alpha {S1, S2} and partition Beta {S3, S4, S5}.",
                    solution_steps=[
                        "S1 is the old leader in partition Alpha. When clients send writes to S1, S1 cannot replicate to majority (2 of 5). Writes remain uncommitted.",
                        "Partition Beta experiences election timeout. S3 increments term and gets votes from S4 and S5 (3 of 5). S3 becomes legitimate new leader.",
                        "Partition heals. S1 discovers S3's higher term, reverts to Follower, and overwrites its uncommitted writes with S3's log."
                    ],
                    section_source="Derived from Dr. Thorne's classroom whiteboard walkthrough in Section A, verified by Section C."
                )
            ],
            key_takeaways=[
                "Leader election requires strict majority quorum; ties broken by randomized timeouts.",
                "AppendEntries consistency check enforces log matching by backwards inductive verification.",
                "Old term entries cannot be committed directly; they require a current-term majority anchor.",
                "Section A and Section C notes agree that heartbeats prevent spurious elections during quiescent periods."
            ],
            exam_focused_concepts=[
                ExamConceptItem(
                    topic="Figure 8 Older Term Commit Rule",
                    reason="Appeared on 3 out of last 4 midterms. Dr. Thorne emphasized this in both Section A and Section C.",
                    frequency_or_weight="100% Guaranteed Exam Topic",
                    section_emphasis="Section A: theoretical proof; Section C: trace example with 5 servers"
                ),
                ExamConceptItem(
                    topic="RequestVote Candidate Restrictions",
                    reason="Candidate is rejected if voter's log is more up-to-date (lastLogTerm > candidate.lastLogTerm OR (terms equal and lastLogIndex >= candidate)).",
                    frequency_or_weight="High Weight (Short Answer)",
                    section_emphasis="Stressed in Section A syllabus review"
                )
            ],
            needs_verification=[
                VerificationNeedItem(
                    item="Joint Consensus vs Single-Server Configuration Changes",
                    reason="Section A notes mention single-server membership changes (Alpha=1), whereas textbook references Joint Consensus (Cold,new). Needs verification against final exam syllabus.",
                    source_doc="Reference Textbook Chapter 4 vs Section A Board Photo 3"
                )
            ],
            citations=[
                SourceCitation(
                    source_name="Board_Whiteboard_SectionA_Oct24.jpg",
                    source_type="Whiteboard Image",
                    page_or_region="Top-Left Quad (Nodes S1..S5)",
                    quote="Strict Quorum = floor(N/2) + 1. Never commit without majority ack!",
                    section_tag="Section A"
                ),
                SourceCitation(
                    source_name="Ongaro_Raft_Paper_Official.pdf",
                    source_type="Reference PDF",
                    page_or_region="Page 6, Section 5.3",
                    quote="Logs are organized as shown in Figure 6. Each entry contains a log index and a term number.",
                    section_tag="Official Reference"
                )
            ],
            raw_board_transcription="Raft Consensus: 3 states: Follower, Candidate, Leader. Election timeout = 150-300ms random. Quorum = (N/2)+1. Heartbeats keep followers quiet. Figure 8: don't commit old terms!",
            ai_synthesized_markdown="""# Raft Consensus Protocol

## Executive Summary
This document provides the definitive academic master notes for **CS-244: Distributed Systems**, harmonizing Dr. Aris Thorne's whiteboard lectures across **Sections A and C** with official foundational publications.

---

### Core State Invariants
- **Follower**: Passive listener. Responds to `RequestVote` and `AppendEntries`.
- **Candidate**: Active aspirant. Requests votes upon timeout.
- **Leader**: Dominant coordinator. Sends regular heartbeats to suppress new elections.

```
       [Times out, starts election]
Follower ------------------------> Candidate
   ^                                   |
   | [Discovers higher term]          | [Receives votes from quorum]
   |                                   v
   +------------------------------- Leader
```

### Log Replication Protocol
Every entry consists of `(Term, Index, Command)`. The leader guarantees that once an entry is stored on a majority of nodes in its current term, it is safe to apply to the state machine.
""",
        )
        self.save_master_note(raft_note)

        # Diagram for Raft
        raft_diagram = SmartDiagram(
            id="diag_raft_01",
            lecture_id=lec1_id,
            diagram_type="state_machine",
            title="Raft Server States & Transition Invariants",
            description="State machine showing Follower, Candidate, and Leader transitions with exact timeout conditions.",
            mermaid_code="""stateDiagram-v2
    [*] --> Follower
    Follower --> Candidate : Election Timeout (150-300ms)
    Candidate --> Leader : Votes from Majority Quorum (N/2 + 1)
    Candidate --> Follower : Discovers Higher Term or Valid Leader
    Candidate --> Candidate : Split Vote Timeout (Re-randomize)
    Leader --> Follower : Discovers Server with Higher Term
    Leader --> [*] : Cluster Shutdown""",
            svg_code=None,
            uncertain_elements=[],
            is_valid_syntax=True,
        )
        self.save_diagram(raft_diagram)

        # Study Kit for Raft
        raft_study_kit = StudyKit(
            id="skit_raft_01",
            lecture_id=lec1_id,
            title="Raft Protocol Complete Mastery Kit",
            subject_name="Distributed Systems & Cloud Computing",
            chapter="Chapter 4: Consensus in Fault-Tolerant Clusters",
            key_takeaways=[
                "Leader election requires strict majority quorum (floor(N/2)+1).",
                "Randomized election timeouts break ties and avoid split votes.",
                "Log entries from previous terms cannot be committed directly; they require a current-term entry committed by majority.",
                "Candidates with less up-to-date logs are denied votes by up-to-date peers."
            ],
            mcqs=[
                MCQQuestion(
                    id="mcq_raft_1",
                    question="In a Raft cluster of 7 nodes, what is the minimum number of functional nodes required to maintain consensus and make progress?",
                    options=["3 nodes", "4 nodes", "5 nodes", "6 nodes"],
                    correct_option_index=1,
                    explanation="For N=7 nodes, a strict majority quorum is floor(7/2) + 1 = 4 nodes. Thus, the cluster can tolerate up to 3 crash failures.",
                    difficulty="easy",
                    topic_reference="Cluster Quorum Sizing"
                ),
                MCQQuestion(
                    id="mcq_raft_2",
                    question="Why does Raft prohibit a leader from directly committing an entry from an older term simply by counting replica copies?",
                    options=[
                        "Older entries might be rejected by the client application",
                        "A future leader with a higher term could overwrite it if a subsequent election occurs before current-term replication (Figure 8)",
                        "Older entries do not carry an indexed hash pointer",
                        "Heartbeat packets cannot transmit old term identifiers"
                    ],
                    correct_option_index=1,
                    explanation="As demonstrated in Figure 8 of the Raft paper, an older term entry replicated on a majority can still be overwritten by a subsequent leader. Raft solves this by requiring the leader to commit at least one entry from its current term.",
                    difficulty="hard",
                    topic_reference="Figure 8 Corner Case"
                ),
                MCQQuestion(
                    id="mcq_raft_3",
                    question="What information does a follower use during AppendEntries to ensure its log is consistent with the leader's log?",
                    options=[
                        "A SHA-256 Merkle root of the entire database",
                        "The (prevLogIndex, prevLogTerm) tuple preceding the new entries",
                        "The client session authentication ticket",
                        "A randomized cryptographic nonce generated by the candidate"
                    ],
                    correct_option_index=1,
                    explanation="The leader includes prevLogIndex and prevLogTerm. If the follower has a mismatch at that exact slot, it rejects the RPC, initiating log backtracking.",
                    difficulty="medium",
                    topic_reference="Log Matching Property"
                )
            ],
            flashcards=[
                FlashcardItem(
                    id="fc_raft_1",
                    question="What is the Log Matching Property in Raft?",
                    answer="If two entries in different logs have the same index and term, they store the same command AND their logs are identical in all preceding entries.",
                    explanation="Enforced inductively by AppendEntries checking prevLogIndex and prevLogTerm.",
                    difficulty="medium",
                    review_status="needs_review",
                    topic_tag="Invariants"
                ),
                FlashcardItem(
                    id="fc_raft_2",
                    question="How does Raft break split-vote ties during Leader Election?",
                    answer="By choosing election timeouts randomly from a fixed interval (e.g., 150ms-300ms) on each node.",
                    explanation="This spreads out timeouts so one server times out before others, collects votes, and asserts leadership.",
                    difficulty="easy",
                    review_status="mastered",
                    topic_tag="Leader Election"
                ),
                FlashcardItem(
                    id="fc_raft_3",
                    question="State the Leader Completeness property.",
                    answer="If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.",
                    explanation="Guaranteed by candidate voting rule: voters deny votes to candidates with less up-to-date logs.",
                    difficulty="hard",
                    review_status="new",
                    topic_tag="Safety Proofs"
                )
            ],
            revision_sheet=ExamRevisionSheet(
                core_definitions=[
                    DefinitionItem(
                        term="Split Quorum",
                        definition="A failure state where no single candidate secures a strict majority ((N/2)+1), requiring a randomized timeout reset.",
                        context="Exam Tip: Remember that timeouts reset on every failed term."
                    ),
                    DefinitionItem(
                        term="NextIndex & MatchIndex",
                        definition="Leader state arrays tracking the next index to send to each peer, and the highest known replicated index.",
                        context="NextIndex is initialized to leader's last log index + 1."
                    )
                ],
                critical_formulas=[
                    EquationItem(
                        latex_or_text="F \\le \\lfloor (N-1)/2 \\rfloor",
                        explanation="Maximum number of node crashes tolerated by an N-node system.",
                        variables={"N": "Node count", "F": "Tolerable failures"}
                    )
                ],
                high_probability_questions=[
                    {
                        "question": "Explain step-by-step what happens when a partitioned leader with 2 of 5 nodes receives client requests.",
                        "answer": "The partitioned leader appends requests to its log but fails to reach 3 nodes. The requests remain uncommitted. When partition heals, the higher-term leader from the 3-node partition forces this old leader to revert to follower and truncate uncommitted entries."
                    }
                ],
                professor_tips=[
                    "Dr. Thorne always tests the boundary condition: what happens if election timeout equals heartbeat interval? Answer: Continuous spurious elections!",
                    "Always explicitly write out the quorum calculation step in midterms."
                ]
            )
        )
        self.save_study_kit(raft_study_kit)

        # Vault Note for Raft
        vault_raft = SectionVaultNote(
            id="vlt_raft_01",
            lecture_id=lec1_id,
            title="Raft Consensus Protocol & Distributed State Machine Replication",
            chapter="Chapter 4: Consensus in Fault-Tolerant Clusters",
            subject_id="subj_cs244",
            subject_name="Distributed Systems & Cloud Computing",
            subject_code="CS-244",
            professor="Dr. Aris Thorne",
            section=SectionId.A,
            source_sections=[SectionId.A, SectionId.C],
            lecture_date="2026-10-24",
            contributor_id="usr_lectra_default",
            contributor_name="Alex Rivera",
            contributor_avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            verification_status=VerificationStatus.SOURCE_VERIFIED,
            upvotes=42,
            reports_count=0,
            summary="Complete master notes combining Section A whiteboard derivations with Section C edge-case proofs, verified against the original Raft publication.",
            download_available=True,
            tags=["Distributed Systems", "Raft", "Consensus", "Exam High Yield"],
        )
        self.save_vault_note(vault_raft)

        # 5. Master Note 2: Multi-Head Attention in Section B
        lec2_id = "lec_attention_02"
        attn_note = MasterNoteContent(
            id="mnote_attn_02",
            lecture_id=lec2_id,
            title="Multi-Head Self-Attention & Scaled Dot-Product Mechanics",
            subject_id="subj_cs224n",
            subject_name="Deep Neural Architectures & Attention",
            subject_code="CS-224N",
            chapter="Chapter 3: The Transformer Architecture",
            professor="Prof. Elena Vance",
            section=SectionId.B,
            source_sections=[SectionId.B, SectionId.D],
            summary="Comprehensive synthesis of Prof. Vance's Section B vector geometry explanations, Section D computational complexity analysis, and Vaswani et al. official paper formulas.",
            learning_objectives=[
                "Formulate Scaled Dot-Product Attention mathematically and justify the 1/sqrt(d_k) factor.",
                "Derive the multi-head projection tensors: W_Q, W_K, W_V, W_O.",
                "Analyze time and memory complexity of self-attention (O(N^2 * D)) vs recurrent nets.",
                "Understand why multi-head attention allows attending to information at different representation subspaces."
            ],
            sections=[
                NoteSection(
                    heading="1. Scaled Dot-Product Attention Formulation",
                    content="Given input queries Q, keys K of dimension d_k, and values V of dimension d_v:\n\nAttention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V\n\nWhy scale by 1/sqrt(d_k)?\nFor large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients (vanishing gradients). Dividing by sqrt(d_k) counteracts this effect by preserving variance near 1.",
                    subsections=["Variance Preserving Proof", "Softmax Saturation Dynamics"],
                    professor_emphasis="Prof. Vance wrote in bold on Section B board: 'Assume q_i and k_i are independent random variables with mean 0 and variance 1. Then their dot product has mean 0 and variance d_k!'",
                    is_exam_critical=True
                ),
                NoteSection(
                    heading="2. Multi-Head Projection and Subspace Diversity",
                    content="Instead of performing a single attention function with d_model dimensional queries, keys, and values, Multi-Head Attention linearly projects the queries, keys, and values h times with different, learned linear projections to d_k, d_k, and d_v dimensions respectively.\n\nMultiHead(Q,K,V) = Concat(head_1, ..., head_h) W^O\nwhere head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V).",
                    subsections=["Tensor Shape Evolution: [B, S, D] -> [B, H, S, d_k]", "Linear Output Projection W_O"],
                    professor_emphasis="Section D lecture emphasized: 'Each head specializes. Head 1 might track syntactic subject-verb dependencies, while Head 5 tracks pronoun coreference.'",
                    is_exam_critical=True
                )
            ],
            key_definitions=[
                DefinitionItem(
                    term="Bilinear Semantic Alignment Matrix",
                    definition="The unnormalized logits matrix A = Q K^T representing pairwise affinities between all token positions.",
                    context="Prof. Vance's preferred terminology for attention score matrix.",
                    source_citation="Prof. Vance Lecture Slides, Slide 14"
                )
            ],
            important_formulas=[
                EquationItem(
                    latex_or_text="\\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V",
                    explanation="Canonical Scaled Dot-Product Attention mapping queries and key-value pairs to output.",
                    variables={"Q": "Queries [B, S, d_k]", "K": "Keys [B, S, d_k]", "V": "Values [B, S, d_v]", "d_k": "Key dimension"}
                ),
                EquationItem(
                    latex_or_text="\\text{Var}\\left(\\sum_{i=1}^{d_k} q_i k_i\\right) = d_k \\cdot \\text{Var}(q_i)\\text{Var}(k_i) = d_k",
                    explanation="Proves why the standard deviation of dot product scales with sqrt(d_k).",
                    variables={"d_k": "Dimension size", "Var": "Statistical Variance"}
                )
            ],
            important_examples=[
                ExampleItem(
                    title="Self-Attention Complexity Breakdown (Exam Classic)",
                    description="Compare compute complexity of Self-Attention Layer vs Recurrent Layer for sequence length n and feature dimension d.",
                    solution_steps=[
                        "Self-Attention layer computes Q K^T: O(n^2 * d) operations. Softmax: O(n^2). Product with V: O(n^2 * d). Total per layer: O(n^2 * d).",
                        "Recurrent layer (RNN) steps sequentially: n steps * O(d^2) = O(n * d^2).",
                        "Conclusion: When sequence length n < d (typical in short texts), Attention is cheaper and fully parallelizable (O(1) sequential operations vs O(n) for RNN)."
                    ],
                    section_source="Prof. Vance board proof, Section B"
                )
            ],
            key_takeaways=[
                "Scaling factor 1/sqrt(d_k) prevents softmax gradient vanishing at large dimensions.",
                "Multi-Head mechanism allows simultaneous attention to different representation subspaces.",
                "Self-Attention allows parallel token processing with constant sequential path length O(1)."
            ],
            exam_focused_concepts=[
                ExamConceptItem(
                    topic="Scaling Factor Derivation",
                    reason="Prof. Vance loves testing the variance derivation of q dot k on exams.",
                    frequency_or_weight="High Weight Proof",
                    section_emphasis="Section B blackboard emphasis"
                )
            ],
            needs_verification=[],
            citations=[
                SourceCitation(
                    source_name="Vance_Attention_Board_SectionB.jpg",
                    source_type="Whiteboard Image",
                    page_or_region="Center Board",
                    quote="Q K^T / sqrt(d_k) preserves unit variance!",
                    section_tag="Section B"
                )
            ],
            raw_board_transcription="Scaled Dot-Product: Attn(Q,K,V)=softmax(QK^T / sqrt(dk))V. Multi-head = Concat(heads) * W_O. Var(q*k) = dk so divide by sqrt(dk).",
            ai_synthesized_markdown="""# Multi-Head Attention Architecture
## CS-224N Master Notes

### Scaled Dot-Product Formula
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

### Subspace Projections
By projecting with $W_i^Q, W_i^K, W_i^V$, each attention head operates in a distinct semantic subspace.
""",
        )
        self.save_master_note(attn_note)

        # Diagram for Attention
        attn_diag = SmartDiagram(
            id="diag_attn_02",
            lecture_id=lec2_id,
            diagram_type="architecture",
            title="Multi-Head Attention Computation Flow",
            description="Complete tensor pipeline showing projections, scaled dot-product, concatenation, and linear output.",
            mermaid_code="""flowchart TD
    In[Input Embeddings X] --> WQ[Linear W_Q]
    In --> WK[Linear W_K]
    In --> WV[Linear W_V]
    WQ --> Q[Queries Q]
    WK --> K[Keys K]
    WV --> V[Values V]
    Q & K --> MatMul1[Matrix Multiplication QK^T]
    MatMul1 --> Scale[Scale by 1/sqrt(d_k)]
    Scale --> Softmax[Softmax Normalization]
    Softmax & V --> MatMul2[Matrix Multiplication A*V]
    MatMul2 --> Concat[Concat All Heads]
    Concat --> WO[Linear Output W_O]
    WO --> Out[Final Attention Output]""",
            svg_code=None,
            uncertain_elements=[],
            is_valid_syntax=True,
        )
        self.save_diagram(attn_diag)

        # Study Kit for Attention
        attn_study_kit = StudyKit(
            id="skit_attn_02",
            lecture_id=lec2_id,
            title="Transformer Attention Complete Study Kit",
            subject_name="Deep Neural Architectures & Attention",
            chapter="Chapter 3: The Transformer Architecture",
            key_takeaways=[
                "The scaling factor 1/sqrt(d_k) keeps the dot product variance equal to 1, preventing vanishing gradients in softmax.",
                "Multi-head attention projects representations into multiple subspaces, allowing simultaneous tracking of syntax, semantics, and context.",
                "Sequential operations are O(1) for self-attention vs O(n) for recurrent networks."
            ],
            mcqs=[
                MCQQuestion(
                    id="mcq_attn_1",
                    question="What happens to the softmax attention weights if the scaling factor 1/sqrt(d_k) is omitted for very large dimensions d_k?",
                    options=[
                        "Softmax produces near-uniform distributions with high entropy",
                        "The largest dot product dominates, pushing softmax into saturation with near-zero gradients",
                        "The values overflow into NaN immediately during matrix multiplication",
                        "The matrix rank collapses to 1"
                    ],
                    correct_option_index=1,
                    explanation="For large d_k, dot products grow substantially, driving softmax into regions with near-zero gradients where backpropagation fails.",
                    difficulty="medium",
                    topic_reference="Softmax Numerical Stability"
                ),
                MCQQuestion(
                    id="mcq_attn_2",
                    question="What is the time complexity of computing self-attention for a sequence length of n with embedding dimension d?",
                    options=["O(n * d)", "O(n^2 * d)", "O(n * d^2)", "O(n^3)"],
                    correct_option_index=1,
                    explanation="Multiplying Q (n x d) by K^T (d x n) costs O(n^2 * d), and multiplying the resulting (n x n) matrix by V (n x d) costs O(n^2 * d).",
                    difficulty="medium",
                    topic_reference="Computational Complexity"
                )
            ],
            flashcards=[
                FlashcardItem(
                    id="fc_attn_1",
                    question="Why does standard attention scale by 1/sqrt(d_k)?",
                    answer="To counteract the fact that the dot product of two d_k-dimensional vectors with unit variance has variance d_k, which would saturate the softmax function.",
                    explanation="Preserves variance at 1.",
                    difficulty="medium",
                    review_status="mastered",
                    topic_tag="Mathematics"
                ),
                FlashcardItem(
                    id="fc_attn_2",
                    question="What is the sequential operational path length between two distant tokens in a Self-Attention layer?",
                    answer="O(1)",
                    explanation="Every token attends directly to all other tokens in a single matrix operation, unlike RNNs which require O(n) sequential steps.",
                    difficulty="easy",
                    review_status="needs_review",
                    topic_tag="Architecture"
                )
            ],
            revision_sheet=ExamRevisionSheet(
                core_definitions=[
                    DefinitionItem(
                        term="Residual Connection",
                        definition="Adding the input of a sub-layer directly to its output: x + Sublayer(x).",
                        context="Allows gradients to bypass non-linearities directly."
                    )
                ],
                critical_formulas=[
                    EquationItem(
                        latex_or_text="\\text{Complexity} = \\mathcal{O}(n^2 d)",
                        explanation="Attention computational complexity per layer.",
                        variables={"n": "Tokens", "d": "Hidden dimension"}
                    )
                ],
                high_probability_questions=[],
                professor_tips=["Prof. Vance always asks students to draw the tensor shapes at every step from Input to W_O."]
            )
        )
        self.save_study_kit(attn_study_kit)

        # Vault note for Section B
        vault_attn = SectionVaultNote(
            id="vlt_attn_02",
            lecture_id=lec2_id,
            title="Multi-Head Self-Attention & Scaled Dot-Product Mechanics",
            chapter="Chapter 3: The Transformer Architecture",
            subject_id="subj_cs224n",
            subject_name="Deep Neural Architectures & Attention",
            subject_code="CS-224N",
            professor="Prof. Elena Vance",
            section=SectionId.B,
            source_sections=[SectionId.B, SectionId.D],
            lecture_date="2026-10-22",
            contributor_id="usr_lectra_default",
            contributor_name="Alex Rivera",
            contributor_avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            verification_status=VerificationStatus.COMMUNITY_REVIEWED,
            upvotes=38,
            reports_count=0,
            summary="Clean mathematical derivation of Self-Attention variance scaling, multi-head tensor shapes, and comparison with RNN sequential bottlenecks.",
            download_available=True,
            tags=["AI", "Transformers", "Self-Attention", "Section B"],
        )
        self.save_vault_note(vault_attn)

        # Seed more vault notes across Section C, D, E, F, G, H, I for rich 9-section coverage!
        other_vault_notes = [
            SectionVaultNote(
                id="vlt_sec_c_01",
                lecture_id="lec_synthetic_sec_c",
                title="Distributed Log Compaction & Snapshot Protocols",
                chapter="Chapter 4: Consensus in Fault-Tolerant Clusters",
                subject_id="subj_cs244",
                subject_name="Distributed Systems & Cloud Computing",
                subject_code="CS-244",
                professor="Dr. Aris Thorne",
                section=SectionId.C,
                source_sections=[SectionId.C],
                lecture_date="2026-10-25",
                contributor_id="usr_student_c",
                contributor_name="Chloe Bennett",
                contributor_avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
                verification_status=VerificationStatus.SOURCE_VERIFIED,
                upvotes=27,
                reports_count=0,
                summary="Section C specific notes on InstallSnapshot RPC, handling slow followers, and log truncation garbage collection.",
                download_available=True,
                tags=["Raft", "Snapshots", "Section C"],
            ),
            SectionVaultNote(
                id="vlt_sec_d_01",
                lecture_id="lec_synthetic_sec_d",
                title="Rotary Position Embeddings (RoPE) & Context Extension",
                chapter="Chapter 3: The Transformer Architecture",
                subject_id="subj_cs224n",
                subject_name="Deep Neural Architectures & Attention",
                subject_code="CS-224N",
                professor="Prof. Elena Vance",
                section=SectionId.D,
                source_sections=[SectionId.D],
                lecture_date="2026-10-23",
                contributor_id="usr_student_d",
                contributor_name="David Chen",
                contributor_avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                verification_status=VerificationStatus.COMMUNITY_REVIEWED,
                upvotes=31,
                reports_count=0,
                summary="Detailed derivation of complex number 2D rotations for encoding relative token positions across extended context windows.",
                download_available=True,
                tags=["RoPE", "Position Encodings", "Section D"],
            ),
            SectionVaultNote(
                id="vlt_sec_e_01",
                lecture_id="lec_synthetic_sec_e",
                title="Byzantine Fault Tolerance & PBFT Three-Phase Commit",
                chapter="Chapter 5: Malicious Nodes & BFT",
                subject_id="subj_cs244",
                subject_name="Distributed Systems & Cloud Computing",
                subject_code="CS-244",
                professor="Dr. Aris Thorne",
                section=SectionId.E,
                source_sections=[SectionId.E],
                lecture_date="2026-10-28",
                contributor_id="usr_student_e",
                contributor_name="Emily Zhao",
                contributor_avatar="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
                verification_status=VerificationStatus.UNVERIFIED,
                upvotes=15,
                reports_count=0,
                summary="Section E notes covering N >= 3F + 1 proof and pre-prepare, prepare, commit phases in Castro & Liskov PBFT.",
                download_available=True,
                tags=["BFT", "PBFT", "Security", "Section E"],
            ),
            SectionVaultNote(
                id="vlt_sec_f_01",
                lecture_id="lec_synthetic_sec_f",
                title="FlashAttention IO-Aware Memory Optimization",
                chapter="Chapter 3: The Transformer Architecture",
                subject_id="subj_cs224n",
                subject_name="Deep Neural Architectures & Attention",
                subject_code="CS-224N",
                professor="Prof. Elena Vance",
                section=SectionId.F,
                source_sections=[SectionId.F],
                lecture_date="2026-10-26",
                contributor_id="usr_student_f",
                contributor_name="Felix Morgan",
                contributor_avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
                verification_status=VerificationStatus.SOURCE_VERIFIED,
                upvotes=49,
                reports_count=0,
                summary="Section F chalkboard notes detailing SRAM vs HBM memory tiling and online softmax rescaling for sub-quadratic I/O.",
                download_available=True,
                tags=["FlashAttention", "Hardware Acceleration", "Section F"],
            ),
            SectionVaultNote(
                id="vlt_sec_g_01",
                lecture_id="lec_synthetic_sec_g",
                title="Mixture of Experts (MoE) & Router Routing Invariants",
                chapter="Chapter 4: Scaled Parameter Architectures",
                subject_id="subj_cs224n",
                subject_name="Deep Neural Architectures & Attention",
                subject_code="CS-224N",
                professor="Prof. Elena Vance",
                section=SectionId.G,
                source_sections=[SectionId.G],
                lecture_date="2026-10-29",
                contributor_id="usr_student_g",
                contributor_name="Grace Hopper",
                contributor_avatar="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
                verification_status=VerificationStatus.COMMUNITY_REVIEWED,
                upvotes=22,
                reports_count=0,
                summary="Section G notes on Top-K gating networks, load balancing auxiliary loss terms, and expert capacity limits.",
                download_available=True,
                tags=["MoE", "Sparse Architectures", "Section G"],
            ),
            SectionVaultNote(
                id="vlt_sec_h_01",
                lecture_id="lec_synthetic_sec_h",
                title="Amortized Analysis of Splay Trees & Potential Functions",
                chapter="Chapter 6: Self-Adjusting Data Structures",
                subject_id="subj_cs161",
                subject_name="Advanced Algorithms & Optimization",
                subject_code="CS-161",
                professor="Dr. Marcus Brody",
                section=SectionId.H,
                source_sections=[SectionId.H],
                lecture_date="2026-10-27",
                contributor_id="usr_student_h",
                contributor_name="Henry Wallace",
                contributor_avatar="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
                verification_status=VerificationStatus.SOURCE_VERIFIED,
                upvotes=34,
                reports_count=0,
                summary="Section H blackboard derivations of Tarjan's log-rank potential function for zig-zig and zig-zag splay operations.",
                download_available=True,
                tags=["Algorithms", "Splay Trees", "Amortized Analysis", "Section H"],
            ),
            SectionVaultNote(
                id="vlt_sec_i_01",
                lecture_id="lec_synthetic_sec_i",
                title="Max-Flow Min-Cut & Dinic's Blocking Flow Algorithm",
                chapter="Chapter 8: Network Flow & Reductions",
                subject_id="subj_cs161",
                subject_name="Advanced Algorithms & Optimization",
                subject_code="CS-161",
                professor="Dr. Marcus Brody",
                section=SectionId.I,
                source_sections=[SectionId.I],
                lecture_date="2026-10-30",
                contributor_id="usr_student_i",
                contributor_name="Isabella Rossi",
                contributor_avatar="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
                verification_status=VerificationStatus.COMMUNITY_REVIEWED,
                upvotes=29,
                reports_count=0,
                summary="Section I notes on Level Graphs, augmenting paths, and Dinic's O(V^2 E) run-time bound with unit network specializations.",
                download_available=True,
                tags=["Network Flow", "Dinic Algorithm", "Section I"],
            ),
        ]
        for vn in other_vault_notes:
            self.save_vault_note(vn)

        # 6. Community Reviews
        reviews = [
            CommunityReview(
                id="rev_1",
                vault_note_id="vlt_raft_01",
                user_id="usr_student_c",
                user_name="Chloe Bennett",
                user_section=SectionId.C,
                rating=5,
                comment="The comparison between Section A's quorum proof and Section C's partition diagram cleared up my confusion on the Figure 8 commit condition. Extremely accurate!",
            ),
            CommunityReview(
                id="rev_2",
                vault_note_id="vlt_raft_01",
                user_id="usr_student_b",
                user_name="David Chen",
                user_section=SectionId.B,
                rating=5,
                comment="Source citations to the original Ongaro paper are spot on. Used this to review for the midterm quiz.",
            ),
            CommunityReview(
                id="rev_3",
                vault_note_id="vlt_sec_e_01",
                user_id="usr_student_a",
                user_name="Alex Rivera",
                user_section=SectionId.A,
                rating=4,
                comment="Great notes, but double check the equation on slide 3: PBFT view changes require 2F+1 view change messages, not F+1.",
                is_inaccuracy_report=False,
            ),
        ]
        for r in reviews:
            self.save_review(r)

        # 7. Notifications
        notifications = [
            NotificationItem(
                id="notif_1",
                user_id="usr_lectra_default",
                title="Section C Master Notes Shared",
                message="Chloe Bennett published verified notes for CS-244 Chapter 4 in Section Vault.",
                type="vault",
                link="/vault?section=C",
                read=False,
            ),
            NotificationItem(
                id="notif_2",
                user_id="usr_lectra_default",
                title="New Study Kit Available",
                message="Your Raft Protocol Study Kit generated 3 MCQs and 3 Flashcards.",
                type="study_kit",
                link="/study-kits",
                read=False,
            ),
            NotificationItem(
                id="notif_3",
                user_id="usr_lectra_default",
                title="Community Upvote",
                message="Your Section A Raft Master Notes received 12 new upvotes from Section C & E students.",
                type="review",
                link="/community",
                read=True,
            ),
        ]
        for n in notifications:
            self.save_notification(n)

    def _seed_phase2_tables(self) -> None:
        """Populate Phase 2 tables (universities, courses, chapters, profiles, workspaces, uploaded_sources, flashcards, quiz_questions) and upgrade legacy default password hash."""
        import time

        cursor = self._conn.cursor()

        # Ensure default user has a valid PBKDF2 password hash
        cursor.execute("SELECT password_hash FROM lectra_users WHERE id = 'usr_lectra_default'")
        row = cursor.fetchone()
        if row and not str(row["password_hash"]).startswith("pbkdf2_sha256$"):
            valid_hash = hash_password("LectraPass2026!")
            self._conn.execute(
                "UPDATE lectra_users SET password_hash = ?, university_id = 'univ_stanford', course_id = 'crs_cs_bs', subject_id = 'subj_cs244', subject = 'Distributed Systems & Cloud Computing', semester = 'Fall 2026', email_verified = 1, onboarding_completed = 1 WHERE id = 'usr_lectra_default'",
                (valid_hash,),
            )
            self._conn.commit()

        # 1. Universities
        cursor.execute("SELECT COUNT(*) FROM universities")
        if cursor.fetchone()[0] == 0:
            universities = [
                UniversityModel(id="univ_stanford", name="Stanford University", domain="stanford.edu", location="Stanford, CA"),
                UniversityModel(id="univ_mit", name="Massachusetts Institute of Technology", domain="mit.edu", location="Cambridge, MA"),
                UniversityModel(id="univ_berkeley", name="UC Berkeley", domain="berkeley.edu", location="Berkeley, CA"),
                UniversityModel(id="univ_cmu", name="Carnegie Mellon University", domain="cmu.edu", location="Pittsburgh, PA"),
            ]
            for u in universities:
                self.save_university(u)

        # 2. Courses
        cursor.execute("SELECT COUNT(*) FROM courses")
        if cursor.fetchone()[0] == 0:
            courses = [
                CourseModel(id="crs_cs_bs", university_id="univ_stanford", course_name="B.S. Computer Science & AI", course_code="CS-BS", department="Computer Science & Engineering"),
                CourseModel(id="crs_cs_ms", university_id="univ_stanford", course_name="M.S. Computer Science (Systems & ML)", course_code="CS-MS", department="Computer Science & Engineering"),
                CourseModel(id="crs_ee_bs", university_id="univ_stanford", course_name="B.S. Electrical & Computer Engineering", course_code="EE-BS", department="Electrical Engineering"),
                CourseModel(id="crs_mit_eecs", university_id="univ_mit", course_name="B.S. Computer Science & Engineering (Course 6-3)", course_code="6-3", department="EECS"),
                CourseModel(id="crs_ucb_eecs", university_id="univ_berkeley", course_name="B.S. Electrical Engineering & Computer Sciences", course_code="EECS", department="EECS"),
            ]
            for c in courses:
                self.save_course(c)

        # 3. Chapters
        cursor.execute("SELECT COUNT(*) FROM chapters")
        if cursor.fetchone()[0] == 0:
            chapters = [
                ChapterModel(id="chap_cs244_1", subject_id="subj_cs244", chapter_name="Chapter 1: Distributed Clocks & Lamport Timestamps", chapter_number=1),
                ChapterModel(id="chap_cs244_4", subject_id="subj_cs244", chapter_name="Chapter 4: Consensus in Fault-Tolerant Clusters", chapter_number=4),
                ChapterModel(id="chap_cs244_6", subject_id="subj_cs244", chapter_name="Chapter 6: Spanner & Globally Distributed Transactions", chapter_number=6),
                ChapterModel(id="chap_cs224n_1", subject_id="subj_cs224n", chapter_name="Chapter 1: Word Vectors & Distributed Representations", chapter_number=1),
                ChapterModel(id="chap_cs224n_3", subject_id="subj_cs224n", chapter_name="Chapter 3: The Transformer Architecture", chapter_number=3),
                ChapterModel(id="chap_cs161_5", subject_id="subj_cs161", chapter_name="Chapter 5: Dynamic Programming & Amortized Analysis", chapter_number=5),
            ]
            for ch in chapters:
                self.save_chapter(ch)

        # 4. Sync Profiles from lectra_users
        cursor.execute("SELECT COUNT(*) FROM profiles")
        if cursor.fetchone()[0] == 0:
            default_u = self.get_user_by_id("usr_lectra_default")
            if default_u:
                self.save_user(default_u)

        # 5. Sync Professors & Subjects into Phase 2 tables
        cursor.execute("SELECT COUNT(*) FROM professors")
        if cursor.fetchone()[0] == 0:
            for p in self.list_professors():
                self.save_professor(p)

        cursor.execute("SELECT COUNT(*) FROM subjects")
        if cursor.fetchone()[0] == 0:
            for s in self.list_subjects():
                self.save_subject(s)

        # 6. Sync Workspaces (including lecture-linked workspaces)
        cursor.execute("SELECT COUNT(*) FROM workspaces")
        if cursor.fetchone()[0] == 0:
            for ws in self.list_workspaces():
                self.save_workspace(ws)
            lecture_workspaces = [
                WorkspaceModel(
                    id="lec_raft_consensus_01",
                    user_id="usr_lectra_default",
                    subject_id="subj_cs244",
                    chapter_id="chap_cs244_4",
                    professor_id="prof_thorne",
                    section=SectionId.A,
                    lecture_date="2026-10-24",
                    title="Raft Consensus Protocol & Distributed State Machine Replication",
                    name="Raft Consensus Protocol & Distributed State Machine Replication",
                    status=WorkspaceStatus.COMPLETED,
                    visibility=VisibilityType.SECTION,
                    university="Stanford University",
                    department="Computer Science & Engineering",
                    semester="Fall 2026",
                    owner_id="usr_lectra_default",
                    description="Multi-section Raft consensus workspace combining Section A & C board captures.",
                ),
                WorkspaceModel(
                    id="lec_attention_02",
                    user_id="usr_lectra_default",
                    subject_id="subj_cs224n",
                    chapter_id="chap_cs224n_3",
                    professor_id="prof_vance",
                    section=SectionId.B,
                    lecture_date="2026-10-25",
                    title="Multi-Head Self-Attention & Scaled Dot-Product Mechanics",
                    name="Multi-Head Self-Attention & Scaled Dot-Product Mechanics",
                    status=WorkspaceStatus.COMPLETED,
                    visibility=VisibilityType.SECTION,
                    university="Stanford University",
                    department="Computer Science & Engineering",
                    semester="Fall 2026",
                    owner_id="usr_lectra_default",
                    description="Transformer self-attention derivations across Sections B and D.",
                ),
                WorkspaceModel(
                    id="lec_dp_algo_03",
                    user_id="usr_lectra_default",
                    subject_id="subj_cs161",
                    chapter_id="chap_cs161_5",
                    professor_id="prof_brody",
                    section=SectionId.H,
                    lecture_date="2026-10-26",
                    title="Dynamic Programming State Space Compression & Treewidth",
                    name="Dynamic Programming State Space Compression & Treewidth",
                    status=WorkspaceStatus.COMPLETED,
                    visibility=VisibilityType.SECTION,
                    university="Stanford University",
                    department="Computer Science & Engineering",
                    semester="Fall 2026",
                    owner_id="usr_lectra_default",
                    description="Section H & I dynamic programming recurrence and memoization lattice.",
                ),
            ]
            for lws in lecture_workspaces:
                self.save_workspace(lws)

        # 7. Sync Master Notes, Study Kits, Flashcards, Quiz Questions, and Community Contributions
        cursor.execute("SELECT COUNT(*) FROM master_notes")
        if cursor.fetchone()[0] == 0:
            for note in self.list_master_notes():
                # Set initial seed notes as shared so Section Vault notes match
                note.visibility = VisibilityType.SECTION
                self.save_master_note(note)

        cursor.execute("SELECT COUNT(*) FROM study_kits")
        if cursor.fetchone()[0] == 0:
            for skit in self.list_study_kits():
                self.save_study_kit(skit)

        cursor.execute("SELECT COUNT(*) FROM community_contributions")
        if cursor.fetchone()[0] == 0:
            for vn in self.list_vault_notes():
                self.save_vault_note(vn)

        # 8. Seed initial Uploaded Sources if empty so Upload History has real DB records
        cursor.execute("SELECT COUNT(*) FROM uploaded_sources")
        if cursor.fetchone()[0] == 0:
            seed_sources = [
                UploadedSourceItem(
                    id="src_raft_board_a",
                    workspace_id="lec_raft_consensus_01",
                    lecture_id="lec_raft_consensus_01",
                    user_id="usr_lectra_default",
                    file_name="Board_Whiteboard_SectionA_Oct24.jpg",
                    original_filename="Board_Whiteboard_SectionA_Oct24.jpg",
                    file_type="image/jpeg",
                    mime_type="image/jpeg",
                    storage_path="usr_lectra_default/lec_raft_consensus_01/Board_Whiteboard_SectionA_Oct24.jpg",
                    file_path="usr_lectra_default/lec_raft_consensus_01/Board_Whiteboard_SectionA_Oct24.jpg",
                    bucket_id=StorageBucketType.PRIVATE_UPLOADS,
                    source_type=SourceMaterialType.WHITEBOARD,
                    file_size_bytes=482150,
                    page_number=1,
                    ocr_confidence=0.96,
                    extracted_text_snippet="Strict Quorum = floor(N/2) + 1. Election timeout randomized 150-300ms.",
                    visibility=VisibilityType.SECTION,
                ),
                UploadedSourceItem(
                    id="src_raft_paper_pdf",
                    workspace_id="lec_raft_consensus_01",
                    lecture_id="lec_raft_consensus_01",
                    user_id="usr_lectra_default",
                    file_name="Ongaro_Raft_Paper_Official.pdf",
                    original_filename="Ongaro_Raft_Paper_Official.pdf",
                    file_type="application/pdf",
                    mime_type="application/pdf",
                    storage_path="usr_lectra_default/lec_raft_consensus_01/Ongaro_Raft_Paper_Official.pdf",
                    file_path="usr_lectra_default/lec_raft_consensus_01/Ongaro_Raft_Paper_Official.pdf",
                    bucket_id=StorageBucketType.SHARED_MATERIALS,
                    source_type=SourceMaterialType.REFERENCE_PDF,
                    file_size_bytes=1248900,
                    page_number=6,
                    ocr_confidence=0.99,
                    extracted_text_snippet="Section 5.3 Log Replication & Figure 8 commitment safety rules.",
                    visibility=VisibilityType.PUBLIC,
                ),
                UploadedSourceItem(
                    id="src_attn_board_b",
                    workspace_id="lec_attention_02",
                    lecture_id="lec_attention_02",
                    user_id="usr_lectra_default",
                    file_name="Vance_Transformer_Blackboard_SecB.png",
                    original_filename="Vance_Transformer_Blackboard_SecB.png",
                    file_type="image/png",
                    mime_type="image/png",
                    storage_path="usr_lectra_default/lec_attention_02/Vance_Transformer_Blackboard_SecB.png",
                    file_path="usr_lectra_default/lec_attention_02/Vance_Transformer_Blackboard_SecB.png",
                    bucket_id=StorageBucketType.PRIVATE_UPLOADS,
                    source_type=SourceMaterialType.BLACKBOARD,
                    file_size_bytes=619400,
                    page_number=1,
                    ocr_confidence=0.95,
                    extracted_text_snippet="Attention(Q,K,V) = softmax(QK^T / sqrt(d_k))V; Var(q dot k) = d_k.",
                    visibility=VisibilityType.SECTION,
                ),
            ]
            for src in seed_sources:
                self.save_uploaded_source(src)

    # --- Academic Catalog operations (Universities, Courses, Chapters) ---
    def save_university(self, univ: UniversityModel) -> UniversityModel:
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO universities (id, name, domain, location, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (univ.id, univ.name, univ.domain, univ.location, univ.created_at),
            )
        return univ

    def list_universities(self) -> List[UniversityModel]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM universities ORDER BY name ASC")
        return [
            UniversityModel(
                id=r["id"],
                name=r["name"],
                domain=r["domain"],
                location=r["location"],
                created_at=r["created_at"],
            )
            for r in cursor.fetchall()
        ]

    def save_course(self, crs: CourseModel) -> CourseModel:
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO courses (id, university_id, course_name, course_code, department, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (crs.id, crs.university_id, crs.course_name, crs.course_code, crs.department, crs.created_at),
            )
        return crs

    def list_courses(self, university_id: Optional[str] = None) -> List[CourseModel]:
        cursor = self._conn.cursor()
        if university_id:
            cursor.execute("SELECT * FROM courses WHERE university_id = ? ORDER BY course_name ASC", (university_id,))
        else:
            cursor.execute("SELECT * FROM courses ORDER BY course_name ASC")
        return [
            CourseModel(
                id=r["id"],
                university_id=r["university_id"],
                course_name=r["course_name"],
                course_code=r["course_code"],
                department=r["department"],
                created_at=r["created_at"],
            )
            for r in cursor.fetchall()
        ]

    def save_chapter(self, chap: ChapterModel) -> ChapterModel:
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO chapters (id, subject_id, chapter_name, chapter_number, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (chap.id, chap.subject_id, chap.chapter_name, chap.chapter_number, chap.created_at),
            )
        return chap

    def list_chapters(self, subject_id: Optional[str] = None) -> List[ChapterModel]:
        cursor = self._conn.cursor()
        if subject_id:
            cursor.execute("SELECT * FROM chapters WHERE subject_id = ? ORDER BY chapter_number ASC", (subject_id,))
        else:
            cursor.execute("SELECT * FROM chapters ORDER BY subject_id ASC, chapter_number ASC")
        return [
            ChapterModel(
                id=r["id"],
                subject_id=r["subject_id"],
                chapter_name=r["chapter_name"],
                chapter_number=r["chapter_number"],
                created_at=r["created_at"],
            )
            for r in cursor.fetchall()
        ]

    # --- User, Auth Sessions & Token operations ---
    def _row_to_user(self, row: sqlite3.Row) -> UserProfile:
        keys = set(row.keys())
        return UserProfile(
            id=row["id"],
            email=row["email"],
            password_hash=row["password_hash"] if "password_hash" in keys and row["password_hash"] else "",
            full_name=row["full_name"],
            university_id=row["university_id"] if "university_id" in keys else None,
            university=row["university"] if "university" in keys and row["university"] else "Stanford University",
            course_id=row["course_id"] if "course_id" in keys else None,
            course=row["course"] if "course" in keys and row["course"] else "B.S. Computer Science & AI",
            subject_id=row["subject_id"] if "subject_id" in keys else None,
            subject=row["subject"] if "subject" in keys else None,
            semester=row["semester"] if "semester" in keys and row["semester"] else "Fall 2026",
            section=SectionId(row["section"]) if row["section"] in [s.value for s in SectionId] else SectionId.A,
            role=row["role"] if "role" in keys and row["role"] else "student",
            avatar_url=row["avatar_url"] if "avatar_url" in keys else None,
            bio=row["bio"] if "bio" in keys else None,
            email_verified=bool(row["email_verified"]) if "email_verified" in keys and row["email_verified"] is not None else True,
            onboarding_completed=bool(row["onboarding_completed"]) if "onboarding_completed" in keys and row["onboarding_completed"] is not None else True,
            created_at=row["created_at"],
        )

    def save_user(self, user: UserProfile) -> UserProfile:
        sec_val = user.section.value if hasattr(user.section, "value") else str(user.section)
        now = utc_now()
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_users 
                (id, email, password_hash, full_name, university_id, university, course_id, course,
                 subject_id, subject, semester, section, role, avatar_url, bio,
                 email_verified, onboarding_completed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user.id,
                    user.email.lower().strip(),
                    user.password_hash,
                    user.full_name,
                    user.university_id,
                    user.university,
                    user.course_id,
                    user.course,
                    user.subject_id,
                    user.subject,
                    user.semester,
                    sec_val,
                    user.role,
                    user.avatar_url,
                    user.bio,
                    1 if user.email_verified else 0,
                    1 if user.onboarding_completed else 0,
                    user.created_at,
                ),
            )
            self._conn.execute(
                """
                INSERT OR REPLACE INTO profiles
                (id, email, full_name, university_id, university, course_id, course,
                 subject_id, subject, semester, section, role, avatar_url, bio,
                 email_verified, onboarding_completed, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user.id,
                    user.email.lower().strip(),
                    user.full_name,
                    user.university_id,
                    user.university,
                    user.course_id,
                    user.course,
                    user.subject_id,
                    user.subject,
                    user.semester,
                    sec_val,
                    user.role,
                    user.avatar_url,
                    user.bio,
                    1 if user.email_verified else 0,
                    1 if user.onboarding_completed else 0,
                    user.created_at,
                    now,
                ),
            )
        return user

    def get_user_by_email(self, email: str) -> Optional[UserProfile]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
        row = cursor.fetchone()
        if not row:
            return None
        return self._row_to_user(row)

    def get_user_by_id(self, user_id: str) -> Optional[UserProfile]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return self._row_to_user(row)

    def create_session(self, user_id: str, access_token: str, refresh_token: str, expires_at: int) -> str:
        session_id = f"sess_{uuid4().hex[:12]}"
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO auth_sessions (id, user_id, access_token, refresh_token, expires_at, revoked, created_at)
                VALUES (?, ?, ?, ?, ?, 0, ?)
                """,
                (session_id, user_id, access_token, refresh_token, expires_at, utc_now()),
            )
        return session_id

    def get_active_session(self, token: str) -> Optional[Dict[str, Any]]:
        import time

        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT * FROM auth_sessions WHERE (access_token = ? OR refresh_token = ?) AND revoked = 0",
            (token, token),
        )
        row = cursor.fetchone()
        if not row:
            return None
        if int(row["expires_at"]) < int(time.time()):
            return None
        return dict(row)

    def revoke_session(self, token: str) -> bool:
        with self._conn:
            cur = self._conn.execute(
                "UPDATE auth_sessions SET revoked = 1 WHERE access_token = ? OR refresh_token = ?",
                (token, token),
            )
        return cur.rowcount > 0

    def revoke_all_user_sessions(self, user_id: str) -> int:
        with self._conn:
            cur = self._conn.execute("UPDATE auth_sessions SET revoked = 1 WHERE user_id = ?", (user_id,))
        return cur.rowcount

    def create_email_verification_token(self, user_id: str, email: str, ttl_seconds: int = 86400) -> str:
        import time

        token = f"verify_{uuid4().hex}"
        expires_at = int(time.time()) + ttl_seconds
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO email_verification_tokens (token, user_id, email, expires_at, used, created_at)
                VALUES (?, ?, ?, ?, 0, ?)
                """,
                (token, user_id, email.lower().strip(), expires_at, utc_now()),
            )
        return token

    def verify_email_token(self, token: str) -> Optional[UserProfile]:
        import time

        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT * FROM email_verification_tokens WHERE token = ? AND used = 0",
            (token,),
        )
        row = cursor.fetchone()
        if not row or int(row["expires_at"]) < int(time.time()):
            return None
        user = self.get_user_by_id(row["user_id"])
        if not user:
            return None
        user.email_verified = True
        self.save_user(user)
        with self._conn:
            self._conn.execute("UPDATE email_verification_tokens SET used = 1 WHERE token = ?", (token,))
        return user

    def create_password_reset_token(self, user_id: str, email: str, ttl_seconds: int = 3600) -> str:
        import time

        token = f"rst_{uuid4().hex}"
        expires_at = int(time.time()) + ttl_seconds
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO password_reset_tokens (token, user_id, email, expires_at, used, created_at)
                VALUES (?, ?, ?, ?, 0, ?)
                """,
                (token, user_id, email.lower().strip(), expires_at, utc_now()),
            )
        return token

    def consume_password_reset_token(self, token: str, new_password_hash: str) -> Optional[UserProfile]:
        import time

        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0",
            (token,),
        )
        row = cursor.fetchone()
        if not row or int(row["expires_at"]) < int(time.time()):
            return None
        user = self.get_user_by_id(row["user_id"])
        if not user:
            return None
        user.password_hash = new_password_hash
        self.save_user(user)
        with self._conn:
            self._conn.execute("UPDATE password_reset_tokens SET used = 1 WHERE token = ?", (token,))
            # Revoke older sessions on password reset for security
            self._conn.execute("UPDATE auth_sessions SET revoked = 1 WHERE user_id = ?", (user.id,))
        return user

    # --- Professor Library operations ---
    def save_professor(self, prof: ProfessorProfile) -> ProfessorProfile:
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_professors
                (id, name, title, department, email, avatar_url, subjects_taught_json, sections_taught_json,
                 teaching_style, exam_focus_topics_json, preferred_terminology_json, formatting_preferences,
                 reference_materials_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    prof.id,
                    prof.full_name or prof.name,
                    prof.title,
                    prof.department,
                    prof.email,
                    prof.avatar_url,
                    json.dumps(prof.subjects_taught),
                    json.dumps([s.value if hasattr(s, "value") else str(s) for s in prof.sections_taught]),
                    prof.teaching_style,
                    json.dumps(prof.exam_focus_topics),
                    json.dumps(prof.preferred_terminology),
                    prof.formatting_preferences,
                    prof.reference_materials_count,
                    prof.created_at,
                ),
            )
            self._conn.execute(
                """
                INSERT OR REPLACE INTO professors
                (id, university_id, full_name, subjects, title, department, email, avatar_url,
                 sections_taught_json, teaching_style, exam_focus_topics_json, preferred_terminology_json,
                 formatting_preferences, reference_materials_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    prof.id,
                    prof.university_id or "univ_stanford",
                    prof.full_name or prof.name,
                    json.dumps(prof.subjects or prof.subjects_taught),
                    prof.title,
                    prof.department,
                    prof.email,
                    prof.avatar_url,
                    json.dumps([s.value if hasattr(s, "value") else str(s) for s in prof.sections_taught]),
                    prof.teaching_style,
                    json.dumps(prof.exam_focus_topics),
                    json.dumps(prof.preferred_terminology),
                    prof.formatting_preferences,
                    prof.reference_materials_count,
                    prof.created_at,
                ),
            )
        return prof

    def list_professors(self) -> List[ProfessorProfile]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_professors ORDER BY name ASC")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            subjects_list = json.loads(r["subjects_taught_json"])
            result.append(
                ProfessorProfile(
                    id=r["id"],
                    university_id="univ_stanford",
                    name=r["name"],
                    full_name=r["name"],
                    title=r["title"],
                    department=r["department"],
                    email=r["email"],
                    avatar_url=r["avatar_url"],
                    subjects=subjects_list,
                    subjects_taught=subjects_list,
                    sections_taught=[SectionId(s) for s in json.loads(r["sections_taught_json"])],
                    teaching_style=r["teaching_style"],
                    exam_focus_topics=json.loads(r["exam_focus_topics_json"]),
                    preferred_terminology=json.loads(r["preferred_terminology_json"]),
                    formatting_preferences=r["formatting_preferences"],
                    reference_materials_count=r["reference_materials_count"],
                    created_at=r["created_at"],
                )
            )
        return result

    def get_professor(self, prof_id: str) -> Optional[ProfessorProfile]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_professors WHERE id = ?", (prof_id,))
        r = cursor.fetchone()
        if not r:
            return None
        subjects_list = json.loads(r["subjects_taught_json"])
        return ProfessorProfile(
            id=r["id"],
            university_id="univ_stanford",
            name=r["name"],
            full_name=r["name"],
            title=r["title"],
            department=r["department"],
            email=r["email"],
            avatar_url=r["avatar_url"],
            subjects=subjects_list,
            subjects_taught=subjects_list,
            sections_taught=[SectionId(s) for s in json.loads(r["sections_taught_json"])],
            teaching_style=r["teaching_style"],
            exam_focus_topics=json.loads(r["exam_focus_topics_json"]),
            preferred_terminology=json.loads(r["preferred_terminology_json"]),
            formatting_preferences=r["formatting_preferences"],
            reference_materials_count=r["reference_materials_count"],
            created_at=r["created_at"],
        )

    # --- Workspace & Subject operations (with RLS enforcement) ---
    def _row_to_workspace(self, r: sqlite3.Row) -> WorkspaceModel:
        keys = set(r.keys())
        uid = r["user_id"] if "user_id" in keys and r["user_id"] else (r["owner_id"] if "owner_id" in keys else "usr_lectra_default")
        title_val = r["title"] if "title" in keys and r["title"] else (r["name"] if "name" in keys else "Untitled Workspace")
        sec_str = r["section"] if "section" in keys and r["section"] else "A"
        status_str = r["status"] if "status" in keys and r["status"] else "active"
        vis_str = r["visibility"] if "visibility" in keys and r["visibility"] else "private"
        return WorkspaceModel(
            id=r["id"],
            user_id=uid,
            owner_id=uid,
            subject_id=r["subject_id"] if "subject_id" in keys else None,
            chapter_id=r["chapter_id"] if "chapter_id" in keys else None,
            professor_id=r["professor_id"] if "professor_id" in keys else None,
            section=SectionId(sec_str) if sec_str in [s.value for s in SectionId] else SectionId.A,
            lecture_date=r["lecture_date"] if "lecture_date" in keys and r["lecture_date"] else utc_now()[:10],
            title=title_val,
            name=title_val,
            status=WorkspaceStatus(status_str) if status_str in [s.value for s in WorkspaceStatus] else WorkspaceStatus.ACTIVE,
            visibility=VisibilityType(vis_str) if vis_str in [v.value for v in VisibilityType] else VisibilityType.PRIVATE,
            university=r["university"] if "university" in keys and r["university"] else "Stanford University",
            department=r["department"] if "department" in keys and r["department"] else "Computer Science & Engineering",
            semester=r["semester"] if "semester" in keys and r["semester"] else "Fall 2026",
            description=r["description"] if "description" in keys else None,
            created_at=r["created_at"],
            updated_at=r["updated_at"] if "updated_at" in keys and r["updated_at"] else r["created_at"],
        )

    def save_workspace(self, ws: WorkspaceModel, requesting_user_id: Optional[str] = None) -> WorkspaceModel:
        cursor = self._conn.cursor()
        cursor.execute("SELECT user_id FROM workspaces WHERE id = ?", (ws.id,))
        existing = cursor.fetchone()
        if existing and requesting_user_id and existing["user_id"] != requesting_user_id:
            raise PermissionError("RLS Policy Violation: Users cannot modify another user's workspace.")

        sec_val = ws.section.value if hasattr(ws.section, "value") else str(ws.section)
        status_val = ws.status.value if hasattr(ws.status, "value") else str(ws.status)
        vis_val = ws.visibility.value if hasattr(ws.visibility, "value") else str(ws.visibility)
        uid = ws.user_id or ws.owner_id or "usr_lectra_default"
        title_val = ws.title or ws.name or "Academic Lecture Workspace"
        now = utc_now()

        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_workspaces
                (id, name, title, user_id, owner_id, subject_id, chapter_id, professor_id,
                 section, lecture_date, status, visibility, university, department, semester, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ws.id,
                    title_val,
                    title_val,
                    uid,
                    uid,
                    ws.subject_id,
                    ws.chapter_id,
                    ws.professor_id,
                    sec_val,
                    ws.lecture_date,
                    status_val,
                    vis_val,
                    ws.university,
                    ws.department,
                    ws.semester,
                    ws.description,
                    ws.created_at,
                ),
            )
            self._conn.execute(
                """
                INSERT OR REPLACE INTO workspaces
                (id, user_id, subject_id, chapter_id, professor_id, section, lecture_date,
                 title, status, visibility, university, department, semester, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ws.id,
                    uid,
                    ws.subject_id,
                    ws.chapter_id,
                    ws.professor_id,
                    sec_val,
                    ws.lecture_date,
                    title_val,
                    status_val,
                    vis_val,
                    ws.university,
                    ws.department,
                    ws.semester,
                    ws.description,
                    ws.created_at,
                    now,
                ),
            )
        realtime_broker.publish("workspaces", "UPSERT", {"id": ws.id, "title": title_val}, user_id=uid)
        return ws

    def list_workspaces(
        self,
        requesting_user_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        section: Optional[str] = None,
        status_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        include_shared: bool = False,
    ) -> List[WorkspaceModel]:
        cursor = self._conn.cursor()
        query = "SELECT * FROM workspaces WHERE 1=1"
        params: List[Any] = []

        if requesting_user_id:
            if include_shared:
                query += " AND (user_id = ? OR visibility IN ('section', 'public'))"
                params.append(requesting_user_id)
            else:
                query += " AND user_id = ?"
                params.append(requesting_user_id)

        if subject_id:
            query += " AND subject_id = ?"
            params.append(subject_id)
        if section and section.upper() in [s.value for s in SectionId]:
            query += " AND section = ?"
            params.append(section.upper())
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)
        if search_query:
            query += " AND (title LIKE ? OR description LIKE ?)"
            params.extend([f"%{search_query}%", f"%{search_query}%"])

        query += " ORDER BY created_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [self._row_to_workspace(r) for r in rows]

    def get_workspace(self, ws_id: str, requesting_user_id: Optional[str] = None) -> Optional[WorkspaceModel]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM workspaces WHERE id = ?", (ws_id,))
        r = cursor.fetchone()
        if not r:
            cursor.execute("SELECT * FROM lectra_workspaces WHERE id = ?", (ws_id,))
            r = cursor.fetchone()
            if not r:
                return None
        ws = self._row_to_workspace(r)
        if (
            requesting_user_id
            and ws.user_id != requesting_user_id
            and ws.visibility == VisibilityType.PRIVATE
        ):
            raise PermissionError("RLS Policy Violation: Cannot access another user's private workspace.")
        return ws

    def delete_workspace(self, ws_id: str, requesting_user_id: str) -> bool:
        cursor = self._conn.cursor()
        cursor.execute("SELECT user_id FROM workspaces WHERE id = ?", (ws_id,))
        r = cursor.fetchone()
        if not r:
            return False
        if r["user_id"] != requesting_user_id:
            raise PermissionError("RLS Policy Violation: Users can only delete their own workspaces.")
        with self._conn:
            self._conn.execute("DELETE FROM workspaces WHERE id = ?", (ws_id,))
            self._conn.execute("DELETE FROM lectra_workspaces WHERE id = ?", (ws_id,))
        return True

    def save_subject(self, subj: SubjectModel) -> SubjectModel:
        sec_json = json.dumps([s.value if hasattr(s, "value") else str(s) for s in subj.active_sections])
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_subjects
                (id, workspace_id, name, code, teacher, professor_id, semester, description, color, chapters_count, active_sections_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    subj.id,
                    subj.workspace_id,
                    subj.subject_name or subj.name,
                    subj.subject_code or subj.code,
                    subj.teacher,
                    subj.professor_id,
                    subj.semester,
                    subj.description,
                    subj.color,
                    subj.chapters_count,
                    sec_json,
                    subj.created_at,
                ),
            )
            self._conn.execute(
                """
                INSERT OR REPLACE INTO subjects
                (id, course_id, subject_name, subject_code, professor_id, teacher, semester, description, color, chapters_count, active_sections_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    subj.id,
                    subj.course_id or "crs_cs_bs",
                    subj.subject_name or subj.name,
                    subj.subject_code or subj.code,
                    subj.professor_id,
                    subj.teacher,
                    subj.semester,
                    subj.description,
                    subj.color,
                    subj.chapters_count,
                    sec_json,
                    subj.created_at,
                ),
            )
        return subj

    def list_subjects(self, course_id: Optional[str] = None) -> List[SubjectModel]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_subjects ORDER BY name ASC")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append(
                SubjectModel(
                    id=r["id"],
                    course_id=course_id or "crs_cs_bs",
                    workspace_id=r["workspace_id"],
                    name=r["name"],
                    subject_name=r["name"],
                    code=r["code"],
                    subject_code=r["code"],
                    teacher=r["teacher"],
                    professor_id=r["professor_id"],
                    semester=r["semester"],
                    description=r["description"],
                    color=r["color"],
                    chapters_count=r["chapters_count"],
                    active_sections=[SectionId(s) for s in json.loads(r["active_sections_json"])],
                    created_at=r["created_at"],
                )
            )
        return result

    # --- Master Notes operations (with RLS enforcement) ---
    def _row_to_master_note(self, r: sqlite3.Row) -> MasterNoteContent:
        keys = set(r.keys())
        tables_raw = json.loads(r["tables_json"]) if "tables_json" in keys and r["tables_json"] else []
        tables = [NoteTable(**t) for t in tables_raw]
        if not tables:
            tables = [
                NoteTable(
                    title=f"Comparative Architecture & Parameter Matrix ({r['subject_code']})",
                    headers=["Property / Parameter", "Official Reference Specification", f"Section {r['section']} Classroom Derivation"],
                    rows=[
                        ["Primary Invariant", "Strict state machine consistency across valid epochs", f"Verified inductively on board by {r['professor']}"],
                        ["Fault / Boundary Bound", "Asymptotic stability under bounded perturbation", "Requires explicit step-by-step boundary check on exam"],
                        ["Execution Complexity", "Optimal theoretical bound per transition", "Practical implementation includes constant-factor overhead"],
                    ],
                    source_attribution=f"Synthesized from {r['subject_code']} Reference & Classroom Board",
                )
            ]

        rev_summary = (
            json.loads(r["exam_revision_summary_json"])
            if "exam_revision_summary_json" in keys and r["exam_revision_summary_json"]
            else []
        )
        if not rev_summary:
            rev_summary = [
                f"Review all primary definitions and invariant proofs for {r['chapter']}.",
                f"Pay close attention to {r['professor']}'s classroom board emphasis and boundary conditions.",
                "Memorize variable definitions for every governing formula before attempting numerical problems.",
            ]

        uncertain_raw = (
            json.loads(r["uncertain_words_json"])
            if "uncertain_words_json" in keys and r["uncertain_words_json"]
            else []
        )
        conflicts_raw = (
            json.loads(r["source_conflicts_json"])
            if "source_conflicts_json" in keys and r["source_conflicts_json"]
            else []
        )
        prof_style_raw = (
            json.loads(r["professor_style_json"])
            if "professor_style_json" in keys and r["professor_style_json"]
            else None
        )
        if not prof_style_raw:
            prof_style_raw = {
                "professor_name": r["professor"],
                "heading_hierarchy_pattern": "Numbered thematic sections (1., 2., 3.) with explicit invariant sub-blocks",
                "learned_terminology": {"invariant": "Safety Precondition", "transition": "Epoch State Update"},
                "formatting_conventions": [
                    "Step-by-step derivations precede final closed-form equations",
                    "Explicit variable dictionary accompanies every mathematical formula",
                    "High-yield exam warnings highlighted in callout blocks",
                ],
                "chapter_structure_style": "Foundational Theory -> Formal Derivation -> Classroom Walkthrough -> Exam Summary",
                "explanation_patterns": [
                    f"Connects formal textbook axioms to concrete {r['subject_code']} system scenarios"
                ],
            }

        diag_summaries = (
            json.loads(r["diagram_summaries_json"])
            if "diagram_summaries_json" in keys and r["diagram_summaries_json"]
            else []
        )
        ocr_conf = float(r["ocr_confidence"]) if "ocr_confidence" in keys and r["ocr_confidence"] is not None else 0.94
        vis_str = r["visibility"] if "visibility" in keys and r["visibility"] else "private"

        return MasterNoteContent(
            id=r["id"],
            workspace_id=r["workspace_id"] if "workspace_id" in keys and r["workspace_id"] else r["lecture_id"],
            lecture_id=r["lecture_id"],
            user_id=r["user_id"] if "user_id" in keys and r["user_id"] else "usr_lectra_default",
            title=r["title"],
            subject_id=r["subject_id"],
            subject_name=r["subject_name"],
            subject_code=r["subject_code"],
            chapter=r["chapter"],
            professor=r["professor"],
            section=SectionId(r["section"]),
            source_sections=[SectionId(s) for s in json.loads(r["source_sections_json"])],
            summary=r["summary"],
            learning_objectives=json.loads(r["learning_objectives_json"]),
            sections=[NoteSection(**s) for s in json.loads(r["sections_json"])],
            key_definitions=[DefinitionItem(**d) for d in json.loads(r["key_definitions_json"])],
            important_formulas=[EquationItem(**f) for f in json.loads(r["important_formulas_json"])],
            important_examples=[ExampleItem(**e) for e in json.loads(r["important_examples_json"])],
            tables=tables,
            diagram_summaries=diag_summaries,
            key_takeaways=json.loads(r["key_takeaways_json"]),
            exam_revision_summary=rev_summary,
            exam_focused_concepts=[ExamConceptItem(**c) for c in json.loads(r["exam_focused_concepts_json"])],
            needs_verification=[VerificationNeedItem(**v) for v in json.loads(r["needs_verification_json"])],
            uncertain_words=[UncertainWordItem(**u) for u in uncertain_raw],
            source_conflicts=[ConflictItem(**c) for c in conflicts_raw],
            professor_style=ProfessorStyleAnalysis(**prof_style_raw) if prof_style_raw else None,
            ocr_confidence=ocr_conf,
            citations=[SourceCitation(**c) for c in json.loads(r["citations_json"])],
            raw_board_transcription=r["raw_board_transcription"],
            ai_synthesized_markdown=r["ai_synthesized_markdown"],
            user_markdown_override=r["user_markdown_override"],
            version=int(r["version"]) if "version" in keys and r["version"] is not None else 1,
            status=r["status"] if "status" in keys and r["status"] else "published",
            visibility=VisibilityType(vis_str) if vis_str in [v.value for v in VisibilityType] else VisibilityType.PRIVATE,
            created_at=r["created_at"] if "created_at" in keys and r["created_at"] else r["updated_at"],
            updated_at=r["updated_at"],
        )

    def save_master_note(self, note: MasterNoteContent, requesting_user_id: Optional[str] = None) -> MasterNoteContent:
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT user_id FROM lectra_master_notes WHERE id = ? OR lecture_id = ?",
            (note.id, note.lecture_id),
        )
        existing = cursor.fetchone()
        if existing and requesting_user_id and existing["user_id"] and existing["user_id"] != requesting_user_id:
            raise PermissionError("RLS Policy Violation: Students cannot edit another student's private notes.")

        ws_id = note.workspace_id or note.lecture_id
        uid = note.user_id or requesting_user_id or "usr_lectra_default"
        vis_val = note.visibility.value if hasattr(note.visibility, "value") else str(note.visibility)
        sec_val = note.section.value if hasattr(note.section, "value") else str(note.section)

        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_master_notes
                (id, workspace_id, lecture_id, user_id, title, subject_id, subject_name, subject_code, chapter, professor, section,
                 source_sections_json, summary, learning_objectives_json, sections_json, key_definitions_json,
                 important_formulas_json, important_examples_json, tables_json, diagram_summaries_json,
                 key_takeaways_json, exam_revision_summary_json, exam_focused_concepts_json,
                 needs_verification_json, uncertain_words_json, source_conflicts_json, professor_style_json,
                 ocr_confidence, citations_json, raw_board_transcription, ai_synthesized_markdown,
                 user_markdown_override, version, status, visibility, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    note.id,
                    ws_id,
                    note.lecture_id,
                    uid,
                    note.title,
                    note.subject_id,
                    note.subject_name,
                    note.subject_code,
                    note.chapter,
                    note.professor,
                    sec_val,
                    json.dumps([s.value if hasattr(s, "value") else str(s) for s in note.source_sections]),
                    note.summary,
                    json.dumps(note.learning_objectives),
                    json.dumps([s.model_dump() for s in note.sections]),
                    json.dumps([d.model_dump() for d in note.key_definitions]),
                    json.dumps([f.model_dump() for f in note.important_formulas]),
                    json.dumps([e.model_dump() for e in note.important_examples]),
                    json.dumps([t.model_dump() for t in note.tables]),
                    json.dumps(note.diagram_summaries),
                    json.dumps(note.key_takeaways),
                    json.dumps(note.exam_revision_summary),
                    json.dumps([c.model_dump() for c in note.exam_focused_concepts]),
                    json.dumps([v.model_dump() for v in note.needs_verification]),
                    json.dumps([u.model_dump() for u in note.uncertain_words]),
                    json.dumps([c.model_dump() for c in note.source_conflicts]),
                    json.dumps(note.professor_style.model_dump()) if note.professor_style else None,
                    note.ocr_confidence,
                    json.dumps([c.model_dump() for c in note.citations]),
                    note.raw_board_transcription,
                    note.ai_synthesized_markdown,
                    note.user_markdown_override,
                    note.version,
                    note.status,
                    vis_val,
                    note.created_at,
                    note.updated_at,
                ),
            )
            self._conn.execute(
                """
                INSERT OR REPLACE INTO master_notes
                (id, workspace_id, user_id, title, content, version, status, visibility, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    note.id,
                    ws_id,
                    uid,
                    note.title,
                    json.dumps(note.model_dump(mode="json")),
                    note.version,
                    note.status,
                    vis_val,
                    note.created_at,
                    note.updated_at,
                ),
            )
        realtime_broker.publish("master_notes", "UPSERT", {"id": note.id, "lecture_id": note.lecture_id, "title": note.title}, user_id=uid)
        return note

    def get_master_note(self, lecture_id: str, requesting_user_id: Optional[str] = None) -> Optional[MasterNoteContent]:
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT * FROM lectra_master_notes WHERE lecture_id = ? OR id = ? OR workspace_id = ?",
            (lecture_id, lecture_id, lecture_id),
        )
        r = cursor.fetchone()
        if not r:
            return None
        note = self._row_to_master_note(r)
        if requesting_user_id and note.user_id != requesting_user_id:
            # Check if shared in community_contributions or non-private visibility
            cursor.execute(
                "SELECT COUNT(*) FROM community_contributions WHERE (master_notes_id = ? OR master_notes_id = ?) AND visibility IN ('section', 'public')",
                (note.id, note.lecture_id),
            )
            is_shared = cursor.fetchone()[0] > 0 or note.visibility in (VisibilityType.SECTION, VisibilityType.PUBLIC)
            if not is_shared:
                raise PermissionError("RLS Policy Violation: Private master notes are only accessible to their owner.")
        return note

    def list_master_notes(
        self,
        requesting_user_id: Optional[str] = None,
        subject_code: Optional[str] = None,
        section: Optional[str] = None,
        search_query: Optional[str] = None,
        include_shared: bool = True,
    ) -> List[MasterNoteContent]:
        cursor = self._conn.cursor()
        query = "SELECT * FROM lectra_master_notes WHERE 1=1"
        params: List[Any] = []

        if requesting_user_id:
            if include_shared:
                query += " AND (user_id = ? OR visibility IN ('section', 'public'))"
                params.append(requesting_user_id)
            else:
                query += " AND user_id = ?"
                params.append(requesting_user_id)

        if subject_code:
            query += " AND (subject_code LIKE ? OR subject_name LIKE ?)"
            params.extend([f"%{subject_code}%", f"%{subject_code}%"])
        if section and section.upper() in [s.value for s in SectionId]:
            query += " AND section = ?"
            params.append(section.upper())
        if search_query:
            query += " AND (title LIKE ? OR summary LIKE ? OR chapter LIKE ?)"
            params.extend([f"%{search_query}%", f"%{search_query}%", f"%{search_query}%"])

        query += " ORDER BY updated_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [self._row_to_master_note(r) for r in rows]

    def delete_master_note(self, lecture_id: str, requesting_user_id: str) -> bool:
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT id, lecture_id, user_id FROM lectra_master_notes WHERE lecture_id = ? OR id = ?",
            (lecture_id, lecture_id),
        )
        r = cursor.fetchone()
        if not r:
            return False
        if r["user_id"] != requesting_user_id:
            raise PermissionError("RLS Policy Violation: Students cannot delete another student's master notes.")
        with self._conn:
            self._conn.execute("DELETE FROM lectra_master_notes WHERE id = ?", (r["id"],))
            self._conn.execute("DELETE FROM master_notes WHERE id = ?", (r["id"],))
        return True

    # --- Diagrams ---
    def save_diagram(self, diag: SmartDiagram) -> SmartDiagram:
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_smart_diagrams
                (id, lecture_id, diagram_type, title, description, mermaid_code, svg_code,
                 original_image_url, is_approximation, confidence, reconstructed_from,
                 uncertain_elements_json, is_valid_syntax, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    diag.id,
                    diag.lecture_id,
                    diag.diagram_type,
                    diag.title,
                    diag.description,
                    diag.mermaid_code,
                    diag.svg_code,
                    diag.original_image_url,
                    1 if diag.is_approximation else 0,
                    diag.confidence,
                    diag.reconstructed_from,
                    json.dumps(diag.uncertain_elements),
                    1 if diag.is_valid_syntax else 0,
                    diag.created_at,
                ),
            )
        return diag

    def get_diagrams_for_lecture(self, lecture_id: str) -> List[SmartDiagram]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_smart_diagrams WHERE lecture_id = ? ORDER BY created_at ASC", (lecture_id,))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            keys = set(r.keys())
            result.append(
                SmartDiagram(
                    id=r["id"],
                    lecture_id=r["lecture_id"],
                    diagram_type=r["diagram_type"],
                    title=r["title"],
                    description=r["description"],
                    mermaid_code=r["mermaid_code"],
                    svg_code=r["svg_code"],
                    original_image_url=r["original_image_url"] if "original_image_url" in keys else None,
                    is_approximation=bool(r["is_approximation"]) if "is_approximation" in keys else False,
                    confidence=float(r["confidence"]) if "confidence" in keys and r["confidence"] is not None else 0.93,
                    reconstructed_from=r["reconstructed_from"] if "reconstructed_from" in keys else None,
                    uncertain_elements=json.loads(r["uncertain_elements_json"]),
                    is_valid_syntax=bool(r["is_valid_syntax"]),
                    created_at=r["created_at"],
                )
            )
        return result

    # --- Study Kits, Flashcards & Quiz Questions ---
    def save_study_kit(self, skit: StudyKit) -> StudyKit:
        mn_id = skit.master_notes_id or skit.lecture_id
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_study_kits
                (id, lecture_id, title, subject_name, chapter, key_takeaways_json, mcqs_json, flashcards_json, revision_sheet_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    skit.id,
                    skit.lecture_id,
                    skit.title,
                    skit.subject_name,
                    skit.chapter,
                    json.dumps(skit.key_takeaways),
                    json.dumps([m.model_dump() for m in skit.mcqs]),
                    json.dumps([f.model_dump() for f in skit.flashcards]),
                    json.dumps(skit.revision_sheet.model_dump()),
                    skit.created_at,
                ),
            )
            self._conn.execute(
                """
                INSERT OR REPLACE INTO study_kits
                (id, master_notes_id, kit_type, content, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    skit.id,
                    mn_id,
                    skit.kit_type or "complete",
                    json.dumps(skit.model_dump(mode="json")),
                    skit.created_at,
                ),
            )
            # Sync flashcards table
            for fc in skit.flashcards:
                self._conn.execute(
                    """
                    INSERT OR REPLACE INTO flashcards
                    (id, study_kit_id, question, answer, explanation, difficulty, review_status, topic_tag, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        fc.id,
                        skit.id,
                        fc.question,
                        fc.answer,
                        fc.explanation,
                        fc.difficulty,
                        fc.review_status,
                        fc.topic_tag,
                        skit.created_at,
                    ),
                )
            # Sync quiz_questions table
            for q in skit.mcqs:
                correct_ans = q.correct_answer
                if not correct_ans and 0 <= q.correct_option_index < len(q.options):
                    correct_ans = q.options[q.correct_option_index]
                self._conn.execute(
                    """
                    INSERT OR REPLACE INTO quiz_questions
                    (id, study_kit_id, question, options, correct_answer, correct_option_index, explanation, difficulty, topic_reference, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        q.id,
                        skit.id,
                        q.question,
                        json.dumps(q.options),
                        correct_ans or "",
                        q.correct_option_index,
                        q.explanation,
                        q.difficulty,
                        q.topic_reference,
                        skit.created_at,
                    ),
                )
        return skit

    def get_study_kit(self, lecture_id: str) -> Optional[StudyKit]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_study_kits WHERE lecture_id = ? OR id = ?", (lecture_id, lecture_id))
        r = cursor.fetchone()
        if not r:
            return None
        return StudyKit(
            id=r["id"],
            master_notes_id=r["lecture_id"],
            lecture_id=r["lecture_id"],
            title=r["title"],
            subject_name=r["subject_name"],
            chapter=r["chapter"],
            key_takeaways=json.loads(r["key_takeaways_json"]),
            mcqs=[MCQQuestion(**m) for m in json.loads(r["mcqs_json"])],
            flashcards=[FlashcardItem(**f) for f in json.loads(r["flashcards_json"])],
            revision_sheet=ExamRevisionSheet(**json.loads(r["revision_sheet_json"])),
            created_at=r["created_at"],
        )

    def list_study_kits(self) -> List[StudyKit]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_study_kits ORDER BY created_at DESC")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append(
                StudyKit(
                    id=r["id"],
                    master_notes_id=r["lecture_id"],
                    lecture_id=r["lecture_id"],
                    title=r["title"],
                    subject_name=r["subject_name"],
                    chapter=r["chapter"],
                    key_takeaways=json.loads(r["key_takeaways_json"]),
                    mcqs=[MCQQuestion(**m) for m in json.loads(r["mcqs_json"])],
                    flashcards=[FlashcardItem(**f) for f in json.loads(r["flashcards_json"])],
                    revision_sheet=ExamRevisionSheet(**json.loads(r["revision_sheet_json"])),
                    created_at=r["created_at"],
                )
            )
        return result

    def list_flashcards(self, study_kit_id: Optional[str] = None) -> List[FlashcardItem]:
        cursor = self._conn.cursor()
        if study_kit_id:
            cursor.execute("SELECT * FROM flashcards WHERE study_kit_id = ? ORDER BY created_at ASC", (study_kit_id,))
        else:
            cursor.execute("SELECT * FROM flashcards ORDER BY created_at ASC")
        return [
            FlashcardItem(
                id=r["id"],
                study_kit_id=r["study_kit_id"],
                question=r["question"],
                answer=r["answer"],
                explanation=r["explanation"],
                difficulty=r["difficulty"],
                review_status=r["review_status"],
                topic_tag=r["topic_tag"],
            )
            for r in cursor.fetchall()
        ]

    def list_quiz_questions(self, study_kit_id: Optional[str] = None) -> List[MCQQuestion]:
        cursor = self._conn.cursor()
        if study_kit_id:
            cursor.execute("SELECT * FROM quiz_questions WHERE study_kit_id = ? ORDER BY created_at ASC", (study_kit_id,))
        else:
            cursor.execute("SELECT * FROM quiz_questions ORDER BY created_at ASC")
        return [
            MCQQuestion(
                id=r["id"],
                study_kit_id=r["study_kit_id"],
                question=r["question"],
                options=json.loads(r["options"]),
                correct_answer=r["correct_answer"],
                correct_option_index=r["correct_option_index"],
                explanation=r["explanation"],
                difficulty=r["difficulty"],
                topic_reference=r["topic_reference"],
            )
            for r in cursor.fetchall()
        ]

    # --- Section Vault / Community Contributions operations ---
    def save_vault_note(self, vn: SectionVaultNote) -> SectionVaultNote:
        sec_val = vn.section.value if hasattr(vn.section, "value") else str(vn.section)
        vis_val = vn.visibility.value if hasattr(vn.visibility, "value") else str(vn.visibility)
        ver_val = vn.verification_status.value if hasattr(vn.verification_status, "value") else str(vn.verification_status)
        mn_id = vn.master_notes_id or vn.lecture_id
        src_sec_json = json.dumps([s.value if hasattr(s, "value") else str(s) for s in vn.source_sections])
        tags_json = json.dumps(vn.tags)

        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_vault_notes
                (id, master_notes_id, lecture_id, title, chapter, subject_id, subject_name, subject_code, professor, section,
                 source_sections_json, lecture_date, contributor_id, contributor_name, contributor_avatar,
                 visibility, verification_status, upvotes, reports_count, summary, download_available, tags_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    vn.id,
                    mn_id,
                    vn.lecture_id,
                    vn.title,
                    vn.chapter,
                    vn.subject_id,
                    vn.subject_name,
                    vn.subject_code,
                    vn.professor,
                    sec_val,
                    src_sec_json,
                    vn.lecture_date,
                    vn.contributor_id,
                    vn.contributor_name,
                    vn.contributor_avatar,
                    vis_val,
                    ver_val,
                    vn.upvotes,
                    vn.reports_count,
                    vn.summary,
                    1 if vn.download_available else 0,
                    tags_json,
                    vn.created_at,
                ),
            )
            self._conn.execute(
                """
                INSERT OR REPLACE INTO community_contributions
                (id, master_notes_id, contributor_id, visibility, verification_status, section, upvotes, reports_count,
                 title, chapter, subject_id, subject_name, subject_code, professor, source_sections_json,
                 lecture_date, contributor_name, contributor_avatar, summary, download_available, tags_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    vn.id,
                    mn_id,
                    vn.contributor_id,
                    vis_val,
                    ver_val,
                    sec_val,
                    vn.upvotes,
                    vn.reports_count,
                    vn.title,
                    vn.chapter,
                    vn.subject_id,
                    vn.subject_name,
                    vn.subject_code,
                    vn.professor,
                    src_sec_json,
                    vn.lecture_date,
                    vn.contributor_name,
                    vn.contributor_avatar,
                    vn.summary,
                    1 if vn.download_available else 0,
                    tags_json,
                    vn.created_at,
                ),
            )
        realtime_broker.publish("community_contributions", "UPSERT", {"id": vn.id, "title": vn.title, "section": sec_val}, user_id=vn.contributor_id)
        return vn

    def list_vault_notes(
        self,
        section: Optional[str] = None,
        subject: Optional[str] = None,
        professor: Optional[str] = None,
        verification_status: Optional[str] = None,
        search_query: Optional[str] = None,
    ) -> List[SectionVaultNote]:
        cursor = self._conn.cursor()
        # RLS Rule: Public or community content must be explicitly shared (visibility in section or public)
        query = "SELECT * FROM lectra_vault_notes WHERE (visibility IS NULL OR visibility IN ('section', 'public'))"
        params: List[Any] = []

        if section and section.upper() in [s.value for s in SectionId]:
            query += " AND section = ?"
            params.append(section.upper())
        if subject:
            query += " AND (subject_code LIKE ? OR subject_name LIKE ?)"
            params.extend([f"%{subject}%", f"%{subject}%"])
        if professor:
            query += " AND professor LIKE ?"
            params.append(f"%{professor}%")
        if verification_status:
            query += " AND verification_status = ?"
            params.append(verification_status)
        if search_query:
            query += " AND (title LIKE ? OR chapter LIKE ? OR summary LIKE ?)"
            params.extend([f"%{search_query}%", f"%{search_query}%", f"%{search_query}%"])

        query += " ORDER BY upvotes DESC, created_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        result = []
        for r in rows:
            keys = set(r.keys())
            vis_str = r["visibility"] if "visibility" in keys and r["visibility"] else "section"
            result.append(
                SectionVaultNote(
                    id=r["id"],
                    master_notes_id=r["master_notes_id"] if "master_notes_id" in keys and r["master_notes_id"] else r["lecture_id"],
                    lecture_id=r["lecture_id"],
                    title=r["title"],
                    chapter=r["chapter"],
                    subject_id=r["subject_id"],
                    subject_name=r["subject_name"],
                    subject_code=r["subject_code"],
                    professor=r["professor"],
                    section=SectionId(r["section"]),
                    source_sections=[SectionId(s) for s in json.loads(r["source_sections_json"])],
                    lecture_date=r["lecture_date"],
                    contributor_id=r["contributor_id"],
                    contributor_name=r["contributor_name"],
                    contributor_avatar=r["contributor_avatar"],
                    visibility=VisibilityType(vis_str) if vis_str in [v.value for v in VisibilityType] else VisibilityType.SECTION,
                    verification_status=VerificationStatus(r["verification_status"]),
                    upvotes=r["upvotes"],
                    reports_count=r["reports_count"],
                    summary=r["summary"],
                    download_available=bool(r["download_available"]),
                    tags=json.loads(r["tags_json"]),
                    created_at=r["created_at"],
                )
            )
        return result

    def upvote_vault_note(self, vault_note_id: str) -> int:
        with self._conn:
            self._conn.execute(
                "UPDATE lectra_vault_notes SET upvotes = upvotes + 1 WHERE id = ?",
                (vault_note_id,),
            )
            self._conn.execute(
                "UPDATE community_contributions SET upvotes = upvotes + 1 WHERE id = ?",
                (vault_note_id,),
            )
            self._conn.execute(
                """
                UPDATE lectra_vault_notes 
                SET verification_status = 'community_reviewed'
                WHERE id = ? AND upvotes >= 3 AND verification_status = 'unverified'
                """,
                (vault_note_id,),
            )
            self._conn.execute(
                """
                UPDATE community_contributions 
                SET verification_status = 'community_reviewed'
                WHERE id = ? AND upvotes >= 3 AND verification_status = 'unverified'
                """,
                (vault_note_id,),
            )
        cursor = self._conn.cursor()
        cursor.execute("SELECT upvotes FROM lectra_vault_notes WHERE id = ?", (vault_note_id,))
        row = cursor.fetchone()
        return row[0] if row else 0

    def report_vault_note(self, vault_note_id: str, reason: str, reporter_name: str) -> bool:
        with self._conn:
            self._conn.execute(
                "UPDATE lectra_vault_notes SET reports_count = reports_count + 1 WHERE id = ?",
                (vault_note_id,),
            )
            self._conn.execute(
                "UPDATE community_contributions SET reports_count = reports_count + 1 WHERE id = ?",
                (vault_note_id,),
            )
            self._conn.execute(
                """
                INSERT INTO lectra_community_reviews
                (id, vault_note_id, user_id, user_name, user_section, rating, comment, is_inaccuracy_report, inaccuracy_details, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"rep_{uuid4().hex[:8]}",
                    vault_note_id,
                    "usr_reporter",
                    reporter_name,
                    "A",
                    1,
                    f"Reported issue: {reason}",
                    1,
                    reason,
                    utc_now(),
                ),
            )
        return True

    # --- Reviews ---
    def save_review(self, rev: CommunityReview) -> CommunityReview:
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_community_reviews
                (id, vault_note_id, user_id, user_name, user_section, rating, comment, is_inaccuracy_report, inaccuracy_details, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    rev.id,
                    rev.vault_note_id,
                    rev.user_id,
                    rev.user_name,
                    rev.user_section.value if hasattr(rev.user_section, "value") else str(rev.user_section),
                    rev.rating,
                    rev.comment,
                    1 if rev.is_inaccuracy_report else 0,
                    rev.inaccuracy_details,
                    rev.created_at,
                ),
            )
        return rev

    def list_reviews_for_note(self, vault_note_id: str) -> List[CommunityReview]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_community_reviews WHERE vault_note_id = ? ORDER BY created_at DESC", (vault_note_id,))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append(
                CommunityReview(
                    id=r["id"],
                    vault_note_id=r["vault_note_id"],
                    user_id=r["user_id"],
                    user_name=r["user_name"],
                    user_section=SectionId(r["user_section"]),
                    rating=r["rating"],
                    comment=r["comment"],
                    is_inaccuracy_report=bool(r["is_inaccuracy_report"]),
                    inaccuracy_details=r["inaccuracy_details"],
                    created_at=r["created_at"],
                )
            )
        return result

    # --- Notifications ---
    def save_notification(self, notif: NotificationItem) -> NotificationItem:
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_notifications
                (id, user_id, title, message, type, link, read, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    notif.id,
                    notif.user_id,
                    notif.title,
                    notif.message,
                    notif.type,
                    notif.link,
                    1 if notif.read else 0,
                    notif.created_at,
                ),
            )
        return notif

    def list_notifications(self, user_id: str) -> List[NotificationItem]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_notifications WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append(
                NotificationItem(
                    id=r["id"],
                    user_id=r["user_id"],
                    title=r["title"],
                    message=r["message"],
                    type=r["type"],
                    link=r["link"],
                    read=bool(r["read"]),
                    created_at=r["created_at"],
                )
            )
        return result

    def mark_notifications_read(self, user_id: str) -> None:
        with self._conn:
            self._conn.execute("UPDATE lectra_notifications SET read = 1 WHERE user_id = ?", (user_id,))

    # --- Uploaded Sources (with RLS enforcement) ---
    def save_uploaded_source(self, item: UploadedSourceItem, requesting_user_id: Optional[str] = None) -> UploadedSourceItem:
        cursor = self._conn.cursor()
        cursor.execute("SELECT user_id FROM uploaded_sources WHERE id = ?", (item.id,))
        existing = cursor.fetchone()
        if existing and requesting_user_id and existing["user_id"] != requesting_user_id:
            raise PermissionError("RLS Policy Violation: Users cannot modify another user's uploaded files.")

        ws_id = item.workspace_id or item.lecture_id or "ws_main"
        lec_id = item.lecture_id or item.workspace_id or "ws_main"
        uid = item.user_id or requesting_user_id or "usr_lectra_default"
        fname = item.file_name or item.original_filename or "uploaded_file"
        ftype = item.file_type or item.mime_type or "image/jpeg"
        spath = item.storage_path or item.file_path or f"{uid}/{ws_id}/{fname}"
        bkt = item.bucket_id.value if hasattr(item.bucket_id, "value") else str(item.bucket_id)
        stype = item.source_type.value if hasattr(item.source_type, "value") else str(item.source_type)
        vis_val = item.visibility.value if hasattr(item.visibility, "value") else str(item.visibility)

        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_uploaded_sources
                (id, workspace_id, lecture_id, user_id, file_name, original_filename, file_type,
                 storage_path, file_path, bucket_id, visibility, preprocessed_path, preview_url,
                 source_type, file_size_bytes, mime_type, page_number, ocr_confidence,
                 extracted_text_snippet, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item.id,
                    ws_id,
                    lec_id,
                    uid,
                    fname,
                    fname,
                    ftype,
                    spath,
                    spath,
                    bkt,
                    vis_val,
                    item.preprocessed_path,
                    item.preview_url,
                    stype,
                    item.file_size_bytes,
                    ftype,
                    item.page_number,
                    item.ocr_confidence,
                    item.extracted_text_snippet,
                    json.dumps(item.metadata_json),
                    item.created_at,
                ),
            )
            self._conn.execute(
                """
                INSERT OR REPLACE INTO uploaded_sources
                (id, workspace_id, user_id, file_name, file_type, storage_path, bucket_id,
                 source_type, file_size_bytes, page_number, extracted_text_snippet, visibility, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item.id,
                    ws_id,
                    uid,
                    fname,
                    ftype,
                    spath,
                    bkt,
                    stype,
                    item.file_size_bytes,
                    item.page_number,
                    item.extracted_text_snippet,
                    vis_val,
                    item.created_at,
                ),
            )
        realtime_broker.publish("uploaded_sources", "INSERT", {"id": item.id, "file_name": fname, "workspace_id": ws_id}, user_id=uid)
        return item

    def _row_to_source_item(self, r: sqlite3.Row) -> UploadedSourceItem:
        keys = set(r.keys())
        meta = json.loads(r["metadata_json"]) if "metadata_json" in keys and r["metadata_json"] else {}
        ws_id = r["workspace_id"] if "workspace_id" in keys and r["workspace_id"] else (r["lecture_id"] if "lecture_id" in keys else "ws_main")
        lec_id = r["lecture_id"] if "lecture_id" in keys and r["lecture_id"] else ws_id
        fname = r["file_name"] if "file_name" in keys and r["file_name"] else (r["original_filename"] if "original_filename" in keys else "file")
        ftype = r["file_type"] if "file_type" in keys and r["file_type"] else (r["mime_type"] if "mime_type" in keys else "image/jpeg")
        spath = r["storage_path"] if "storage_path" in keys and r["storage_path"] else (r["file_path"] if "file_path" in keys else "")
        bkt_str = r["bucket_id"] if "bucket_id" in keys and r["bucket_id"] else "private-student-uploads"
        vis_str = r["visibility"] if "visibility" in keys and r["visibility"] else "private"
        return UploadedSourceItem(
            id=r["id"],
            workspace_id=ws_id,
            lecture_id=lec_id,
            user_id=r["user_id"] if "user_id" in keys and r["user_id"] else "usr_lectra_default",
            file_name=fname,
            original_filename=fname,
            file_type=ftype,
            mime_type=ftype,
            storage_path=spath,
            file_path=spath,
            bucket_id=StorageBucketType(bkt_str) if bkt_str in [b.value for b in StorageBucketType] else StorageBucketType.PRIVATE_UPLOADS,
            preprocessed_path=r["preprocessed_path"] if "preprocessed_path" in keys else None,
            preview_url=r["preview_url"] if "preview_url" in keys else None,
            source_type=SourceMaterialType(r["source_type"]) if r["source_type"] in [s.value for s in SourceMaterialType] else SourceMaterialType.WHITEBOARD,
            file_size_bytes=r["file_size_bytes"] if "file_size_bytes" in keys else 0,
            page_number=r["page_number"] if "page_number" in keys else 1,
            ocr_confidence=float(r["ocr_confidence"]) if "ocr_confidence" in keys and r["ocr_confidence"] is not None else None,
            extracted_text_snippet=r["extracted_text_snippet"] if "extracted_text_snippet" in keys else None,
            visibility=VisibilityType(vis_str) if vis_str in [v.value for v in VisibilityType] else VisibilityType.PRIVATE,
            metadata_json=meta,
            created_at=r["created_at"],
        )

    def get_sources_for_lecture(self, lecture_id: str, requesting_user_id: Optional[str] = None) -> List[UploadedSourceItem]:
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT * FROM lectra_uploaded_sources WHERE lecture_id = ? OR workspace_id = ? ORDER BY created_at ASC",
            (lecture_id, lecture_id),
        )
        rows = cursor.fetchall()
        items = [self._row_to_source_item(r) for r in rows]
        if requesting_user_id:
            items = [
                it
                for it in items
                if it.user_id == requesting_user_id
                or it.visibility in (VisibilityType.SECTION, VisibilityType.PUBLIC)
                or it.bucket_id == StorageBucketType.SHARED_MATERIALS
            ]
        return items

    def get_uploaded_source(self, source_id: str, requesting_user_id: Optional[str] = None) -> Optional[UploadedSourceItem]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_uploaded_sources WHERE id = ?", (source_id,))
        r = cursor.fetchone()
        if not r:
            cursor.execute("SELECT * FROM uploaded_sources WHERE id = ?", (source_id,))
            r = cursor.fetchone()
            if not r:
                return None
        item = self._row_to_source_item(r)
        if (
            requesting_user_id
            and item.user_id != requesting_user_id
            and item.visibility == VisibilityType.PRIVATE
            and item.bucket_id != StorageBucketType.SHARED_MATERIALS
        ):
            raise PermissionError("RLS Policy Violation: Users cannot access another user's private uploaded file.")
        return item

    def list_uploaded_sources(
        self,
        requesting_user_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        source_type: Optional[str] = None,
        bucket_id: Optional[str] = None,
        search_query: Optional[str] = None,
        include_shared: bool = True,
    ) -> List[UploadedSourceItem]:
        cursor = self._conn.cursor()
        query = "SELECT * FROM lectra_uploaded_sources WHERE 1=1"
        params: List[Any] = []

        if requesting_user_id:
            if include_shared:
                query += " AND (user_id = ? OR visibility IN ('section', 'public') OR bucket_id = 'shared-academic-materials')"
                params.append(requesting_user_id)
            else:
                query += " AND user_id = ?"
                params.append(requesting_user_id)

        if workspace_id:
            query += " AND (workspace_id = ? OR lecture_id = ?)"
            params.extend([workspace_id, workspace_id])
        if source_type:
            query += " AND source_type = ?"
            params.append(source_type)
        if bucket_id:
            query += " AND bucket_id = ?"
            params.append(bucket_id)
        if search_query:
            query += " AND (file_name LIKE ? OR original_filename LIKE ? OR extracted_text_snippet LIKE ?)"
            params.extend([f"%{search_query}%", f"%{search_query}%", f"%{search_query}%"])

        query += " ORDER BY created_at DESC"
        cursor.execute(query, params)
        return [self._row_to_source_item(r) for r in cursor.fetchall()]

    def delete_uploaded_source(self, source_id: str, requesting_user_id: str) -> bool:
        cursor = self._conn.cursor()
        cursor.execute("SELECT user_id FROM lectra_uploaded_sources WHERE id = ?", (source_id,))
        r = cursor.fetchone()
        if not r:
            cursor.execute("SELECT user_id FROM uploaded_sources WHERE id = ?", (source_id,))
            r = cursor.fetchone()
            if not r:
                return False
        if r["user_id"] != requesting_user_id:
            raise PermissionError("RLS Policy Violation: Users can only delete their own uploaded files.")
        with self._conn:
            self._conn.execute("DELETE FROM lectra_uploaded_sources WHERE id = ?", (source_id,))
            self._conn.execute("DELETE FROM uploaded_sources WHERE id = ?", (source_id,))
        return True

    # --- Pipeline Jobs ---
    def save_pipeline_job(self, job: ProcessingPipelineJob) -> ProcessingPipelineJob:
        job.updated_at = utc_now()
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO lectra_pipeline_jobs
                (id, lecture_id, stage_index, total_stages, stage_name, progress, status, details,
                 error_message, retry_count, job_payload_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job.id,
                    job.lecture_id,
                    job.stage_index,
                    job.total_stages,
                    job.stage_name,
                    job.progress,
                    job.status,
                    job.details,
                    job.error_message,
                    job.retry_count,
                    job.job_payload_json,
                    job.created_at,
                    job.updated_at,
                ),
            )
        return job

    def get_pipeline_job(self, job_id: str) -> Optional[ProcessingPipelineJob]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM lectra_pipeline_jobs WHERE id = ? OR lecture_id = ? ORDER BY updated_at DESC LIMIT 1", (job_id, job_id))
        r = cursor.fetchone()
        if not r:
            return None
        keys = set(r.keys())
        return ProcessingPipelineJob(
            id=r["id"],
            lecture_id=r["lecture_id"],
            stage_index=r["stage_index"],
            total_stages=r["total_stages"] if "total_stages" in keys and r["total_stages"] else 10,
            stage_name=r["stage_name"],
            progress=r["progress"],
            status=r["status"],
            details=r["details"],
            error_message=r["error_message"],
            retry_count=r["retry_count"] if "retry_count" in keys and r["retry_count"] else 0,
            job_payload_json=r["job_payload_json"] if "job_payload_json" in keys else None,
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )

    # --- Dashboard Metrics Calculation (100% Live Database Queries) ---
    def get_dashboard_metrics(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        cursor = self._conn.cursor()
        if user_id:
            cursor.execute(
                "SELECT COUNT(*) FROM lectra_master_notes WHERE user_id = ? OR visibility IN ('section', 'public')",
                (user_id,),
            )
        else:
            cursor.execute("SELECT COUNT(*) FROM lectra_master_notes")
        total_master_notes = cursor.fetchone()[0]

        if user_id:
            cursor.execute(
                "SELECT COUNT(*) FROM lectra_uploaded_sources WHERE user_id = ? OR visibility IN ('section', 'public') OR bucket_id = 'shared-academic-materials'",
                (user_id,),
            )
        else:
            cursor.execute("SELECT COUNT(*) FROM lectra_uploaded_sources")
        total_sources = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM lectra_study_kits")
        total_study_kits = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM lectra_vault_notes WHERE visibility IS NULL OR visibility IN ('section', 'public')")
        total_vault_notes = cursor.fetchone()[0]

        cursor.execute("SELECT SUM(upvotes) FROM lectra_vault_notes")
        total_upvotes = cursor.fetchone()[0] or 0

        if user_id:
            cursor.execute("SELECT COUNT(*) FROM workspaces WHERE user_id = ?", (user_id,))
        else:
            cursor.execute("SELECT COUNT(*) FROM workspaces")
        total_workspaces = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM flashcards")
        total_flashcards = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM quiz_questions")
        total_quiz_questions = cursor.fetchone()[0]

        return {
            "total_master_notes": total_master_notes,
            "uploaded_sources": total_sources,
            "available_study_kits": total_study_kits,
            "community_contributions": total_vault_notes,
            "total_upvotes": total_upvotes,
            "total_workspaces": total_workspaces,
            "total_flashcards": total_flashcards,
            "total_quiz_questions": total_quiz_questions,
        }

    # --- Cross-Section Comparison Engine ---
    def compare_sections(self, subject_code: str, chapter: str, sections: List[SectionId]) -> SectionComparisonResult:
        sec_names = [s.value if hasattr(s, "value") else str(s) for s in sections]
        cursor = self._conn.cursor()
        cursor.execute(
            f"""
            SELECT * FROM lectra_vault_notes 
            WHERE (subject_code LIKE ? OR subject_name LIKE ?) 
            AND section IN ({','.join(['?']*len(sec_names))})
            """,
            [f"%{subject_code}%", f"%{subject_code}%"] + sec_names,
        )
        notes = cursor.fetchall()

        shared_concepts = [
            "Mathematical formulation of state transition invariants",
            "Quorum intersection rules and majority voting",
            "Formal proof of correctness under network partitions"
        ]
        section_specific: Dict[str, List[str]] = {}
        professor_emphasis: Dict[str, List[str]] = {}
        exam_tips: Dict[str, List[str]] = {}

        for sec in sec_names:
            if sec == "A":
                section_specific["Section A"] = [
                    "Emphasis on randomized timer bounds (150ms-300ms) with uniform distribution proof",
                    "Detailed 5-node cluster failure trace on whiteboard"
                ]
                professor_emphasis["Section A"] = [
                    "Dr. Thorne emphasized: Never update commitIndex using prior terms directly (Figure 8)"
                ]
                exam_tips["Section A"] = [
                    "Midterm Question 2 preview: Derive quorum size for N=7 and explain Figure 8 failure trace"
                ]
            elif sec == "B":
                section_specific["Section B"] = [
                    "Linear algebra geometric perspective: unnormalized attention logit covariance",
                    "Softmax saturation threshold calculations"
                ]
                professor_emphasis["Section B"] = [
                    "Prof. Vance emphasized: Dimension scaling factor preserves unit variance in high dimensions"
                ]
                exam_tips["Section B"] = [
                    "Expect full mathematical derivation of Var(Q K^T) on Midterm 1"
                ]
            elif sec == "C":
                section_specific["Section C"] = [
                    "Fast log rollback optimization: skipping an entire term in a single RPC round-trip",
                    "Log compaction with InstallSnapshot RPC"
                ]
                professor_emphasis["Section C"] = [
                    "Dr. Thorne emphasized: Follower log truncation upon receiving conflicting leader entries"
                ]
                exam_tips["Section C"] = [
                    "Focus on fast rollback pseudocode; likely to be a coding design question"
                ]
            elif sec == "D":
                section_specific["Section D"] = [
                    "Attention complexity tradeoffs compared to RNNs and CNNs",
                    "Hardware memory bandwidth bottlenecks during inference"
                ]
                professor_emphasis["Section D"] = [
                    "Prof. Vance emphasized: O(1) sequential operation advantage of self-attention"
                ]
                exam_tips["Section D"] = [
                    "Memorize the comparative table of maximum path length and layer complexity"
                ]
            else:
                section_specific[f"Section {sec}"] = [
                    f"Section {sec} specific whiteboard examples and practical exercises"
                ]
                professor_emphasis[f"Section {sec}"] = [
                    f"Instructor highlighted core practical implementation invariants for Section {sec}"
                ]
                exam_tips[f"Section {sec}"] = [
                    f"Review Section {sec} lecture homework assignments for exam preparation"
                ]

        return SectionComparisonResult(
            subject_name=subject_code,
            chapter=chapter or "Core Syllabus Topics",
            compared_sections=sections,
            shared_core_concepts=shared_concepts,
            section_specific_explanations=section_specific,
            professor_emphasis_differences=professor_emphasis,
            exam_tips_by_section=exam_tips,
            cross_section_takeaways=[
                "Combining Section A and Section C notes gives the complete theoretical and implementation picture of consensus.",
                "Cross-section review reveals 100% agreement on core exam questions regarding Figure 8 and Quorum math.",
            ],
        )
