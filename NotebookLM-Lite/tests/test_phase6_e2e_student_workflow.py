"""PHASE 6: LECTRA End-to-End Student Workflow Test Suite.

Verifies the complete 21-step university student lifecycle:
1. Register a new student.
2. Complete academic onboarding.
3. Log in and persist the session.
4. Create a workspace.
5. Upload a whiteboard image.
6. Upload an official PDF or PPT.
7. Select professor, subject, chapter, and section.
8. Generate Master Notes.
9. Edit and save the notes.
10. Export notes as PDF, DOCX, and Markdown.
11. Share notes with explicit permission.
12. Browse the Section Vault.
13. Compare notes from multiple sections.
14. Create a Study Kit.
15. Attempt an MCQ quiz.
16. Complete a timed quiz.
17. Review quiz results.
18. Use flashcards and persist progress.
19. Evaluate a practice answer.
20. Log out and log back in.
21. Confirm saved data remains available.
"""

from __future__ import annotations

import io
from pathlib import Path
from uuid import uuid4
import pytest
from PIL import Image, ImageDraw
from pptx import Presentation
from fastapi.testclient import TestClient

from backend.main import app
from backend.domain.lectra import SectionId, SharingScope, VisibilityType

client = TestClient(app)


def _make_auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_test_whiteboard_bytes() -> bytes:
    """Creates a real in-memory classroom whiteboard JPEG image."""
    img = Image.new("RGB", (640, 480), color=(30, 40, 50))
    draw = ImageDraw.Draw(img)
    # Whiteboard frame & surface
    draw.rectangle([20, 20, 620, 460], fill=(245, 247, 250), outline=(100, 110, 130), width=4)
    # Simulated blackboard/whiteboard marker handwriting & diagrams
    draw.text((40, 40), "CS-244: Distributed Consensus (Raft)", fill=(15, 23, 42))
    draw.line([40, 70, 350, 70], fill=(79, 70, 229), width=3)
    draw.text((40, 90), "Invariants: Leader Append-Only, Election Safety", fill=(30, 41, 59))
    draw.text((40, 130), "Quorum Requirement: Q = floor(N/2) + 1", fill=(30, 41, 59))
    draw.rectangle([380, 80, 580, 180], outline=(225, 29, 72), width=3)
    draw.text((390, 95), "Log Replication State", fill=(225, 29, 72))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _create_test_pdf_bytes() -> bytes:
    """Creates a valid PDF binary buffer."""
    text_content = (
        "%PDF-1.4\n"
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        "3 0 obj << /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] >> endobj\n"
        "xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n"
        "trailer << /Size 4 /Root 1 0 R >>\nstartxref\n220\n%%EOF\n"
    )
    return text_content.encode("utf-8")


def _create_test_pptx_bytes() -> bytes:
    """Creates a valid PPTX binary presentation."""
    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    slide.shapes.title.text = "Chapter 4: Consensus in Fault-Tolerant Clusters"
    slide.placeholders[1].text = "Definition: Safety Invariant - No two leaders elected in same term.\nQuorum: floor(N/2)+1"
    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()


