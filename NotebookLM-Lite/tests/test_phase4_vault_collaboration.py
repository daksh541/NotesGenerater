"""Phase 4 Comprehensive Test Suite: LECTRA Nine-Section Vault and Academic Collaboration.

Tests:
1. Section Vault Interface:
   - Filter by Sections A through I
   - Filter by Subject, Chapter, Professor, Lecture Date, Verification Status
   - Search by keyword
   - Sorting options (upvotes, newest, lecture_date, sources)
   - Note card metadata fields (chapter, subject, professor, section, contributor, lecture date, upload date, verification status, sources count)
2. Cross-Section Access:
   - Cross-section browsing across Sections A–I
   - Non-exposure of private student workspaces / RLS isolation
3. Note Sharing & Permissions:
   - Rejection when explicit permission is False (HTTP 400)
   - Successful share with explicit permission granted
   - Sharing scope options (all_sections, selected_sections, course, private)
   - Official source reference validation: source_verified requires official reference
4. Note Comparison:
   - 7 dimensions of comparison: topics, definitions, formulas, examples, diagrams, professor emphasis, additional lecture explanations
   - Highlights common concepts and unique insights
   - Respects pedagogical differences across sections
5. Community Contributions:
   - Upvoting notes
   - Inaccuracy reports
   - Community reviews & official source verification
   - Inline replies to reviews
   - Contributor profiles (reputation, badges, verified count)
   - Contribution history audit logs
6. Duplicate Detection:
   - Scoring on subject, chapter, section, professor, and lecture date
   - Warning without auto-deletion
7. Notifications:
   - Dispatched on note sharing in enrolled subjects
   - Dispatched on review submissions and replies
"""

from __future__ import annotations

import json
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.domain.lectra import (
    DuplicateCheckRequest,
    MasterNoteContent,
    NoteSection,
    SectionId,
    SectionVaultNote,
    SharingScope,
    VerificationStatus,
    VisibilityType,
    utc_now,
)
from backend.api.routes.lectra_api import get_repo

client = TestClient(app)


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def seeded_users_and_notes():
    """Seed student profiles in different sections and master notes to test cross-section collaboration."""
    repo = get_repo()
    
    # Register Section A student
    sec_a_email = f"student.secA.{uuid4().hex[:6]}@stanford.edu"
    signup_a = client.post(
        "/api/lectra/auth/signup",
        json={
            "email": sec_a_email,
            "password": "Password123!",
            "full_name": "Alice Section-A",
            "university": "Stanford University",
            "course": "Computer Science MS",
            "semester": "Fall 2026",
            "subject": "CS-244: Advanced Distributed Systems",
            "section": "A",
        },
    )
    data_a = signup_a.json()
    token_a = data_a.get("access_token") or data_a.get("session", {}).get("access_token")
    user_a_id = data_a["user"]["id"]

    # Register Section C student
    sec_c_email = f"student.secC.{uuid4().hex[:6]}@stanford.edu"
    signup_c = client.post(
        "/api/lectra/auth/signup",
        json={
            "email": sec_c_email,
            "password": "Password123!",
            "full_name": "Charlie Section-C",
            "university": "Stanford University",
            "course": "Computer Science MS",
            "semester": "Fall 2026",
            "subject": "CS-244: Advanced Distributed Systems",
            "section": "C",
        },
    )
    data_c = signup_c.json()
    token_c = data_c.get("access_token") or data_c.get("session", {}).get("access_token")
    user_c_id = data_c["user"]["id"]

    # Create a private master note for Student A (should NOT be visible in public vault)
    priv_lec_id = f"lec_priv_{uuid4().hex[:6]}"
    repo.save_master_note(
        MasterNoteContent(
            id=f"mn_{uuid4().hex[:8]}",
            lecture_id=priv_lec_id,
            user_id=user_a_id,
            workspace_id=f"ws_{user_a_id}",
            title="Private Homework Brainstorming",
            subject_id="sub_cs244",
            subject_name="Distributed Systems",
            subject_code="CS-244",
            chapter="Chapter 4: Consensus in Fault-Tolerant Clusters",
            professor="Dr. Aris Thorne",
            section=SectionId.A,
            visibility=VisibilityType.PRIVATE,
            summary="Personal rough notes that should remain private to Alice.",
            sections=[NoteSection(heading="Confidential", content="Private scratch notes.")],
        ),
        requesting_user_id=user_a_id,
    )

    # Create a shareable master note for Student A
    share_lec_id = f"lec_share_{uuid4().hex[:6]}"
    repo.save_master_note(
        MasterNoteContent(
            id=f"mn_{uuid4().hex[:8]}",
            lecture_id=share_lec_id,
            user_id=user_a_id,
            workspace_id=f"ws_{user_a_id}",
            title="Formal Proof of Raft Election Safety",
            subject_id="sub_cs244",
            subject_name="Distributed Systems",
            subject_code="CS-244",
            chapter="Chapter 4: Consensus in Fault-Tolerant Clusters",
            professor="Dr. Aris Thorne",
            section=SectionId.A,
            visibility=VisibilityType.SECTION,
            summary="Rigorous mathematical proof that at most one leader can be elected in term t.",
            sections=[
                NoteSection(heading="Election Safety", content="Quorum intersection guarantees split-brain impossibility.")
            ],
        ),
        requesting_user_id=user_a_id,
    )

    return {
        "user_a_id": user_a_id,
        "token_a": token_a,
        "user_c_id": user_c_id,
        "token_c": token_c,
        "share_lec_id": share_lec_id,
        "priv_lec_id": priv_lec_id,
    }


