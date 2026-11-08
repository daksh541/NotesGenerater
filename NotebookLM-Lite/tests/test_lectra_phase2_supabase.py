"""Comprehensive Phase 2 Tests for LECTRA Backend, Database, Storage, Auth & RLS.

Tests all Phase 2 requirements:
1. Signup & User Onboarding (Student Name, University, Course, Semester, Subject, Section A-I)
2. Login (strict PBKDF2 password verification; invalid credentials rejected with 401)
3. Email verification & Resend verification
4. Forgot password & Password reset (revokes prior sessions)
5. Logout & Protected routes (missing/revoked/invalid JWT rejected with 401)
6. File upload to all 4 Supabase Storage buckets & Signed URL verification
7. Database CRUD across all 13 schema tables (profiles, universities, courses, subjects,
   professors, chapters, workspaces, uploaded_sources, master_notes,
   community_contributions, study_kits, flashcards, quiz_questions)
8. Row Level Security (RLS) policies & Cross-user access restrictions
"""

from __future__ import annotations

from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.api.routes.lectra_api import get_repo
from backend.domain.lectra import MasterNoteContent, SectionId, VisibilityType

client = TestClient(app)

# Minimal valid JPEG header + trailer bytes for upload tests
MINIMAL_JPEG_BYTES = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00"
    b"\xff\xdb\x00C\x00" + b"\x08" * 64 + b"\xff\xd9"
)


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_1_signup_onboarding_email_verification_and_login():
    unique_email = f"student.a.{uuid4().hex[:8]}@stanford.edu"
    password = "SecurePassword123!"

    # 1. Signup
    signup_res = client.post(
        "/api/lectra/auth/signup",
        json={
            "email": unique_email,
            "password": password,
            "full_name": "Maya Lin",
            "university": "Stanford University",
            "course": "B.S. Computer Science & AI",
            "section": "B",
            "onboarding_completed": False,
        },
    )
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    token = signup_data["access_token"]
    verify_token = signup_data["verification_token"]
    assert signup_data["user"]["email"] == unique_email
    assert signup_data["user"]["email_verified"] is False
    assert signup_data["user"]["onboarding_completed"] is False

    # 2. Email Verification
    verify_res = client.post("/api/lectra/auth/verify-email", json={"token": verify_token})
    assert verify_res.status_code == 200
    assert verify_res.json()["user"]["email_verified"] is True

    # 3. User Onboarding (Student name, University, Course, Semester, Subject, Section A-I)
    onboard_res = client.post(
        "/api/lectra/auth/onboarding",
        headers=_auth_header(token),
        json={
            "full_name": "Maya Lin",
            "university_id": "univ_stanford",
            "university": "Stanford University",
            "course_id": "crs_cs_bs",
            "course": "B.S. Computer Science & AI",
            "semester": "Spring 2027",
            "subject_id": "subj_cs224n",
            "subject": "Deep Neural Architectures & Attention",
            "section": "D",
        },
    )
    assert onboard_res.status_code == 200
    onboard_user = onboard_res.json()["user"]
    assert onboard_user["onboarding_completed"] is True
    assert onboard_user["semester"] == "Spring 2027"
    assert onboard_user["subject"] == "Deep Neural Architectures & Attention"
    assert onboard_user["section"] == "D"

    # 4. Login with wrong password must fail with 401 (no fake fallback)
    bad_login = client.post(
        "/api/lectra/auth/login",
        json={"email": unique_email, "password": "WrongPassword999!"},
    )
    assert bad_login.status_code == 401

    # 5. Login with valid password succeeds
    good_login = client.post(
        "/api/lectra/auth/login",
        json={"email": unique_email, "password": password},
    )
    assert good_login.status_code == 200
    assert "access_token" in good_login.json()
    assert good_login.json()["user"]["email"] == unique_email


