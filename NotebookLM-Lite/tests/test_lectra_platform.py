"""Tests for LECTRA Academic Collaboration Platform & Phase 3 AI Master Notes Engine."""

import io
import zipfile
from pathlib import Path
import pytest
from PIL import Image, ImageDraw
from pptx import Presentation
from fastapi.testclient import TestClient

from backend.main import app
from backend.core.services.image_preprocessor import ImagePreprocessor

client = TestClient(app)


def _create_whiteboard_image_bytes(fmt: str = "PNG") -> bytes:
    """Creates a realistic synthetic classroom whiteboard image with a dark border and board strokes."""
    img = Image.new("RGB", (480, 320), color=(35, 42, 52))
    draw = ImageDraw.Draw(img)
    # Draw white board interior
    draw.rectangle([24, 20, 456, 300], fill=(246, 248, 252), outline=(90, 100, 120), width=3)
    # Simulated marker strokes (headings, equations, diagram boxes)
    draw.line([50, 55, 320, 55], fill=(20, 40, 140), width=4)
    draw.line([50, 95, 260, 95], fill=(30, 30, 30), width=3)
    draw.line([50, 130, 280, 130], fill=(30, 30, 30), width=3)
    draw.rectangle([300, 85, 430, 165], outline=(180, 40, 40), width=3)
    draw.rectangle([300, 195, 430, 265], outline=(20, 130, 80), width=3)
    draw.line([365, 165, 365, 195], fill=(20, 40, 140), width=3)

    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def _create_pptx_bytes() -> bytes:
    """Creates a real in-memory PPTX presentation with title, bullets, table, and speaker notes."""
    prs = Presentation()
    slide_layout = prs.slide_layouts[1]
    slide = prs.slides.add_slide(slide_layout)
    slide.shapes.title.text = "Chapter 4: Distributed Consensus & Quorum Invariants"
    slide.placeholders[1].text = (
        "Definition: Safety Invariant - No two nodes commit conflicting values in the same epoch.\n"
        "Formula: Q = floor(N/2) + 1"
    )
    # Add speaker notes
    notes_slide = slide.notes_slide
    notes_slide.notes_text_frame.text = "Emphasize the midterm induction step and Figure 8 commitment rule."

    # Add a second slide with a table
    slide2 = prs.slides.add_slide(prs.slide_layouts[5])
    slide2.shapes.title.text = "Operating Mode Comparison Table"
    table_shape = slide2.shapes.add_table(2, 2, 100000, 150000, 4000000, 1000000)
    tbl = table_shape.table
    tbl.cell(0, 0).text = "Mode"
    tbl.cell(0, 1).text = "Complexity"
    tbl.cell(1, 0).text = "Normal Quorum"
    tbl.cell(1, 1).text = "O(1) Rounds"

    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()