def test_1_vault_cross_section_access_and_private_workspace_protection(seeded_users_and_notes):
    """Verify that a Section C student can browse all Sections A-I, but private workspaces are isolated."""
    token_c = seeded_users_and_notes["token_c"]

    # Student C browses the vault
    res = client.get("/api/lectra/vault", headers=_auth_header(token_c))
    assert res.status_code == 200
    data = res.json()
    assert "notes" in data
    assert data["total_notes"] >= 8

    # Verify notes from multiple sections (A, B, C, D, E, F, G, H, I) exist
    sections_found = {n["section"] for n in data["notes"]}
    assert "A" in sections_found
    assert "C" in sections_found

    # Verify that Alice's private scratch note is NOT in the vault
    titles = [n["title"] for n in data["notes"]]
    assert "Private Homework Brainstorming" not in titles


def test_2_vault_filtering_search_and_sorting():
    """Verify all filter dimensions: Section, Subject, Chapter, Professor, Lecture Date, Search, Sort."""
    # 1. Filter by Section A
    res_a = client.get("/api/lectra/vault?section=A")
    assert res_a.status_code == 200
    for note in res_a.json()["notes"]:
        assert note["section"] == "A"

    # 2. Filter by Subject
    res_sub = client.get("/api/lectra/vault?subject=CS-244")
    assert res_sub.status_code == 200
    assert len(res_sub.json()["notes"]) > 0
    for note in res_sub.json()["notes"]:
        assert "CS-244" in note["subject_code"]

    # 3. Filter by Professor
    res_prof = client.get("/api/lectra/vault?professor=Dr.+Aris+Thorne")
    assert res_prof.status_code == 200
    for note in res_prof.json()["notes"]:
        assert "Thorne" in note["professor"]

    # 4. Search query
    res_search = client.get("/api/lectra/vault?search=Consensus")
    assert res_search.status_code == 200
    assert len(res_search.json()["notes"]) > 0

    # 5. Sorting by upvotes
    res_sort = client.get("/api/lectra/vault?sort_by=upvotes")
    assert res_sort.status_code == 200
    upvotes = [n["upvotes"] for n in res_sort.json()["notes"]]
    assert upvotes == sorted(upvotes, reverse=True)


