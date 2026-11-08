import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.main import app
from backend.core.stellegent_dependencies import get_stellegent_repo, reset_stellegent_repo
from backend.infrastructure.repositories.stellegent_repository import StellegentRepository


@pytest.fixture
def client(tmp_path, monkeypatch):
    test_db = tmp_path / "stellegent_api_test.db"
    repo = StellegentRepository(test_db)
    monkeypatch.setattr("backend.core.stellegent_dependencies._stellegent_repo", repo)
    monkeypatch.setenv("STELLEGENT_DEV_MODE", "true")

    with TestClient(app) as test_client:
        yield test_client
    repo.close()
    reset_stellegent_repo()


def _create_sample_image_bytes() -> bytes:
    img = Image.new("RGB", (200, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_stellegent_auth_workflow(client: TestClient):
    # 1. Register
    reg_resp = client.post(
        "/api/auth/register",
        json={"email": "alice@stellegent.ai", "password": "password123", "full_name": "Alice Smith"},
    )
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert reg_data["email"] == "alice@stellegent.ai"
    token = reg_data["access_token"]

    # 2. Login
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "alice@stellegent.ai", "password": "password123"},
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # 3. Me
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["full_name"] == "Alice Smith"
    assert len(me_resp.json()["workspaces"]) >= 1


def test_stellegent_subject_and_lecture_workflow(client: TestClient):
    # Register & get auth token
    reg = client.post(
        "/api/auth/register",
        json={"email": "prof@stellegent.ai", "password": "securepassword", "full_name": "Professor X"},
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Subject
    subj_resp = client.post(
        "/api/subjects",
        headers=headers,
        json={
            "name": "Artificial Intelligence",
            "code": "CS480",
            "teacher": "Dr. Xavier",
            "semester": "Fall 2026",
            "description": "Foundations of AI and Neural Networks",
            "color": "#8b5cf6",
        },
    )
    assert subj_resp.status_code == 201
    subj_id = subj_resp.json()["id"]

    # 2. Upload Lecture with Whiteboard Photo
    img_bytes = _create_sample_image_bytes()
    upload_resp = client.post(
        "/api/lectures/upload",
        headers=headers,
        data={
            "title": "Neural Networks & Backpropagation",
            "subject_id": subj_id,
            "teacher": "Dr. Xavier",
            "semester": "Fall 2026",
            "lecture_date": "2026-10-20",
            "tags": "neural networks, deep learning, gradient descent",
            "mock_pipeline": "true",
        },
        files=[("files", ("whiteboard_neural_net.jpg", img_bytes, "image/jpeg"))],
    )
    assert upload_resp.status_code == 202
    upload_data = upload_resp.json()
    lecture_id = upload_data["lecture_id"]
    job_id = upload_data["job_id"]
    assert lecture_id is not None

    # 3. Check status
    status_resp = client.get(f"/api/lectures/{lecture_id}/status", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] in ["running", "completed"]

    # 4. Get lecture detail
    detail_resp = client.get(f"/api/lectures/{lecture_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["lecture"]["title"] != ""
    assert len(detail["pages"]) == 1

    # 5. Note Editing
    note_resp = client.put(
        f"/api/lectures/{lecture_id}/note",
        headers=headers,
        json={"summary": "Updated student revision summary for neural networks."},
    )
    assert note_resp.status_code == 200
    assert note_resp.json()["summary"] == "Updated student revision summary for neural networks."

    # 6. Diagram Regeneration
    regen_resp = client.post(
        f"/api/lectures/{lecture_id}/diagrams/regenerate",
        headers=headers,
        json={"diagram_type": "mind_map"},
    )
    assert regen_resp.status_code == 200
    assert regen_resp.json()["diagram_type"] == "mind_map"

    # 7. Ask Study Assistant with Grounded Citations
    chat_resp = client.post(
        "/api/study/chat",
        headers=headers,
        json={"message": "What did the teacher say about neural networks?", "lecture_id": lecture_id},
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert chat_data["content"] != ""
    assert len(chat_data["citations"]) >= 1
    assert chat_data["citations"][0]["lecture_id"] == lecture_id

    # 8. Flashcards review status update
    cards_resp = client.get("/api/study/flashcards", headers=headers)
    assert cards_resp.status_code == 200
    cards = cards_resp.json()
    if cards:
        card_id = cards[0]["id"]
        up_card = client.put(
            f"/api/study/flashcards/{card_id}",
            headers=headers,
            json={"review_status": "mastered"},
        )
        assert up_card.status_code == 200
        assert up_card.json()["review_status"] == "mastered"

    # 9. Timeline
    timeline_resp = client.get("/api/study/timeline", headers=headers)
    assert timeline_resp.status_code == 200
    assert len(timeline_resp.json()) >= 1

    # 10. Search across lectures
    search_resp = client.get("/api/study/search?q=neural", headers=headers)
    assert search_resp.status_code == 200
    assert len(search_resp.json()) >= 1

    # 11. Deletion and cleanup
    del_resp = client.delete(f"/api/lectures/{lecture_id}", headers=headers)
    assert del_resp.status_code == 204
    # Confirm lecture is gone
    get_del = client.get(f"/api/lectures/{lecture_id}", headers=headers)
    assert get_del.status_code == 404


def test_stellegent_cross_workspace_isolation_and_auth(client: TestClient):
    # Register User 1
    u1_reg = client.post(
        "/api/auth/register",
        json={"email": "user1@stellegent.ai", "password": "pass123user1", "full_name": "User One"},
    ).json()
    u1_token = u1_reg["access_token"]
    u1_headers = {"Authorization": f"Bearer {u1_token}"}

    # Register User 2
    u2_reg = client.post(
        "/api/auth/register",
        json={"email": "user2@stellegent.ai", "password": "pass123user2", "full_name": "User Two"},
    ).json()
    u2_token = u2_reg["access_token"]
    u2_headers = {"Authorization": f"Bearer {u2_token}"}

    # User 1 creates subject and lecture
    subj = client.post(
        "/api/subjects",
        headers=u1_headers,
        json={"name": "Confidential Research", "code": "CR999", "teacher": "Dr. Secret"},
    ).json()
    subj_id = subj["id"]

    img_bytes = _create_sample_image_bytes()
    up = client.post(
        "/api/lectures/upload",
        headers=u1_headers,
        data={"title": "Secret Lecture", "subject_id": subj_id, "mock_pipeline": "true"},
        files=[("files", ("secret_board.png", img_bytes, "image/png"))],
    ).json()
    lecture_id = up["lecture_id"]

    # User 2 tries to access User 1's lecture -> should be 404 or 403 (unauthorized/not found in workspace)
    u2_access = client.get(f"/api/lectures/{lecture_id}", headers=u2_headers)
    assert u2_access.status_code in [403, 404]

    # User 2 tries to delete User 1's lecture -> forbidden/not found
    u2_del = client.delete(f"/api/lectures/{lecture_id}", headers=u2_headers)
    assert u2_del.status_code in [403, 404]

    # Unauthenticated request with invalid token -> 401
    bad_auth = client.get(f"/api/lectures/{lecture_id}", headers={"Authorization": "Bearer totally_bogus_token"})
    assert bad_auth.status_code == 401


def test_stellegent_diagram_syntax_validation(tmp_path):
    from backend.core.services.multimodal_lecture_service import MultimodalLectureService
    test_db = tmp_path / "diagram_test.db"
    repo = StellegentRepository(test_db)
    service = MultimodalLectureService(repo=repo)

    # Valid flowchart
    valid_flowchart = "graph TD\n    A[Start] --> B{Condition}\n    B -->|Yes| C[End]"
    assert service.validate_mermaid_syntax(valid_flowchart) is True

    # Valid mind map
    valid_mindmap = "mindmap\n  root((Topic))\n    Subtopic\n      Detail"
    assert service.validate_mermaid_syntax(valid_mindmap) is True

    # Invalid syntax (missing type header)
    invalid_code = "A --> B --> C"
    assert service.validate_mermaid_syntax(invalid_code) is False

    # Empty code
    assert service.validate_mermaid_syntax("") is False

    repo.close()