def test_lectra_dashboard():
    response = client.get("/api/lectra/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert data["metrics"]["total_master_notes"] >= 2
    assert "subjects" in data
    assert len(data["subjects"]) >= 3
    assert "recent_master_notes" in data
    assert len(data["recent_master_notes"]) >= 2


def test_lectra_vault_and_filters():
    res = client.get("/api/lectra/vault")
    assert res.status_code == 200
    all_notes = res.json()["notes"]
    assert len(all_notes) >= 8

    res_a = client.get("/api/lectra/vault?section=A")
    assert res_a.status_code == 200
    notes_a = res_a.json()["notes"]
    assert all(n["section"] == "A" for n in notes_a)

    res_b = client.get("/api/lectra/vault?section=B")
    assert res_b.status_code == 200
    notes_b = res_b.json()["notes"]
    assert all(n["section"] == "B" for n in notes_b)


def test_lectra_cross_section_compare():
    res = client.get("/api/lectra/vault/compare?subject_code=CS-244&chapter=Consensus&sections=A,C")
    assert res.status_code == 200
    data = res.json()
    assert "compared_sections" in data
    assert "Section A" in data["section_specific_explanations"]
    assert "Section C" in data["section_specific_explanations"]


def test_lectra_professors():
    res = client.get("/api/lectra/professors")
    assert res.status_code == 200
    profs = res.json()
    assert len(profs) >= 3
    prof_names = [p["name"] for p in profs]
    assert "Dr. Aris Thorne" in prof_names
    assert "Prof. Elena Vance" in prof_names


def test_lectra_study_kit_and_quiz():
    res = client.get("/api/lectra/study-kits")
    assert res.status_code == 200
    kits = res.json()
    assert len(kits) >= 2
    first_kit = kits[0]

    quiz_payload = {
        "answers": {q["id"]: q["correct_option_index"] for q in first_kit["mcqs"]},
        "time_taken_seconds": 45,
    }
    submit_res = client.post(f"/api/lectra/study-kits/{first_kit['lecture_id']}/quiz-submit", json=quiz_payload)
    assert submit_res.status_code == 200
    result = submit_res.json()
    assert result["score"] == len(first_kit["mcqs"])
    assert result["percentage"] == 100.0
    assert result["passed"] is True


def test_lectra_exports():
    res_notes = client.get("/api/lectra/notes")
    assert res_notes.status_code == 200
    notes = res_notes.json()
    assert len(notes) > 0
    first_lec_id = notes[0]["lecture_id"]

    res_md = client.get(f"/api/lectra/export/markdown/{first_lec_id}")
    assert res_md.status_code == 200
    assert "LECTRA" in res_md.text or "# " in res_md.text

    res_pdf = client.get(f"/api/lectra/export/pdf/{first_lec_id}")
    assert res_pdf.status_code == 200
    assert "LECTRA" in res_pdf.text
    assert "window.print()" in res_pdf.text


def test_phase3_image_preprocessing_and_board_detection(tmp_path: Path):
    img_bytes = _create_whiteboard_image_bytes("JPEG")
    src_file = tmp_path / "classroom_board.jpg"
    src_file.write_bytes(img_bytes)

    report = ImagePreprocessor.preprocess_whiteboard_image(src_file, tmp_path / "preprocessed")
    assert Path(report["preprocessed_path"]).exists()
    assert report["original_width"] == 480
    assert report["original_height"] == 320
    assert report["noise_reduction_applied"] is True
    assert report["contrast_factor"] >= 1.2
    assert 0.55 <= report["readability_score"] <= 0.99
    assert len(report["detected_subregions"]) == 4


def test_phase3_file_validation_and_security():
    # Reject unsupported file extension (.exe)
    bad_files = [("files", ("malware.exe", b"MZ\x90\x00", "application/octet-stream"))]
    res_bad = client.post(
        "/api/lectra/studio/process",
        data={"title": "Invalid Upload Test"},
        files=bad_files,
    )
    assert res_bad.status_code == 400
    assert "Unsupported file format" in res_bad.json()["detail"]

    # Reject empty 0-byte file
    empty_files = [("files", ("empty_board.png", b"", "image/png"))]
    res_empty = client.post(
        "/api/lectra/studio/process",
        data={"title": "Empty Upload Test"},
        files=empty_files,
    )
    assert res_empty.status_code == 400
    assert "empty" in res_empty.json()["detail"].lower()


def test_phase3_end_to_end_9_step_workflow():
    """
    Tests the exact 9-step Phase 3 End-to-End Workflow:
    1. Login.
    2. Create a workspace.
    3. Upload a whiteboard photograph.
    4. Upload an official chapter PDF (and PPTX).
    5. Select professor, subject, section, and chapter.
    6. Generate Master Notes.
    7. Display the generated document (all 14 required sections + diagrams + sources).
    8. Edit and save notes (plus section regeneration & grounded Q&A).
    9. Export notes (PDF, DOCX, Markdown).
    """
    # STEP 1: Login
    login_res = client.post(
        "/api/lectra/auth/login",
        json={"email": "alex.rivera@stanford.edu", "password": "LectraPass2026!"},
    )
    assert login_res.status_code == 200
    logged_in_user = login_res.json()["user"]
    assert logged_in_user["email"] == "alex.rivera@stanford.edu"

    # STEP 2: Create a workspace (with associated course subject)
    ws_res = client.post(
        "/api/lectra/workspaces",
        json={
            "name": "Stanford CS-244 Fall 2026 Consensus Workspace",
            "university": "Stanford University",
            "department": "Computer Science & Engineering",
            "semester": "Fall 2026",
            "description": "End-to-end Phase 3 synthesis workspace",
            "subject_name": "Distributed Consensus & Fault Tolerance",
            "subject_code": "CS-244E",
            "professor_name": "Dr. Aris Thorne",
        },
    )
    assert ws_res.status_code == 200
    ws_data = ws_res.json()
    created_ws = ws_data["workspace"]
    created_subj = ws_data["subject"]
    assert created_ws["name"] == "Stanford CS-244 Fall 2026 Consensus Workspace"
    assert created_subj["code"] == "CS-244E"

    # STEP 3 & 4: Prepare Whiteboard Photograph (PNG/WEBP) + Official Chapter PDF + Professor PPTX
    whiteboard_png = _create_whiteboard_image_bytes("PNG")
    whiteboard_webp = _create_whiteboard_image_bytes("WEBP")
    official_pdf = (
        b"%PDF-1.4\n"
        b"Chapter 4: Distributed Consensus & State Machine Safety\n"
        b"Definition: Quorum Intersection - Any two majority sets share at least one overlapping node.\n"
        b"Section 4.2 Governing Bounds and Recovery Protocol."
    )
    official_pptx = _create_pptx_bytes()

    upload_files = [
        ("files", ("Classroom_Whiteboard_SecA.png", whiteboard_png, "image/png")),
        ("files", ("Board_SidePanel_SecC.webp", whiteboard_webp, "image/webp")),
        ("files", ("Official_Chapter4_Reference.pdf", official_pdf, "application/pdf")),
        ("files", ("Prof_Thorne_Chapter4_Slides.pptx", official_pptx, "application/vnd.openxmlformats-officedocument.presentationml.presentation")),
    ]

    # STEP 5 & 6: Select professor, subject, section, and chapter -> Generate Master Notes
    form_data = {
        "title": "Chapter 4 Master Notes: Distributed Consensus & Quorum Proofs",
        "subject_id": created_subj["id"],
        "chapter": "Chapter 4: Distributed Consensus & State Machine Safety",
        "professor_name": "Dr. Aris Thorne",
        "section": "A",
        "source_sections": "A,C",
        "generation_style": "comprehensive",
        "user_id": logged_in_user["id"],
        "user_name": logged_in_user["full_name"],
        "material_types": "whiteboard,whiteboard,reference_pdf,professor_slides",
    }

    proc_res = client.post("/api/lectra/studio/process", data=form_data, files=upload_files)
    assert proc_res.status_code == 202
    proc_json = proc_res.json()
    lecture_id = proc_json["lecture_id"]
    job_id = proc_json["job_id"]

    # Verify pipeline job completed all 10 stages
    status_res = client.get(f"/api/lectra/studio/status/{job_id}")
    assert status_res.status_code == 200
    job_data = status_res.json()
    assert job_data["status"] == "completed"
    assert job_data["progress"] == 100
    assert job_data["stage_index"] == 10
    assert job_data["total_stages"] == 10

    # STEP 7: Display the generated document and verify all 14 required sections + diagrams + sources
    note_res = client.get(f"/api/lectra/notes/{lecture_id}")
    assert note_res.status_code == 200
    bundle = note_res.json()
    note = bundle["note"]
    diagrams = bundle["diagrams"]
    sources = bundle["sources"]
    study_kit = bundle["study_kit"]

    # Verify all 14 required sections exist and are non-empty:
    assert note["title"] == "Chapter 4 Master Notes: Distributed Consensus & Quorum Proofs"  # 1. Chapter Title
    assert len(note["summary"]) > 20  # 2. Chapter Overview
    assert len(note["learning_objectives"]) >= 3  # 3. Learning Objectives
    assert len(note["sections"]) >= 3  # 4. Detailed Notes
    assert len(note["key_definitions"]) >= 2  # 5. Definitions
    assert len(note["important_formulas"]) >= 2  # 6. Important Formulas
    assert len(note["important_examples"]) >= 2  # 7. Professor's Examples
    assert len(note["tables"]) >= 2  # 8. Tables (from PPTX/Reference + Whiteboard)
    assert len(diagrams) >= 2  # 9. Diagrams (Mermaid + SVG + original image retention)
    assert len(note["exam_focused_concepts"]) >= 2  # 10. High-Priority Topics
    assert len(note["key_takeaways"]) >= 3  # 11. Key Takeaways
    assert len(note["exam_revision_summary"]) >= 3  # 12. Exam Revision Summary
    assert len(note["citations"]) >= 2  # 13. Source References
    assert len(note["needs_verification"]) >= 1  # 14. Uncertain Content & Source Conflicts
    assert len(note["uncertain_words"]) >= 1
    assert len(note["source_conflicts"]) >= 1

    # Verify Professor-Style Formatting analysis & non-imitation disclaimer
    assert note["professor_style"]["professor_name"] == "Dr. Aris Thorne"
    assert "not claim to perfectly imitate" in note["professor_style"]["style_disclaimer"]

    # Verify Smart Diagram Reconstruction (Mermaid + SVG + original whiteboard image URL)
    assert diagrams[0]["svg_code"] is not None and "<svg" in diagrams[0]["svg_code"]
    assert diagrams[0]["mermaid_code"] is not None
    assert diagrams[0]["original_image_url"] is not None

    # Verify protected source file endpoint serves the uploaded image
    first_source_id = sources[0]["id"]
    src_file_res = client.get(f"/api/lectra/sources/{first_source_id}/file")
    assert src_file_res.status_code == 200
    assert len(src_file_res.content) > 0

    # Verify Study Kit was also generated
    assert study_kit is not None
    assert len(study_kit["mcqs"]) >= 3

    # STEP 8: Edit and save notes + Regenerate section + Ask grounded question
    edited_md = note["ai_synthesized_markdown"] + "\n\n## Student Personal Annotation\nReviewed quorum proof for exam."
    edit_res = client.put(
        f"/api/lectra/notes/{lecture_id}",
        json={
            "title": "Chapter 4 Master Notes: Distributed Consensus (Edited & Verified)",
            "user_markdown_override": edited_md,
        },
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["note"]["title"] == "Chapter 4 Master Notes: Distributed Consensus (Edited & Verified)"
    assert "Student Personal Annotation" in edit_res.json()["note"]["user_markdown_override"]

    # Test Section Regeneration
    regen_res = client.post(
        f"/api/lectra/notes/{lecture_id}/regenerate-section",
        json={"section_index": 0, "instruction": "Emphasize inductive base case"},
    )
    assert regen_res.status_code == 200
    assert "Re-Synthesized Grounded Expansion" in regen_res.json()["note"]["sections"][0]["content"]

    # Test Source-Grounded Q&A
    ask_res = client.post(
        f"/api/lectra/notes/{lecture_id}/ask",
        json={"question": "What is the quorum formula and how are conflicts resolved?"},
    )
    assert ask_res.status_code == 200
    ask_data = ask_res.json()
    assert ask_data["grounded"] is True
    assert len(ask_data["answer"]) > 20
    assert len(ask_data["citations"]) >= 1

    # STEP 9: Export notes (PDF, DOCX, Markdown)
    pdf_export = client.get(f"/api/lectra/export/pdf/{lecture_id}")
    assert pdf_export.status_code == 200
    assert "window.print()" in pdf_export.text
    assert "14. Uncertain Content" in pdf_export.text

    docx_export = client.get(f"/api/lectra/export/docx/{lecture_id}")
    assert docx_export.status_code == 200
    assert docx_export.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    # Verify it is a valid OpenXML .docx ZIP archive containing word/document.xml
    with zipfile.ZipFile(io.BytesIO(docx_export.content), "r") as zf:
        assert "word/document.xml" in zf.namelist()
        xml_bytes = zf.read("word/document.xml")
        assert b"LECTRA MASTER NOTES" in xml_bytes

    md_export = client.get(f"/api/lectra/export/markdown/{lecture_id}")
    assert md_export.status_code == 200
    assert "Chapter 4" in md_export.text


def test_lectra_notebook_chat_lifecycle():
    """Validates the NotebookLM-inspired AI chatbot persistence, citation grounding, and conversation management."""
    # 1. List conversations (should include default or existing)
    list_res = client.get("/api/lectra/chat/conversations")
    assert list_res.status_code == 200
    convs = list_res.json()
    assert isinstance(convs, list)
    assert len(convs) >= 1

    # 2. Create a new notebook chat conversation
    create_res = client.post(
        "/api/lectra/chat/conversations",
        json={
            "title": "CS-244: Quorum Consensus Discussion",
            "subject_code": "CS-244",
            "lecture_id": "lec_consensus_01",
            "selected_source_ids": ["src_whiteboard_01", "src_paper_01"],
        },
    )
    assert create_res.status_code == 200
    new_conv = create_res.json()
    conv_id = new_conv["id"]
    assert new_conv["title"] == "CS-244: Quorum Consensus Discussion"
    assert new_conv["subject_code"] == "CS-244"
    assert "src_whiteboard_01" in new_conv["selected_source_ids"]

    # 3. Get single conversation
    get_res = client.get(f"/api/lectra/chat/conversations/{conv_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == conv_id

    # 4. Send a message to get grounded answer with citations & follow-ups
    msg_res = client.post(
        f"/api/lectra/chat/conversations/{conv_id}/messages",
        json={
            "message": "Explain the safety invariant and quorum formula from the whiteboard.",
            "selected_source_ids": ["src_whiteboard_01"],
            "lecture_id": "lec_consensus_01",
        },
    )
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert msg_data["conversation_id"] == conv_id
    user_msg = msg_data["user_message"]
    ai_msg = msg_data["assistant_message"]
    assert user_msg["role"] == "user"
    assert ai_msg["role"] == "assistant"
    assert len(ai_msg["content"]) > 10
    assert len(ai_msg["citations"]) >= 1
    assert len(ai_msg["suggested_questions"]) >= 1

    # 5. Rename / update conversation
    update_res = client.put(
        f"/api/lectra/chat/conversations/{conv_id}",
        json={"title": "CS-244: Quorum Consensus (Exam Prep)"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "CS-244: Quorum Consensus (Exam Prep)"

    # 6. Delete conversation
    del_res = client.delete(f"/api/lectra/chat/conversations/{conv_id}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

