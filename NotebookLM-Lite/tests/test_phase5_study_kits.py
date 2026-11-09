"""Phase 5 Test Suite: LECTRA AI Study Kit & Exam Preparation Engine.

Verifies end-to-end functionality:
1. Grounded Study Kit generation from Master Notes.
2. Grounded MCQs with 4 options, explanations, topic tags, and source citations.
3. Interactive timed quiz scoring, database persistence in lectra_quiz_attempts, topic analytics, and retake history.
4. 3D Flashcard progress tracking (mastered vs needs review) and student progress persistence.
5. Practice question generation across 5 types and AI formative rubric evaluation with non-authoritative disclaimer.
6. Revision sheets (One-Page, Detailed, Last-Minute) and vector-printable PDF export.
7. Exam Priority Analysis with explicit visual/logical separation of lecture emphasis vs inferred priority.
8. Access control and CRUD operations (Create, Read, Update, Delete).
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.domain.lectra import StudyKit
from backend.infrastructure.repositories.lectra_repository import LectraRepository

client = TestClient(app)
repo = LectraRepository()


def test_seed_study_kits_exist_and_grounded():
    """Verify that seed study kits are pre-loaded in the database with complete Phase 5 fields."""
    response = client.get("/api/lectra/study-kits")
    assert response.status_code == 200
    kits = response.json()
    assert len(kits) >= 2, "Expected at least 2 seeded study kits"

    raft_kit = next((k for k in kits if "Raft" in k["title"] or k["lecture_id"] == "lec_raft_consensus_01"), None)
    assert raft_kit is not None, "Raft consensus study kit must exist"
    assert len(raft_kit["mcqs"]) >= 5
    assert len(raft_kit["flashcards"]) >= 5
    assert len(raft_kit["practice_questions"]) >= 5
    assert raft_kit["one_page_summary"] is not None
    assert raft_kit["detailed_summary"] is not None
    assert raft_kit["last_minute_summary"] is not None
    assert raft_kit["exam_priority_analysis"] is not None


def test_study_kit_generation_from_master_note():
    """Test generating a brand-new grounded study kit from an existing Master Note."""
    payload = {
        "lecture_id": "lec_attention_02",
        "kit_type": "exam_prep",
        "num_mcqs": 10,
        "difficulty": "hard",
        "user_id": "usr_lectra_default",
    }
    response = client.post("/api/lectra/study-kits/generate", json=payload)
    assert response.status_code == 200, response.text
    kit = response.json()

    # Verify Grounding & Metadata
    assert kit["lecture_id"] == "lec_attention_02"
    assert kit["kit_type"] == "exam_prep"
    assert kit["subject_code"] == "CS-224N"
    assert "Elena Vance" in kit["professor"]

    # Verify MCQs (10 grounded questions)
    assert len(kit["mcqs"]) == 10
    for q in kit["mcqs"]:
        assert len(q["options"]) == 4, "MCQ must contain exactly four options"
        assert 0 <= q["correct_option_index"] <= 3, "Correct option index must be between 0 and 3"
        assert len(q["explanation"]) > 10, "MCQ must contain a grounded explanation"
        assert q["topic_reference"], "MCQ must have a topic reference"
        assert q["source_reference"], "MCQ must include lecture source reference"

    # Verify Flashcards
    assert len(kit["flashcards"]) >= 5
    for fc in kit["flashcards"]:
        assert fc["question"] or fc["front"]
        assert fc["answer"] or fc["back"]
        assert fc["topic_tag"]

    # Verify Practice Questions (5 distinct categories)
    pqs = kit["practice_questions"]
    assert len(pqs) >= 5
    types = {pq["question_type"] for pq in pqs}
    expected_types = {"short_answer", "long_answer", "conceptual", "application", "formula"}
    assert types == expected_types, f"Expected all 5 question types, got {types}"

    # Verify 3 Revision Sheets
    assert "One-Page" in kit["one_page_summary"] or len(kit["one_page_summary"]) > 50
    assert "Detailed" in kit["detailed_summary"] or len(kit["detailed_summary"]) > 100
    assert "Last-Minute" in kit["last_minute_summary"] or len(kit["last_minute_summary"]) > 50

    # Verify Exam Priority Analysis
    epa = kit["exam_priority_analysis"]
    assert "lecture_emphasis_topics" in epa
    assert "cross_section_recurring_topics" in epa
    assert "critical_formulas" in epa
    assert "disclaimer" in epa
    assert "not exact future examination questions" in epa["disclaimer"]


def test_study_kit_crud_operations():
    """Test full CRUD: Create, Read, Update, and Delete with user ownership enforcement."""
    # 1. Create Kit from another Master Note
    create_payload = {
        "lecture_id": "lec_59a00f24e3",
        "kit_type": "quick_review",
        "num_mcqs": 5,
        "difficulty": "medium",
        "user_id": "usr_lectra_default",
    }
    create_res = client.post("/api/lectra/study-kits/generate", json=create_payload)
    assert create_res.status_code == 200
    created_kit = create_res.json()
    kit_id = created_kit["id"]

    # 2. Get Kit
    get_res = client.get(f"/api/lectra/study-kits/{kit_id}?user_id=usr_lectra_default")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == kit_id

    # 3. Update Kit
    update_payload = {
        "title": "Updated Midterm Cram Kit for CS-244",
        "key_takeaways": ["Takeaway 1: Safety", "Takeaway 2: Liveness", "Takeaway 3: Epochs"],
        "one_page_summary": "Updated condensed sheet text for testing.",
        "user_id": "usr_lectra_default",
    }
    update_res = client.put(f"/api/lectra/study-kits/{kit_id}", json=update_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()["study_kit"]
    assert updated_data["title"] == "Updated Midterm Cram Kit for CS-244"
    assert len(updated_data["key_takeaways"]) == 3

    # 4. Unauthorized Update Attempt (Must be rejected with 403)
    unauthorized_res = client.put(
        f"/api/lectra/study-kits/{kit_id}",
        json={"title": "Hacked Title", "user_id": "usr_unauthorized_attacker"},
    )
    assert unauthorized_res.status_code == 403, "Unauthorized update must fail with 403"

    # 5. Delete Kit
    del_res = client.delete(f"/api/lectra/study-kits/{kit_id}?user_id=usr_lectra_default")
    assert del_res.status_code == 200
    assert del_res.json()["id"] == kit_id

    # 6. Verify Kit is Deleted
    get_after_del = client.get(f"/api/lectra/study-kits/{kit_id}")
    assert get_after_del.status_code == 404


def test_quiz_attempt_persistence_and_scoring():
    """Test interactive quiz submission, automatic scoring, topic-wise breakdown, and database persistence."""
    lecture_id = "lec_raft_consensus_01"

    # Retrieve current kit to know correct answers
    kit_res = client.get(f"/api/lectra/study-kits/{lecture_id}")
    assert kit_res.status_code == 200
    kit = kit_res.json()
    mcqs = kit["mcqs"]
    assert len(mcqs) > 0

    # Submit quiz where all questions are answered correctly
    perfect_answers = {q["id"]: q["correct_option_index"] for q in mcqs}
    time_taken = 245  # 4m 5s

    submit_payload = {
        "answers": perfect_answers,
        "time_taken_seconds": time_taken,
        "user_id": "usr_lectra_default",
    }
    res = client.post(f"/api/lectra/study-kits/{lecture_id}/quiz-submit", json=submit_payload)
    assert res.status_code == 200
    result = res.json()

    assert result["score"] == len(mcqs)
    assert result["total"] == len(mcqs)
    assert result["percentage"] == 100.0
    assert result["passed"] is True
    assert result["time_taken_seconds"] == time_taken
    assert "attempt_id" in result
    assert "topic_performance" in result
    assert "detailed_breakdown" in result
    assert len(result["detailed_breakdown"]) == len(mcqs)

    # Verify attempt is persisted in database
    attempts_res = client.get(f"/api/lectra/study-kits/{lecture_id}/quiz-attempts?user_id=usr_lectra_default")
    assert attempts_res.status_code == 200
    attempts = attempts_res.json()
    assert len(attempts) >= 1
    latest_attempt = attempts[0]
    assert latest_attempt["score"] == len(mcqs)
    assert latest_attempt["passed"] is True

    # Verify StudentKitProgress was updated
    progress = result.get("progress")
    assert progress is not None
    assert progress["quizzes_taken"] >= 1
    assert progress["best_quiz_score"] == 100
    assert progress["last_quiz_score"] == 100


def test_flashcard_progress_persistence():
    """Test marking flashcards as 'mastered' or 'needs_review' and persisting to student progress."""
    kit_res = client.get("/api/lectra/study-kits/skit_raft_01")
    assert kit_res.status_code == 200
    kit = kit_res.json()
    flashcards = kit["flashcards"]
    assert len(flashcards) >= 2

    card_1 = flashcards[0]["id"]
    card_2 = flashcards[1]["id"]

    # Mark card 1 as mastered
    p1 = client.post(
        f"/api/lectra/study-kits/skit_raft_01/flashcards/{card_1}/progress",
        json={"status": "mastered", "user_id": "usr_lectra_default"},
    )
    assert p1.status_code == 200
    prog1 = p1.json()["progress"]
    assert prog1["cards_mastered"] >= 1

    # Mark card 2 as needs_review
    p2 = client.post(
        f"/api/lectra/study-kits/skit_raft_01/flashcards/{card_2}/progress",
        json={"status": "needs_review", "user_id": "usr_lectra_default"},
    )
    assert p2.status_code == 200
    prog2 = p2.json()["progress"]
    assert prog2["cards_needs_review"] >= 1


def test_practice_question_ai_formative_evaluation():
    """Test evaluating student practice question answers with AI formative feedback and disclaimer."""
    kit_res = client.get("/api/lectra/study-kits/skit_raft_01")
    assert kit_res.status_code == 200
    kit = kit_res.json()
    pqs = kit.get("practice_questions", [])
    assert len(pqs) > 0
    target_pq = pqs[0]

    # Test evaluation with comprehensive answer
    student_ans = (
        "In Raft, safety is guaranteed by the Log Matching Property: if two logs contain an entry with the same index "
        "and term, they store the same command and their logs are identical in all preceding entries. This is proved "
        "by induction on the log length."
    )
    eval_res = client.post(
        f"/api/lectra/study-kits/skit_raft_01/practice/evaluate",
        json={"question_id": target_pq["id"], "student_answer": student_ans},
    )
    assert eval_res.status_code == 200
    evaluation = eval_res.json()

    assert 0 <= evaluation["score"] <= 10
    assert len(evaluation["feedback"]) > 20
    assert len(evaluation["strengths"]) >= 1
    assert "missing_key_points" in evaluation
    assert evaluation["is_ai_generated"] is True

    # MANDATORY DISCLAIMER BADGE TEST
    assert "AI Formative Feedback (Not an authoritative instructor grade)" in evaluation["disclaimer"]


def test_practice_evaluation_empty_answer_rejected():
    """Test that empty or blank answers return a 400 bad request."""
    eval_res = client.post(
        f"/api/lectra/study-kits/skit_raft_01/practice/evaluate",
        json={"question_id": "pq_raft_1", "student_answer": "   "},
    )
    assert eval_res.status_code == 400


def test_revision_sheets_and_pdf_export():
    """Test downloading vector-printable revision sheets via the export endpoint."""
    kit_id = "skit_raft_01"

    for mode in ["one_page", "detailed", "last_minute", "all"]:
        res = client.get(f"/api/lectra/export/study-kit/pdf/{kit_id}?mode={mode}")
        assert res.status_code == 200
        assert "text/html" in res.headers["content-type"]
        html = res.text
        # Verify vector print styling and auto-print script
        assert "@media print" in html
        assert "window.print()" in html
        assert "LECTRA" in html
        assert "Raft Consensus" in html


def test_exam_priority_analysis_integrity():
    """Verify explicit logical separation of lecture-stated emphasis vs AI-inferred priority and disclaimer."""
    kit_res = client.get("/api/lectra/study-kits/skit_raft_01")
    assert kit_res.status_code == 200
    kit = kit_res.json()
    epa = kit["exam_priority_analysis"]

    # 1. Lecture Stated Emphasis
    lecture_topics = epa["lecture_emphasis_topics"]
    assert len(lecture_topics) >= 1
    for t in lecture_topics:
        assert t["is_lecturer_stated"] is True, "Must be flagged as stated by the lecturer"
        assert t["category"] == "lecture_emphasis"
        assert t["source_evidence"]

    # 2. AI Inferred Priority
    inferred_topics = epa["cross_section_recurring_topics"]
    assert len(inferred_topics) >= 1
    for t in inferred_topics:
        assert t["is_lecturer_stated"] is False, "Inferred topics must NOT claim to be lecture-stated"
        assert t["category"] == "cross_section_recurring"

    # 3. Mandatory Non-Predictive Disclaimer
    assert "Exam Priority Analysis reflects lecture coverage and syllabus weighting, not exact future examination questions." in epa["disclaimer"]

    # 4. Critical Formulas
    formulas = epa["critical_formulas"]
    assert len(formulas) >= 1
    for f in formulas:
        assert f["formula"]
        assert f["weight"]
        assert f["description"]