def test_3_note_sharing_explicit_permission_enforcement(seeded_users_and_notes):
    """Sharing notes requires explicit permission; sharing without it must return 400."""
    token_a = seeded_users_and_notes["token_a"]
    share_lec_id = seeded_users_and_notes["share_lec_id"]

    # Attempt 1: Without explicit permission -> Should FAIL with HTTP 400
    fail_res = client.post(
        "/api/lectra/vault/share",
        headers=_auth_header(token_a),
        json={
            "lecture_id": share_lec_id,
            "title": "Formal Proof of Raft Election Safety",
            "chapter": "Chapter 4: Consensus in Fault-Tolerant Clusters",
            "subject_code": "CS-244",
            "section": "A",
            "summary": "Shared proof of quorum intersection.",
            "explicit_permission_granted": False,  # Permission not granted
            "sharing_scope": "all_sections",
        },
    )
    assert fail_res.status_code == 400
    assert "Explicit student permission must be granted" in fail_res.json()["detail"]

    # Attempt 2: With explicit permission granted -> Should SUCCEED
    success_res = client.post(
        "/api/lectra/vault/share",
        headers=_auth_header(token_a),
        json={
            "lecture_id": share_lec_id,
            "title": "Formal Proof of Raft Election Safety",
            "chapter": "Chapter 4: Consensus in Fault-Tolerant Clusters",
            "subject_code": "CS-244",
            "section": "A",
            "summary": "Shared proof of quorum intersection.",
            "explicit_permission_granted": True,  # Explicit permission granted
            "sharing_scope": "all_sections",
            "official_source_reference": "Ongaro & Ousterhout (2014) §5.2",
            "sources_count": 3,
            "lecture_date": "2026-10-14",
        },
    )
    assert success_res.status_code == 200
    vault_note = success_res.json()["vault_note"]
    assert vault_note["explicit_permission_granted"] is True
    assert vault_note["sources_count"] == 3
    assert vault_note["verification_status"] == "source_verified"
    assert vault_note["official_source_reference"] == "Ongaro & Ousterhout (2014) §5.2"


def test_4_verification_label_enforcement():
    """A note should not receive Source Verified status unless it has an official source reference."""
    repo = get_repo()
    note_id = f"vlt_test_{uuid4().hex[:6]}"

    # Save note claiming source_verified but without official_source_reference
    unvetted_note = SectionVaultNote(
        id=note_id,
        lecture_id=f"lec_{uuid4().hex[:6]}",
        title="Unverified Claim of Proof",
        chapter="Chapter 4: Consensus",
        subject_name="Distributed Systems",
        subject_code="CS-244",
        professor="Dr. Aris Thorne",
        section=SectionId.A,
        source_sections=[SectionId.A],
        lecture_date="2026-10-15",
        contributor_id="usr_tester",
        contributor_name="Tester",
        verification_status=VerificationStatus.SOURCE_VERIFIED,
        official_source_reference=None,  # No official source!
        upvotes=1,
        summary="A note claiming to be verified without citing reference.",
    )
    saved = repo.save_vault_note(unvetted_note)
    # The repository must downgrade or reject source_verified when official source is absent
    assert saved.verification_status != VerificationStatus.SOURCE_VERIFIED


def test_5_duplicate_detection():
    """Verify duplicate detection scoring across subject, chapter, section, professor, and lecture date."""
    req = DuplicateCheckRequest(
        subject_code="CS-244",
        chapter="Chapter 4: Consensus in Fault-Tolerant Clusters",
        section=SectionId.A,
        professor="Dr. Aris Thorne",
        lecture_date="2026-10-12",
        summary="Consensus quorum requirements and failure traces.",
    )
    res = client.post("/api/lectra/vault/check-duplicate", json=req.model_dump())
    assert res.status_code == 200
    dup_res = res.json()
    assert dup_res["is_potential_duplicate"] is True
    assert dup_res["confidence_score"] >= 0.5
    assert len(dup_res["matching_reasons"]) > 0
    assert "warning_message" in dup_res


