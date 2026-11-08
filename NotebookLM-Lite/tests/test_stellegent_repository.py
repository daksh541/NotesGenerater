import pytest
from pathlib import Path
from backend.domain.stellegent import (
    User, Workspace, Subject, Lecture, LecturePage, SourceType,
    ExtractedContent, StructuredNote, DiagramArtifact, DiagramType,
    Flashcard, QuestionType, DifficultyLevel, ReviewStatus,
    CrossLectureConnection, ProcessingJob, ProcessingStatus, StudyChatMessage
)
from backend.infrastructure.repositories.stellegent_repository import StellegentRepository


def test_stellegent_repository_crud(tmp_path: Path):
    db_file = tmp_path / "test_stellegent.db"
    repo = StellegentRepository(db_file)

    # 1. User
    user = User(email="test@stellegent.ai", password_hash="hashed_pw", full_name="Student One")
    repo.create_user(user)
    fetched_user = repo.get_user_by_email("test@stellegent.ai")
    assert fetched_user is not None
    assert fetched_user.full_name == "Student One"

    # 2. Workspace
    ws = repo.get_or_create_default_workspace(user.id)
    assert ws.user_id == user.id

    # 3. Subject
    subject = Subject(workspace_id=ws.id, name="Computer Networks", code="CS301", teacher="Dr. Smith", semester="Fall 2026")
    repo.create_subject(subject)
    subjects = repo.list_subjects(ws.id)
    assert len(subjects) == 1
    assert subjects[0].name == "Computer Networks"

    # 4. Lecture
    lecture = Lecture(
        workspace_id=ws.id,
        subject_id=subject.id,
        user_id=user.id,
        title="Lecture 1: OSI Model & TCP/IP",
        teacher="Dr. Smith",
        semester="Fall 2026",
        lecture_date="2026-10-15",
        tags=["networking", "osi", "tcp"],
        status=ProcessingStatus.PENDING,
    )
    repo.create_lecture(lecture)
    lectures = repo.list_lectures(ws.id)
    assert len(lectures) == 1
    assert lectures[0].title == "Lecture 1: OSI Model & TCP/IP"

    # 5. Lecture Page
    page = LecturePage(
        lecture_id=lecture.id,
        page_number=1,
        file_path="/uploads/whiteboard_1.jpg",
        original_filename="whiteboard_1.jpg",
        source_type=SourceType.WHITEBOARD,
        file_size_bytes=1024,
    )
    repo.add_lecture_page(page)
    pages = repo.get_lecture_pages(lecture.id)
    assert len(pages) == 1
    assert pages[0].source_type == SourceType.WHITEBOARD

    # 6. Structured Note
    note = StructuredNote(
        lecture_id=lecture.id,
        title="OSI 7-Layer Architecture",
        summary="A thorough breakdown of the OSI stack.",
        original_transcription="Application, Presentation, Session, Transport, Network, Data Link, Physical",
        ai_organized_notes="1. Application\n2. Transport\n3. Network",
        ai_added_explanations="Detailed protocol examples for each layer",
        key_takeaways=["7 layers in OSI model", "TCP operates at Transport"],
    )
    repo.save_structured_note(note)
    fetched_note = repo.get_structured_note(lecture.id)
    assert fetched_note is not None
    assert fetched_note.title == "OSI 7-Layer Architecture"
    assert len(fetched_note.key_takeaways) == 2

    # 7. Diagram
    diagram = DiagramArtifact(
        lecture_id=lecture.id,
        diagram_type=DiagramType.FLOWCHART,
        title="Packet Flow Across Layers",
        mermaid_code="graph TD\n  A[App] --> B[Transport] --> C[Network]",
    )
    repo.save_diagram(diagram)
    diagrams = repo.get_diagrams(lecture.id)
    assert len(diagrams) == 1
    assert diagrams[0].diagram_type == DiagramType.FLOWCHART

    # 8. Flashcards
    card = Flashcard(
        lecture_id=lecture.id,
        question_type=QuestionType.QA,
        question="Which layer handles routing?",
        answer="Network Layer (Layer 3)",
        difficulty=DifficultyLevel.EASY,
        review_status=ReviewStatus.NEW,
    )
    repo.save_flashcards([card])
    cards = repo.list_flashcards(lecture_id=lecture.id)
    assert len(cards) == 1
    assert cards[0].question == "Which layer handles routing?"

    repo.update_flashcard_review(card.id, ReviewStatus.MASTERED)
    mastered = repo.list_flashcards(lecture_id=lecture.id, review_status="mastered")
    assert len(mastered) == 1

    # 9. Search
    search_res = repo.search_lectures(workspace_id=ws.id, query="OSI")
    assert len(search_res) == 1
    assert search_res[0]["lecture_title"] == "Lecture 1: OSI Model & TCP/IP"

    repo.close()