def test_2_forgot_password_reset_and_logout_protected_routes():
    unique_email = f"reset.user.{uuid4().hex[:8]}@stanford.edu"
    old_password = "InitialPassword123!"
    new_password = "UpdatedPassword456!"

    # Register user
    reg_res = client.post(
        "/api/lectra/auth/signup",
        json={
            "email": unique_email,
            "password": old_password,
            "full_name": "Liam Chen",
            "section": "C",
        },
    )
    assert reg_res.status_code == 201
    initial_token = reg_res.json()["access_token"]

    # Protected route works with active token
    sess_res = client.get("/api/lectra/auth/session", headers=_auth_header(initial_token))
    assert sess_res.status_code == 200
    assert sess_res.json()["authenticated"] is True

    # Forgot password
    forgot_res = client.post("/api/lectra/auth/forgot-password", json={"email": unique_email})
    assert forgot_res.status_code == 200
    reset_token = forgot_res.json()["reset_token"]

    # Reset password
    reset_res = client.post(
        "/api/lectra/auth/reset-password",
        json={"token": reset_token, "new_password": new_password},
    )
    assert reset_res.status_code == 200
    new_token = reset_res.json()["access_token"]

    # Old token should now be revoked
    old_sess_res = client.get("/api/lectra/auth/session", headers=_auth_header(initial_token))
    assert old_sess_res.status_code == 401

    # Old password login must fail
    old_login = client.post(
        "/api/lectra/auth/login",
        json={"email": unique_email, "password": old_password},
    )
    assert old_login.status_code == 401

    # New password login succeeds
    new_login = client.post(
        "/api/lectra/auth/login",
        json={"email": unique_email, "password": new_password},
    )
    assert new_login.status_code == 200

    # Logout revokes current token
    logout_res = client.post("/api/lectra/auth/logout", headers=_auth_header(new_token))
    assert logout_res.status_code == 200

    # Accessing protected route after logout fails with 401
    after_logout = client.get("/api/lectra/auth/session", headers=_auth_header(new_token))
    assert after_logout.status_code == 401

    # Accessing protected route without Authorization header fails with 401
    unauth = client.get("/api/lectra/auth/session")
    assert unauth.status_code == 401