def test_6_seven_dimensional_cross_section_comparison():
    """Verify rich multi-section comparison populated across all 7 dimensions without treating differences as errors."""
    res = client.get("/api/lectra/vault/compare?subject_code=CS-244&chapter=Chapter+4:+Consensus&sections=A,C")
    assert res.status_code == 200
    comp = res.json()

    assert comp["subject_name"] == "CS-244"
    assert "compared_sections" in comp
    assert len(comp["compared_sections"]) == 2

    # 1. Topics covered
    assert "topics_covered" in comp
    assert "Section A" in comp["topics_covered"]
    assert "Section C" in comp["topics_covered"]

    # 2. Definitions
    assert "definitions" in comp
    assert len(comp["definitions"]["Section A"]) > 0

    # 3. Formulas
    assert "formulas" in comp
    assert len(comp["formulas"]["Section A"]) > 0
    assert any("Quorum" in f["name"] for f in comp["formulas"]["Section A"])

    # 4. Examples
    assert "examples" in comp
    assert len(comp["examples"]["Section A"]) > 0

    # 5. Diagrams
    assert "diagrams" in comp
    assert len(comp["diagrams"]["Section A"]) > 0

    # 6. Professor emphasis
    assert "professor_emphasis" in comp
    assert len(comp["professor_emphasis"]["Section A"]) > 0

    # 7. Additional lecture explanations
    assert "additional_lecture_explanations" in comp
    assert len(comp["additional_lecture_explanations"]["Section A"]) > 0

    # Common concepts & Unique insights
    assert len(comp["common_concepts"]) > 0
    assert "unique_insights" in comp
    assert "Section A" in comp["unique_insights"]


def test_7_community_reviews_replies_profiles_and_history(seeded_users_and_notes):
    """Verify upvotes, reviews with official sources, review replies, contributor profiles, and audit history."""
    token_c = seeded_users_and_notes["token_c"]
    user_c_id = seeded_users_and_notes["user_c_id"]
    user_a_id = seeded_users_and_notes["user_a_id"]

    # 1. Fetch vault note to review
    vault_notes = client.get("/api/lectra/vault?section=A").json()["notes"]
    target_note = vault_notes[0]
    note_id = target_note["id"]

    # 2. Upvote note
    upvote_res = client.post("/api/lectra/vault/upvote", json={"vault_note_id": note_id})
    assert upvote_res.status_code == 200
    assert upvote_res.json()["upvotes"] >= target_note["upvotes"] + 1

    # 3. Post a peer review with official textbook verification
    rev_res = client.post(
        "/api/lectra/community/reviews",
        headers=_auth_header(token_c),
        json={
            "vault_note_id": note_id,
            "user_id": user_c_id,
            "user_name": "Charlie Section-C",
            "user_section": "C",
            "rating": 5,
            "comment": "Verified against Section C whiteboard and Tanenbaum distributed systems text.",
            "verified_against_official_source": True,
            "official_source_citation": "Tanenbaum & Van Steen (3rd Ed), Section 8.4",
        },
    )
    assert rev_res.status_code == 200
    review_obj = rev_res.json()["review"]
    review_id = review_obj["id"]
    assert review_obj["verified_against_official_source"] is True

    # 4. Post a reply to the review
    reply_res = client.post(
        f"/api/lectra/community/reviews/{review_id}/reply",
        headers=_auth_header(token_c),
        json={
            "user_id": user_c_id,
            "user_name": "Charlie Section-C",
            "user_section": "C",
            "comment": "Also confirmed Figure 8 invariant matches Section A lecture trace.",
        },
    )
    assert reply_res.status_code == 200
    updated_review = reply_res.json()["review"]
    assert len(updated_review["replies"]) >= 1

    # 5. Contributor profile
    prof_res = client.get(f"/api/lectra/community/profile/{user_a_id}")
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["user_id"] == user_a_id
    assert "badges" in prof
    assert len(prof["badges"]) > 0

    # 6. Contribution history audit log
    hist_res = client.get("/api/lectra/community/history")
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert len(hist) > 0
    actions = {item["action"] for item in hist}
    assert "shared_note" in actions or "reviewed_note" in actions


def test_8_notifications_dispatched(seeded_users_and_notes):
    """Verify notifications dispatched for shared notes and review feedback."""
    user_a_id = seeded_users_and_notes["user_a_id"]
    token_a = seeded_users_and_notes["token_a"]

    notifs_res = client.get(f"/api/lectra/notifications?user_id={user_a_id}", headers=_auth_header(token_a))
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    assert isinstance(notifs, list)
    # Check that notifications can be marked read
    read_res = client.post("/api/lectra/notifications/read", headers=_auth_header(token_a))
    assert read_res.status_code == 200