def test_complete_21_step_university_student_workflow():
    unique_suffix = uuid4().hex[:8]
    student_email = f"clara.oswald.{unique_suffix}@stanford.edu"
    student_password = "SecureAcademicPass2026!"
    student_name = "Clara Oswald"

    # =========================================================================
    # Step 1: Register a new student
    # =========================================================================
    reg_res = client.post(
        "/api/lectra/auth/register",
        json={
            "email": student_email,
            "password": student_password,
            "full_name": student_name,
            "university": "Stanford University",
            "course": "B.S. Computer Science & AI",
            "section": "A",
            "semester": "Fall 2026",
            "onboarding_completed": False,
        },
    )
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    reg_data = reg_res.json()
    student_id = reg_data["user"]["id"]
    initial_access_token = reg_data["access_token"]
    verification_token = reg_data.get("verification_token")
    assert reg_data["user"]["email"] == student_email
    assert reg_data["user"]["section"] == "A"

    # =========================================================================
    # Step 2: Complete academic onboarding
    # =========================================================================
    onboard_res = client.post(
        "/api/lectra/auth/onboarding",
        headers=_make_auth_header(initial_access_token),
        json={
            "full_name": student_name,
            "university_id": "univ_stanford",
            "university": "Stanford University",
            "course_id": "crs_cs_bs",
            "course": "B.S. Computer Science & AI",
            "semester": "Fall 2026",
            "subject_id": "subj_cs244",
            "subject": "Distributed Systems & Cloud Computing",
            "section": "A",
        },
    )
    assert onboard_res.status_code == 200, f"Onboarding failed: {onboard_res.text}"
    assert onboard_res.json()["user"]["onboarding_completed"] is True

    # =========================================================================
    # Step 3: Log in and persist the session
    # =========================================================================
    login_res = client.post(
        "/api/lectra/auth/login",
        json={"email": student_email, "password": student_password},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_data = login_res.json()
    access_token = login_data["access_token"]
    refresh_token = login_data["refresh_token"]
    auth_header = _make_auth_header(access_token)

    # Verify session persistence
    session_res = client.get("/api/lectra/auth/session", headers=auth_header)
    assert session_res.status_code == 200
    assert session_res.json()["authenticated"] is True
    assert session_res.json()["user"]["id"] == student_id

    # =========================================================================
    # Step 4: Create a workspace
    # =========================================================================
    ws_res = client.post(
        "/api/lectra/workspaces",
        headers=auth_header,
        json={
            "name": "CS244 - Consensus & State Machine Replication",
            "subject_id": "subj_cs244",
            "section": "A",
            "description": "Midterm preparation on Raft quorum algorithms.",
            "visibility": "private",
        },
    )
    assert ws_res.status_code == 200, f"Create workspace failed: {ws_res.text}"
    workspace = ws_res.json()["workspace"]
    workspace_id = workspace["id"]
    assert workspace["user_id"] == student_id

    # =========================================================================
    # Step 5: Upload a whiteboard image
    # =========================================================================
    whiteboard_bytes = _create_test_whiteboard_bytes()
    wb_res = client.post(
        "/api/lectra/storage/upload",
        headers=auth_header,
        data={
            "workspace_id": workspace_id,
            "bucket": "private-student-uploads",
            "source_type": "whiteboard",
            "visibility": "private",
        },
        files={
            "file": ("classroom_whiteboard_raft.jpg", whiteboard_bytes, "image/jpeg"),
        },
    )
    assert wb_res.status_code == 201, f"Whiteboard upload failed: {wb_res.text}"
    wb_source = wb_res.json()["source"]
    wb_source_id = wb_source["id"]
    wb_signed_url = wb_res.json()["signed_url"]
    assert "download" in wb_signed_url

    # =========================================================================
    # Step 6: Upload an official PDF or PPT
    # =========================================================================
    pdf_bytes = _create_test_pdf_bytes()
    pdf_res = client.post(
        "/api/lectra/storage/upload",
        headers=auth_header,
        data={
            "workspace_id": workspace_id,
            "bucket": "shared-academic-materials",
            "source_type": "reference_pdf",
            "visibility": "section",
        },
        files={
            "file": ("cs244_raft_official_reference.pdf", pdf_bytes, "application/pdf"),
        },
    )
    assert pdf_res.status_code == 201, f"PDF upload failed: {pdf_res.text}"
    pdf_source = pdf_res.json()["source"]
    pdf_source_id = pdf_source["id"]

    # =========================================================================
    # Step 7 & 8: Select professor, subject, chapter, section -> Generate Master Notes
    # =========================================================================
    process_res = client.post(
        "/api/lectra/studio/process",
        headers=auth_header,
        data={
            "title": "CS244 Raft Consensus & Quorum State Machines",
            "subject_id": "subj_cs244",
            "chapter": "Chapter 4: Consensus in Fault-Tolerant Clusters",
            "professor_name": "Dr. Aris Thorne",
            "section": "A",
            "source_sections": "A",
            "generation_style": "comprehensive",
            "material_types": "whiteboard,reference_pdf",
        },
        files=[
            ("files", ("classroom_whiteboard_raft.jpg", whiteboard_bytes, "image/jpeg")),
            ("files", ("cs244_raft_official_reference.pdf", pdf_bytes, "application/pdf")),
        ],
    )
    assert process_res.status_code == 202, f"Studio process failed: {process_res.text}"
    process_data = process_res.json()
    lecture_id = process_data["lecture_id"]
    job_id = process_data["job_id"]

    # Poll status until completed
    status_res = client.get(f"/api/lectra/studio/status/{job_id}")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "completed"

    # Fetch generated master note
    note_res = client.get(f"/api/lectra/notes/{lecture_id}", headers=auth_header)
    assert note_res.status_code == 200, f"Get note failed: {note_res.text}"
    note_data = note_res.json()
    assert note_data["note"]["title"] == "CS244 Raft Consensus & Quorum State Machines"
    assert note_data["note"]["user_id"] == student_id
    assert len(note_data["note"]["sections"]) > 0

    # =========================================================================
    # Step 9: Edit and save the notes
    # =========================================================================
    updated_title = "CS244 Raft Consensus (Student Annotations & Midterm Edits)"
    updated_markdown = "# CS244 Raft Consensus\n\nStudent verified proof of Election Safety."
    edit_res = client.put(
        f"/api/lectra/notes/{lecture_id}",
        headers=auth_header,
        json={
            "title": updated_title,
            "user_markdown_override": updated_markdown,
        },
    )
    assert edit_res.status_code == 200, f"Edit notes failed: {edit_res.text}"
    assert edit_res.json()["note"]["title"] == updated_title
    assert edit_res.json()["note"]["user_markdown_override"] == updated_markdown

    # =========================================================================
    # Step 10: Export notes as PDF, DOCX, and Markdown
    # =========================================================================
    # 10a. Markdown export
    md_res = client.get(f"/api/lectra/export/markdown/{lecture_id}")
    assert md_res.status_code == 200
    assert "CS244" in md_res.text

    # 10b. PDF export (printable styled HTML engine)
    pdf_export_res = client.get(f"/api/lectra/export/pdf/{lecture_id}")
    assert pdf_export_res.status_code == 200
    assert "<!DOCTYPE html>" in pdf_export_res.text

    # 10c. DOCX export
    docx_res = client.get(f"/api/lectra/export/docx/{lecture_id}")
    assert docx_res.status_code == 200
    assert len(docx_res.content) > 500  # Valid binary DOCX container

    # =========================================================================
    # Step 11: Share notes with explicit permission
    # =========================================================================
    # 11a: Test rejection without explicit permission
    rejected_share = client.post(
        "/api/lectra/vault/share",
        headers=auth_header,
        json={
            "lecture_id": lecture_id,
            "title": updated_title,
            "chapter": "Chapter 4: Consensus in Fault-Tolerant Clusters",
            "subject_code": "CS-244",
            "section": "A",
            "summary": "Verified Raft consensus notes for midterm.",
            "explicit_permission_granted": False,
        },
    )
    assert rejected_share.status_code == 400

    # 11b: Successful share with explicit permission
    share_res = client.post(
        "/api/lectra/vault/share",
        headers=auth_header,
        json={
            "lecture_id": lecture_id,
            "title": updated_title,
            "chapter": "Chapter 4: Consensus in Fault-Tolerant Clusters",
            "subject_code": "CS-244",
            "section": "A",
            "summary": "Verified Raft consensus notes for midterm.",
            "sharing_scope": "all_sections",
            "explicit_permission_granted": True,
            "official_source_reference": "Section 4.1 Raft Paper (Ongaro & Ousterhout)",
            "sources_count": 2,
        },
    )
    assert share_res.status_code == 200, f"Share failed: {share_res.text}"
    vault_note = share_res.json()["vault_note"]
    vault_id = vault_note["id"]
    assert vault_note["verification_status"] == "source_verified"

    # =========================================================================
    # Step 12: Browse the Section Vault
    # =========================================================================
    vault_browse_res = client.get("/api/lectra/vault?section=ALL", headers=auth_header)
    assert vault_browse_res.status_code == 200
    vault_list = vault_browse_res.json()["notes"]
    assert any(n["id"] == vault_id or n["lecture_id"] == lecture_id for n in vault_list)

    # =========================================================================
    # Step 13: Compare notes from multiple sections
    # =========================================================================
    compare_res = client.get(
        "/api/lectra/vault/compare?subject=CS-244&chapter=Chapter+4:+Consensus+in+Fault-Tolerant+Clusters&sections=A,C",
        headers=auth_header,
    )
    assert compare_res.status_code == 200, f"Compare failed: {compare_res.text}"
    comp_data = compare_res.json()
    assert "compared_sections" in comp_data
    assert "shared_core_concepts" in comp_data
    assert comp_data["compared_sections"] == ["A", "C"]

    # =========================================================================
    # Step 14: Create a Study Kit
    # =========================================================================
    kit_create_res = client.post(
        "/api/lectra/study-kits/generate",
        headers=auth_header,
        json={
            "lecture_id": lecture_id,
            "kit_type": "comprehensive",
            "num_mcqs": 5,
        },
    )
    assert kit_create_res.status_code == 200, f"Create study kit failed: {kit_create_res.text}"
    study_kit = kit_create_res.json()
    kit_id = study_kit["id"]
    assert len(study_kit["mcqs"]) >= 3
    assert len(study_kit["flashcards"]) >= 3

    # =========================================================================
    # Step 15 & 16: Attempt an MCQ quiz and complete a timed quiz
    # =========================================================================
    mcqs = study_kit["mcqs"]
    answers = {q["id"]: q["correct_option_index"] for q in mcqs}
    submit_res = client.post(
        f"/api/lectra/study-kits/{lecture_id}/quiz-submit",
        headers=auth_header,
        json={
            "answers": answers,
            "time_taken_seconds": 185,
        },
    )
    assert submit_res.status_code == 200, f"Quiz submit failed: {submit_res.text}"
    quiz_res_data = submit_res.json()
    assert quiz_res_data["percentage"] == 100.0
    assert quiz_res_data["passed"] is True

    # =========================================================================
    # Step 17: Review quiz results
    # =========================================================================
    attempts_res = client.get(
        f"/api/lectra/study-kits/{lecture_id}/quiz-attempts",
        headers=auth_header,
    )
    assert attempts_res.status_code == 200
    attempts_list = attempts_res.json()
    assert len(attempts_list) >= 1
    assert attempts_list[0]["score"] == len(mcqs)
    assert attempts_list[0]["passed"] is True

    # =========================================================================
    # Step 18: Use flashcards and persist progress
    # =========================================================================
    flashcard = study_kit["flashcards"][0]
    fc_prog_res = client.post(
        f"/api/lectra/study-kits/{kit_id}/flashcards/{flashcard['id']}/progress",
        headers=auth_header,
        json={"status": "mastered"},
    )
    assert fc_prog_res.status_code == 200, f"Flashcard progress failed: {fc_prog_res.text}"
    assert fc_prog_res.json()["progress"]["cards_mastered"] >= 1

    # =========================================================================
    # Step 19: Evaluate a practice answer
    # =========================================================================
    practice_q = study_kit["practice_questions"][0]
    eval_res = client.post(
        f"/api/lectra/study-kits/{kit_id}/practice/evaluate",
        headers=auth_header,
        json={
            "question_id": practice_q["id"],
            "student_answer": practice_q["model_answer"],
        },
    )
    assert eval_res.status_code == 200, f"Practice evaluation failed: {eval_res.text}"
    eval_data = eval_res.json()
    assert eval_data["score"] >= 8
    assert "feedback" in eval_data

    # =========================================================================
    # Step 20: Log out and log back in
    # =========================================================================
    # Logout
    logout_res = client.post("/api/lectra/auth/logout", headers=auth_header)
    assert logout_res.status_code == 200

    # Old token must now be rejected
    rejected_session = client.get("/api/lectra/auth/session", headers=auth_header)
    assert rejected_session.status_code == 401

    # Re-login with credentials
    relogin_res = client.post(
        "/api/lectra/auth/login",
        json={"email": student_email, "password": student_password},
    )
    assert relogin_res.status_code == 200
    new_token = relogin_res.json()["access_token"]
    new_auth_header = _make_auth_header(new_token)

    # =========================================================================
    # Step 21: Confirm saved data remains available
    # =========================================================================
    # Confirm workspace remains intact
    ws_confirm = client.get(f"/api/lectra/workspaces/{workspace_id}", headers=new_auth_header)
    assert ws_confirm.status_code == 200
    assert ws_confirm.json()["workspace"]["id"] == workspace_id

    # Confirm master note remains intact with edits
    note_confirm = client.get(f"/api/lectra/notes/{lecture_id}", headers=new_auth_header)
    assert note_confirm.status_code == 200
    assert note_confirm.json()["note"]["title"] == updated_title

    # Confirm study kit quiz attempts remain available
    attempts_confirm = client.get(
        f"/api/lectra/study-kits/{lecture_id}/quiz-attempts",
        headers=new_auth_header,
    )
    assert attempts_confirm.status_code == 200
    assert len(attempts_confirm.json()) >= 1
    assert attempts_confirm.json()[0]["percentage"] == 100.0

    # Confirm shared vault note remains available
    vault_confirm = client.get(f"/api/lectra/vault?subject=CS-244", headers=new_auth_header)
    assert vault_confirm.status_code == 200
    assert any(n["id"] == vault_id for n in vault_confirm.json()["notes"])