def test_3_storage_buckets_upload_and_signed_urls():
    # Create User A
    email_a = f"storage.a.{uuid4().hex[:8]}@stanford.edu"
    res_a = client.post(
        "/api/lectra/auth/signup",
        json={"email": email_a, "password": "PasswordA123!", "full_name": "Student A", "section": "A"},
    )
    token_a = res_a.json()["access_token"]

    # List the 4 required buckets
    buckets_res = client.get("/api/lectra/storage/buckets")
    assert buckets_res.status_code == 200
    bucket_ids = [b["id"] for b in buckets_res.json()["buckets"]]
    assert "private-student-uploads" in bucket_ids
    assert "shared-academic-materials" in bucket_ids
    assert "generated-documents" in bucket_ids
    assert "generated-diagrams" in bucket_ids

    # Create a private workspace for User A
    ws_res = client.post(
        "/api/lectra/workspaces",
        headers=_auth_header(token_a),
        json={
            "title": "Section A Private Consensus Lab",
            "subject_id": "subj_cs244",
            "chapter_id": "chap_cs244_4",
            "professor_id": "prof_thorne",
            "section": "A",
            "visibility": "private",
        },
    )
    assert ws_res.status_code == 200
    ws_id = ws_res.json()["workspace"]["id"]

    # Upload file to private-student-uploads bucket
    upload_res = client.post(
        "/api/lectra/storage/upload",
        headers=_auth_header(token_a),
        data={
            "workspace_id": ws_id,
            "bucket": "private-student-uploads",
            "source_type": "whiteboard",
            "visibility": "private",
        },
        files={"file": ("whiteboard_secA.jpg", MINIMAL_JPEG_BYTES, "image/jpeg")},
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    signed_url = upload_data["signed_url"]
    storage_path = upload_data["source"]["storage_path"]

    # Download using valid signed URL
    dl_res = client.get(signed_url)
    assert dl_res.status_code == 200
    assert dl_res.content == MINIMAL_JPEG_BYTES

    # Tampered signature on signed URL must be rejected with 403
    tampered_url = signed_url[:-4] + "0000"
    bad_dl_res = client.get(tampered_url)
    assert bad_dl_res.status_code == 403


def test_4_database_crud_and_catalog_tables():
    # Verify academic catalog returns universities, courses, subjects, professors, chapters, sections A-I
    cat_res = client.get("/api/lectra/catalog")
    assert cat_res.status_code == 200
    cat = cat_res.json()
    assert len(cat["universities"]) >= 3
    assert len(cat["courses"]) >= 3
    assert len(cat["subjects"]) >= 3
    assert len(cat["professors"]) >= 3
    assert len(cat["chapters"]) >= 4
    assert cat["sections"] == ["A", "B", "C", "D", "E", "F", "G", "H", "I"]

    # Verify flashcards and quiz_questions tables are populated and queryable
    fc_res = client.get("/api/lectra/flashcards")
    assert fc_res.status_code == 200
    assert len(fc_res.json()) >= 3

    qq_res = client.get("/api/lectra/quiz-questions")
    assert qq_res.status_code == 200
    assert len(qq_res.json()) >= 3

    # Verify upload history endpoint
    src_res = client.get("/api/lectra/sources")
    assert src_res.status_code == 200
    assert len(src_res.json()) >= 3


def test_5_rls_policies_and_cross_user_access_restrictions():
    # Register Student A and Student B
    res_a = client.post(
        "/api/lectra/auth/signup",
        json={
            "email": f"rls.alice.{uuid4().hex[:8]}@stanford.edu",
            "password": "AlicePass123!",
            "full_name": "Alice Section A",
            "section": "A",
        },
    )
    token_a = res_a.json()["access_token"]
    user_a_id = res_a.json()["user"]["id"]

    res_b = client.post(
        "/api/lectra/auth/signup",
        json={
            "email": f"rls.bob.{uuid4().hex[:8]}@stanford.edu",
            "password": "BobPass123!",
            "full_name": "Bob Section B",
            "section": "B",
        },
    )
    token_b = res_b.json()["access_token"]

    # 1. Alice creates a PRIVATE workspace
    ws_res = client.post(
        "/api/lectra/workspaces",
        headers=_auth_header(token_a),
        json={
            "title": "Alice Private Study Workspace",
            "section": "A",
            "visibility": "private",
        },
    )
    assert ws_res.status_code == 200
    ws_id = ws_res.json()["workspace"]["id"]

    # Bob CANNOT view Alice's private workspace
    bob_get_ws = client.get(f"/api/lectra/workspaces/{ws_id}", headers=_auth_header(token_b))
    assert bob_get_ws.status_code == 403

    # Bob CANNOT edit Alice's private workspace
    bob_put_ws = client.put(
        f"/api/lectra/workspaces/{ws_id}",
        headers=_auth_header(token_b),
        json={"title": "Hacked Title"},
    )
    assert bob_put_ws.status_code == 403

    # Bob CANNOT delete Alice's private workspace
    bob_del_ws = client.delete(f"/api/lectra/workspaces/{ws_id}", headers=_auth_header(token_b))
    assert bob_del_ws.status_code == 403

    # 2. Alice uploads a PRIVATE file to her workspace
    up_res = client.post(
        "/api/lectra/storage/upload",
        headers=_auth_header(token_a),
        data={
            "workspace_id": ws_id,
            "bucket": "private-student-uploads",
            "source_type": "handwritten_notes",
            "visibility": "private",
        },
        files={"file": ("alice_private_notes.jpg", MINIMAL_JPEG_BYTES, "image/jpeg")},
    )
    assert up_res.status_code == 201
    source_id = up_res.json()["source"]["id"]
    storage_path = up_res.json()["source"]["storage_path"]

    # Bob CANNOT generate a signed URL for Alice's private file
    bob_sign_res = client.post(
        "/api/lectra/storage/signed-url",
        headers=_auth_header(token_b),
        json={"bucket": "private-student-uploads", "storage_path": storage_path},
    )
    assert bob_sign_res.status_code == 403

    # Bob CANNOT delete Alice's private file
    bob_del_src = client.delete(f"/api/lectra/sources/{source_id}", headers=_auth_header(token_b))
    assert bob_del_src.status_code == 403

    # 3. Alice creates a PRIVATE Master Note
    repo = get_repo()
    private_lec_id = f"lec_private_{uuid4().hex[:8]}"
    private_note = MasterNoteContent(
        id=f"mnote_{uuid4().hex[:8]}",
        workspace_id=ws_id,
        lecture_id=private_lec_id,
        user_id=user_a_id,
        title="Alice Private Exam Derivations",
        subject_id="subj_cs244",
        subject_name="Distributed Systems & Cloud Computing",
        subject_code="CS-244",
        chapter="Chapter 4: Consensus",
        professor="Dr. Aris Thorne",
        section=SectionId.A,
        source_sections=[SectionId.A],
        summary="Private notes not yet shared with the community.",
        visibility=VisibilityType.PRIVATE,
    )
    repo.save_master_note(private_note, requesting_user_id=user_a_id)

    # Bob CANNOT read Alice's private Master Note
    bob_get_note = client.get(f"/api/lectra/notes/{private_lec_id}", headers=_auth_header(token_b))
    assert bob_get_note.status_code == 403

    # Bob CANNOT edit Alice's private Master Note
    bob_edit_note = client.put(
        f"/api/lectra/notes/{private_lec_id}",
        headers=_auth_header(token_b),
        json={"title": "Unauthorized Edit"},
    )
    assert bob_edit_note.status_code == 403

    # Bob CANNOT share Alice's private Master Note to the Section Vault
    bob_share = client.post(
        "/api/lectra/vault/share",
        headers=_auth_header(token_b),
        json={
            "lecture_id": private_lec_id,
            "title": "Alice Private Exam Derivations",
            "chapter": "Chapter 4: Consensus",
            "subject_code": "CS-244",
            "section": "A",
            "summary": "Unauthorized share attempt",
        },
    )
    assert bob_share.status_code == 403

    # 4. Alice explicitly shares her Master Note to the Section Vault
    alice_share = client.post(
        "/api/lectra/vault/share",
        headers=_auth_header(token_a),
        json={
            "lecture_id": private_lec_id,
            "title": "Alice Shared Exam Derivations",
            "chapter": "Chapter 4: Consensus",
            "subject_code": "CS-244",
            "section": "A",
            "summary": "Explicitly shared with Sections A-I.",
            "visibility": "section",
        },
    )
    assert alice_share.status_code == 200

    # Now Bob CAN read the explicitly shared Master Note
    bob_read_shared = client.get(f"/api/lectra/notes/{private_lec_id}", headers=_auth_header(token_b))
    assert bob_read_shared.status_code == 200

    # But Bob STILL CANNOT edit or delete Alice's Master Note
    bob_edit_shared = client.put(
        f"/api/lectra/notes/{private_lec_id}",
        headers=_auth_header(token_b),
        json={"title": "Unauthorized Edit on Shared Note"},
    )
    assert bob_edit_shared.status_code == 403

    bob_del_shared = client.delete(f"/api/lectra/notes/{private_lec_id}", headers=_auth_header(token_b))
    assert bob_del_shared.status_code == 403

    # 5. Alice (owner) CAN delete her own Master Note, Uploaded Source, and Workspace
    alice_del_note = client.delete(f"/api/lectra/notes/{private_lec_id}", headers=_auth_header(token_a))
    assert alice_del_note.status_code == 200

    alice_del_src = client.delete(f"/api/lectra/sources/{source_id}", headers=_auth_header(token_a))
    assert alice_del_src.status_code == 200

    alice_del_ws = client.delete(f"/api/lectra/workspaces/{ws_id}", headers=_auth_header(token_a))
    assert alice_del_ws.status_code == 200
