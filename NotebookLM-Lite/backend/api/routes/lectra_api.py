"""LECTRA Full Platform API Routes.

Exposes RESTful endpoints for:
- Dashboard metrics and recent notes
- The Nine-Section Vault (Sections A-I) with cross-section comparisons and trust levels
- AI Notes Studio (Multi-source upload + 6-stage synthesis pipeline)
- Master Notes viewer, editor, and citations
- Smart digital diagrams with live Mermaid editing
- Comprehensive Study Kits (MCQs, Flashcards, Timed Practice Quiz, Revision Sheets)
- Professor Library with teaching styles and terminology
- Community contributions, upvoting, reporting, and reviews
- Authentic authentication and user profile management
- Document exports (PDF, DOCX, Markdown)
"""

from __future__ import annotations

import mimetypes
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field

from ...core.services.lectra_synthesis_service import LectraSynthesisService
from ...domain.lectra import (
    AuthSession,
    ChapterModel,
    CommunityReview,
    CourseModel,
    GenerationStyle,
    MasterNoteContent,
    NoteSection,
    NotificationItem,
    ProcessingPipelineJob,
    ProfessorProfile,
    SectionComparisonResult,
    SectionId,
    SectionVaultNote,
    SmartDiagram,
    SourceMaterialType,
    StorageBucketType,
    StudyKit,
    SubjectModel,
    UniversityModel,
    UploadedSourceItem,
    UserProfile,
    VerificationStatus,
    VisibilityType,
    WorkspaceModel,
    WorkspaceStatus,
    utc_now,
)
from ...infrastructure.repositories.lectra_repository import LectraRepository
from ...infrastructure.supabase_client import (
    create_jwt_token,
    decode_jwt_token,
    hash_password,
    realtime_broker,
    storage_manager,
    supabase_config,
    verify_password,
)

router = APIRouter(prefix="/lectra", tags=["LECTRA Academic Platform"])

_BASE_ROOT = Path(__file__).resolve().parents[3]
_DB_PATH = _BASE_ROOT / "data" / "lectra.db"
_UPLOAD_DIR = _BASE_ROOT / "uploads"
_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(_UPLOAD_DIR / "originals").mkdir(parents=True, exist_ok=True)
(_UPLOAD_DIR / "preprocessed").mkdir(parents=True, exist_ok=True)

_repo = LectraRepository(_DB_PATH)
_service = LectraSynthesisService(repo=_repo, upload_dir=_UPLOAD_DIR)


def get_repo() -> LectraRepository:
    return _repo


def get_service() -> LectraSynthesisService:
    return _service


def _issue_session_for_user(user: UserProfile, repo: LectraRepository) -> AuthSession:
    token_data = create_jwt_token(
        subject=user.id,
        email=user.email,
        section=user.section.value if hasattr(user.section, "value") else str(user.section),
        role=user.role,
    )
    repo.create_session(
        user_id=user.id,
        access_token=token_data["access_token"],
        refresh_token=token_data["refresh_token"],
        expires_at=token_data["expires_at"],
    )
    return AuthSession(
        access_token=token_data["access_token"],
        refresh_token=token_data["refresh_token"],
        expires_at=token_data["expires_at"],
        user=user,
    )


def get_optional_user(
    authorization: Optional[str] = Header(None),
    repo: LectraRepository = Depends(get_repo),
) -> Optional[UserProfile]:
    """Resolves Bearer JWT token if provided; raises 401 if provided token is invalid/expired/revoked."""
    if not authorization:
        return None
    parts = authorization.strip().split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header format. Expected 'Bearer <token>'.")
    token = parts[1].strip()
    try:
        payload = decode_jwt_token(token)
    except ValueError as err:
        raise HTTPException(status_code=401, detail=str(err))

    active_sess = repo.get_active_session(token)
    if not active_sess:
        raise HTTPException(status_code=401, detail="Session expired or revoked. Please log in again.")

    user = repo.get_user_by_id(payload.get("sub", ""))
    if not user:
        raise HTTPException(status_code=401, detail="Authenticated user record no longer exists.")
    return user


def get_current_user(
    user: Optional[UserProfile] = Depends(get_optional_user),
) -> UserProfile:
    """Strict protected route dependency requiring a valid active JWT session."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required to access this protected resource.")
    return user


# -------------------------------------------------------------------------
# Request / Response Models
# -------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    university_id: Optional[str] = "univ_stanford"
    university: str = "Stanford University"
    course_id: Optional[str] = "crs_cs_bs"
    course: str = "B.S. Computer Science & AI"
    subject_id: Optional[str] = "subj_cs244"
    subject: Optional[str] = "Distributed Systems & Cloud Computing"
    semester: str = "Fall 2026"
    section: SectionId = SectionId.A
    role: str = "student"
    onboarding_completed: bool = False


class OnboardingRequest(BaseModel):
    full_name: str
    university_id: Optional[str] = "univ_stanford"
    university: str
    course_id: Optional[str] = "crs_cs_bs"
    course: str
    semester: str
    subject_id: Optional[str] = "subj_cs244"
    subject: str
    section: SectionId = SectionId.A


class EmailVerificationRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class RefreshSessionRequest(BaseModel):
    refresh_token: str


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    university_id: Optional[str] = None
    university: Optional[str] = None
    course_id: Optional[str] = None
    course: Optional[str] = None
    subject_id: Optional[str] = None
    subject: Optional[str] = None
    semester: Optional[str] = None
    section: Optional[SectionId] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class UpdateMasterNoteRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    user_markdown_override: Optional[str] = None
    sections: Optional[List[NoteSection]] = None
    visibility: Optional[VisibilityType] = None


class RegenerateSectionRequest(BaseModel):
    section_index: int = 0
    instruction: Optional[str] = None


class AskSourceQuestionRequest(BaseModel):
    question: str


class CreateWorkspaceRequest(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    subject_id: Optional[str] = "subj_cs244"
    chapter_id: Optional[str] = "chap_cs244_4"
    professor_id: Optional[str] = "prof_thorne"
    section: SectionId = SectionId.A
    lecture_date: Optional[str] = None
    status: WorkspaceStatus = WorkspaceStatus.ACTIVE
    visibility: VisibilityType = VisibilityType.PRIVATE
    university: str = "Stanford University"
    department: str = "Computer Science & Engineering"
    semester: str = "Fall 2026"
    description: Optional[str] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    professor_name: Optional[str] = None


class UpdateWorkspaceRequest(BaseModel):
    title: Optional[str] = None
    name: Optional[str] = None
    subject_id: Optional[str] = None
    chapter_id: Optional[str] = None
    professor_id: Optional[str] = None
    section: Optional[SectionId] = None
    lecture_date: Optional[str] = None
    status: Optional[WorkspaceStatus] = None
    visibility: Optional[VisibilityType] = None
    description: Optional[str] = None


class SignedUrlRequest(BaseModel):
    bucket: StorageBucketType = StorageBucketType.PRIVATE_UPLOADS
    storage_path: str
    expires_in: int = Field(default=3600, ge=60, le=86400)


class CreateSubjectRequest(BaseModel):
    workspace_id: str = "ws_main"
    course_id: Optional[str] = "crs_cs_bs"
    name: str
    code: str
    teacher: str = "Dr. Aris Thorne"
    professor_id: Optional[str] = None
    semester: str = "Fall 2026"
    description: Optional[str] = None
    color: str = "#1E3A8A"


class UpdateDiagramRequest(BaseModel):
    title: Optional[str] = None
    mermaid_code: str
    diagram_type: Optional[str] = None


class QuizSubmissionRequest(BaseModel):
    answers: Dict[str, int]  # question_id -> selected_option_index
    time_taken_seconds: int = 0


class UpvoteRequest(BaseModel):
    vault_note_id: str


class ReportNoteRequest(BaseModel):
    vault_note_id: str
    reason: str
    reporter_name: str = "Student Peer"


class ReviewSubmissionRequest(BaseModel):
    vault_note_id: str
    user_id: str
    user_name: str
    user_section: SectionId
    rating: int = 5
    comment: str


class ShareVaultRequest(BaseModel):
    lecture_id: str
    title: str
    chapter: str
    subject_code: str
    section: SectionId
    summary: str
    visibility: VisibilityType = VisibilityType.SECTION


# -------------------------------------------------------------------------
# 1. Authentication, Onboarding & Profile Routes
# -------------------------------------------------------------------------
@router.post("/auth/signup", status_code=status.HTTP_201_CREATED)
@router.post("/auth/register", status_code=status.HTTP_200_OK)
def register(req: RegisterRequest, repo: LectraRepository = Depends(get_repo)):
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="A valid university email address is required.")
    if not req.password or len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    existing = repo.get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = UserProfile(
        email=req.email.lower().strip(),
        password_hash=hash_password(req.password),
        full_name=req.full_name.strip(),
        university_id=req.university_id,
        university=req.university,
        course_id=req.course_id,
        course=req.course,
        subject_id=req.subject_id,
        subject=req.subject,
        semester=req.semester,
        section=req.section,
        role=req.role,
        email_verified=False,
        onboarding_completed=req.onboarding_completed,
    )
    repo.save_user(new_user)
    verification_token = repo.create_email_verification_token(new_user.id, new_user.email)
    session = _issue_session_for_user(new_user, repo)

    return {
        "message": "Account created successfully. Please verify your email or complete onboarding.",
        "token": session.access_token,
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_at": session.expires_at,
        "verification_token": verification_token,
        "user": new_user,
    }


@router.post("/auth/login")
def login(req: LoginRequest, repo: LectraRepository = Depends(get_repo)):
    user = repo.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    session = _issue_session_for_user(user, repo)
    return {
        "message": "Login successful",
        "token": session.access_token,
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_at": session.expires_at,
        "user": user,
    }


@router.post("/auth/logout")
def logout(
    authorization: Optional[str] = Header(None),
    repo: LectraRepository = Depends(get_repo),
):
    if not authorization:
        raise HTTPException(status_code=401, detail="No active session token provided.")
    parts = authorization.strip().split(" ")
    token = parts[1].strip() if len(parts) == 2 else authorization.strip()
    revoked = repo.revoke_session(token)
    if not revoked:
        raise HTTPException(status_code=401, detail="Session already logged out or invalid.")
    return {"message": "Logged out successfully. Session invalidated."}


@router.get("/auth/session")
def get_active_session_info(current_user: UserProfile = Depends(get_current_user)):
    return {
        "authenticated": True,
        "user": current_user,
        "supabase_configured": supabase_config.is_configured,
    }


@router.post("/auth/refresh")
def refresh_session(req: RefreshSessionRequest, repo: LectraRepository = Depends(get_repo)):
    try:
        payload = decode_jwt_token(req.refresh_token)
    except ValueError as err:
        raise HTTPException(status_code=401, detail=str(err))
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Provided token is not a refresh token.")

    active = repo.get_active_session(req.refresh_token)
    if not active:
        raise HTTPException(status_code=401, detail="Refresh token has been revoked or expired.")

    user = repo.get_user_by_id(payload.get("sub", ""))
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    repo.revoke_session(req.refresh_token)
    session = _issue_session_for_user(user, repo)
    return {
        "message": "Session refreshed",
        "token": session.access_token,
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_at": session.expires_at,
        "user": user,
    }


@router.post("/auth/verify-email")
def verify_email(req: EmailVerificationRequest, repo: LectraRepository = Depends(get_repo)):
    user = repo.verify_email_token(req.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired email verification token.")
    return {
        "message": "Email verified successfully.",
        "user": user,
    }


@router.post("/auth/resend-verification")
def resend_verification(req: ResendVerificationRequest, repo: LectraRepository = Depends(get_repo)):
    user = repo.get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email address.")
    token = repo.create_email_verification_token(user.id, user.email)
    return {
        "message": "Verification email dispatched.",
        "verification_token": token,
    }


@router.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, repo: LectraRepository = Depends(get_repo)):
    user = repo.get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email address.")
    reset_token = repo.create_password_reset_token(user.id, user.email)
    return {
        "message": "Password reset instructions generated.",
        "reset_token": reset_token,
    }


@router.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, repo: LectraRepository = Depends(get_repo)):
    if not req.new_password or len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")
    updated_user = repo.consume_password_reset_token(req.token, hash_password(req.new_password))
    if not updated_user:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token.")
    session = _issue_session_for_user(updated_user, repo)
    return {
        "message": "Password reset successfully. Previous sessions have been revoked.",
        "token": session.access_token,
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_at": session.expires_at,
        "user": updated_user,
    }


@router.post("/auth/onboarding")
def complete_onboarding(
    req: OnboardingRequest,
    user_id: Optional[str] = Query(None),
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    target_uid = opt_user.id if opt_user else (user_id or "usr_lectra_default")
    user = repo.get_user_by_id(target_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.full_name = req.full_name.strip()
    user.university_id = req.university_id
    user.university = req.university
    user.course_id = req.course_id
    user.course = req.course
    user.semester = req.semester
    user.subject_id = req.subject_id
    user.subject = req.subject
    user.section = req.section
    user.onboarding_completed = True
    repo.save_user(user)

    # Automatically create a starter workspace for the onboarded student if they don't have one yet
    existing_ws = repo.list_workspaces(requesting_user_id=user.id, include_shared=False)
    if not existing_ws:
        starter_ws = WorkspaceModel(
            user_id=user.id,
            owner_id=user.id,
            subject_id=req.subject_id or "subj_cs244",
            chapter_id="chap_cs244_1",
            professor_id="prof_thorne",
            section=req.section,
            lecture_date=utc_now()[:10],
            title=f"{req.subject} — Section {req.section.value} Notebook",
            name=f"{req.subject} — Section {req.section.value} Notebook",
            status=WorkspaceStatus.ACTIVE,
            visibility=VisibilityType.PRIVATE,
            university=req.university,
            department=req.course,
            semester=req.semester,
            description=f"Personal workspace for {user.full_name} ({req.course}, {req.semester}, Section {req.section.value}).",
        )
        repo.save_workspace(starter_ws, requesting_user_id=user.id)

    return {
        "message": "Onboarding completed successfully.",
        "user": user,
    }


@router.get("/auth/profile")
def get_current_profile(
    user_id: Optional[str] = Query(None),
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    target_uid = opt_user.id if opt_user else (user_id or "usr_lectra_default")
    user = repo.get_user_by_id(target_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/auth/profile")
def update_profile(
    req: ProfileUpdateRequest,
    user_id: Optional[str] = Query(None),
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    target_uid = opt_user.id if opt_user else (user_id or "usr_lectra_default")
    if opt_user and user_id and opt_user.id != user_id:
        raise HTTPException(status_code=403, detail="RLS Policy Violation: Cannot modify another user's profile.")

    user = repo.get_user_by_id(target_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.full_name:
        user.full_name = req.full_name
    if req.university_id:
        user.university_id = req.university_id
    if req.university:
        user.university = req.university
    if req.course_id:
        user.course_id = req.course_id
    if req.course:
        user.course = req.course
    if req.subject_id:
        user.subject_id = req.subject_id
    if req.subject:
        user.subject = req.subject
    if req.semester:
        user.semester = req.semester
    if req.section:
        user.section = req.section
    if req.bio is not None:
        user.bio = req.bio
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url
    if req.onboarding_completed is not None:
        user.onboarding_completed = req.onboarding_completed

    repo.save_user(user)
    return {"message": "Profile updated", "user": user}


# -------------------------------------------------------------------------
# 2. Academic Catalog, Dashboard, Workspaces & Subjects Routes
# -------------------------------------------------------------------------
@router.get("/catalog")
def get_academic_catalog(
    university_id: Optional[str] = Query(None),
    course_id: Optional[str] = Query(None),
    subject_id: Optional[str] = Query(None),
    repo: LectraRepository = Depends(get_repo),
):
    return {
        "universities": repo.list_universities(),
        "courses": repo.list_courses(university_id=university_id),
        "subjects": repo.list_subjects(course_id=course_id),
        "professors": repo.list_professors(),
        "chapters": repo.list_chapters(subject_id=subject_id),
        "sections": [s.value for s in SectionId],
    }


@router.get("/dashboard")
def get_dashboard(
    section: Optional[str] = Query(None),
    subject_code: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    uid = opt_user.id if opt_user else None
    metrics = repo.get_dashboard_metrics(user_id=uid)
    subjects = repo.list_subjects()
    recent_notes = repo.list_master_notes(
        requesting_user_id=uid,
        subject_code=subject_code,
        section=section,
        search_query=search,
        include_shared=True,
    )[:8]
    professors = repo.list_professors()[:4]
    workspaces = repo.list_workspaces(
        requesting_user_id=uid,
        section=section,
        search_query=search,
        include_shared=True,
    )
    upload_history = repo.list_uploaded_sources(
        requesting_user_id=uid,
        search_query=search,
        include_shared=True,
    )[:12]

    return {
        "metrics": metrics,
        "subjects": subjects,
        "recent_master_notes": recent_notes,
        "professors": professors,
        "workspaces": workspaces,
        "upload_history": upload_history,
    }


@router.get("/workspaces")
def list_workspaces(
    subject_id: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    include_shared: bool = Query(True),
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    uid = opt_user.id if opt_user else None
    return repo.list_workspaces(
        requesting_user_id=uid,
        subject_id=subject_id,
        section=section,
        status_filter=status_filter,
        search_query=search,
        include_shared=include_shared,
    )


@router.get("/workspaces/{workspace_id}")
def get_workspace_detail(
    workspace_id: str,
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    uid = opt_user.id if opt_user else "usr_lectra_default"
    try:
        ws = repo.get_workspace(workspace_id, requesting_user_id=uid)
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    sources = repo.get_sources_for_lecture(workspace_id, requesting_user_id=uid)
    return {"workspace": ws, "sources": sources}


@router.post("/workspaces")
def create_workspace(
    req: CreateWorkspaceRequest,
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    uid = opt_user.id if opt_user else "usr_lectra_default"
    ws_title = req.title or req.name or "Untitled Lecture Workspace"
    ws = WorkspaceModel(
        user_id=uid,
        owner_id=uid,
        subject_id=req.subject_id,
        chapter_id=req.chapter_id,
        professor_id=req.professor_id,
        section=req.section,
        lecture_date=req.lecture_date or utc_now()[:10],
        title=ws_title,
        name=ws_title,
        status=req.status,
        visibility=req.visibility,
        university=req.university,
        department=req.department,
        semester=req.semester,
        description=req.description,
    )
    repo.save_workspace(ws, requesting_user_id=uid)

    created_subject: Optional[SubjectModel] = None
    if req.subject_name and req.subject_code:
        created_subject = SubjectModel(
            workspace_id=ws.id,
            name=req.subject_name,
            subject_name=req.subject_name,
            code=req.subject_code,
            subject_code=req.subject_code,
            teacher=req.professor_name or "Dr. Aris Thorne",
            semester=req.semester,
            description=req.description or f"Course workspace for {req.subject_name}",
        )
        repo.save_subject(created_subject)

    return {
        "message": "Workspace created successfully",
        "workspace": ws,
        "subject": created_subject,
    }


@router.put("/workspaces/{workspace_id}")
def update_workspace(
    workspace_id: str,
    req: UpdateWorkspaceRequest,
    current_user: UserProfile = Depends(get_current_user),
    repo: LectraRepository = Depends(get_repo),
):
    try:
        ws = repo.get_workspace(workspace_id, requesting_user_id=current_user.id)
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if ws.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="RLS Policy Violation: Users can only modify their own workspaces.")

    if req.title or req.name:
        new_title = req.title or req.name or ws.title
        ws.title = new_title
        ws.name = new_title
    if req.subject_id is not None:
        ws.subject_id = req.subject_id
    if req.chapter_id is not None:
        ws.chapter_id = req.chapter_id
    if req.professor_id is not None:
        ws.professor_id = req.professor_id
    if req.section is not None:
        ws.section = req.section
    if req.lecture_date is not None:
        ws.lecture_date = req.lecture_date
    if req.status is not None:
        ws.status = req.status
    if req.visibility is not None:
        ws.visibility = req.visibility
    if req.description is not None:
        ws.description = req.description

    try:
        repo.save_workspace(ws, requesting_user_id=current_user.id)
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    return {"message": "Workspace updated", "workspace": ws}


@router.delete("/workspaces/{workspace_id}")
def delete_workspace(
    workspace_id: str,
    current_user: UserProfile = Depends(get_current_user),
    repo: LectraRepository = Depends(get_repo),
):
    try:
        deleted = repo.delete_workspace(workspace_id, requesting_user_id=current_user.id)
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    if not deleted:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"message": "Workspace deleted successfully"}


@router.get("/subjects")
def list_subjects(course_id: Optional[str] = Query(None), repo: LectraRepository = Depends(get_repo)):
    return repo.list_subjects(course_id=course_id)


@router.post("/subjects")
def create_subject(req: CreateSubjectRequest, repo: LectraRepository = Depends(get_repo)):
    subj = SubjectModel(
        workspace_id=req.workspace_id,
        course_id=req.course_id,
        name=req.name,
        subject_name=req.name,
        code=req.code,
        subject_code=req.code,
        teacher=req.teacher,
        professor_id=req.professor_id,
        semester=req.semester,
        description=req.description,
        color=req.color,
    )
    repo.save_subject(subj)
    return {"message": "Subject created successfully", "subject": subj}


# -------------------------------------------------------------------------
# 2B. Supabase Storage Buckets, Signed URLs & Upload History
# -------------------------------------------------------------------------
@router.get("/storage/buckets")
def list_storage_buckets():
    return {
        "buckets": [
            {
                "id": StorageBucketType.PRIVATE_UPLOADS.value,
                "name": "Private Student Uploads",
                "public": False,
                "max_size_mb": 50,
            },
            {
                "id": StorageBucketType.SHARED_MATERIALS.value,
                "name": "Shared Academic Materials",
                "public": False,
                "max_size_mb": 50,
            },
            {
                "id": StorageBucketType.GENERATED_DOCUMENTS.value,
                "name": "Generated Documents",
                "public": False,
                "max_size_mb": 50,
            },
            {
                "id": StorageBucketType.GENERATED_DIAGRAMS.value,
                "name": "Generated Diagrams",
                "public": False,
                "max_size_mb": 20,
            },
        ]
    }


@router.post("/storage/upload", status_code=status.HTTP_201_CREATED)
async def upload_file_to_bucket(
    file: UploadFile = File(...),
    workspace_id: str = Form("ws_main"),
    bucket: StorageBucketType = Form(StorageBucketType.PRIVATE_UPLOADS),
    source_type: SourceMaterialType = Form(SourceMaterialType.WHITEBOARD),
    visibility: VisibilityType = Form(VisibilityType.PRIVATE),
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
    service: LectraSynthesisService = Depends(get_service),
):
    uid = opt_user.id if opt_user else "usr_lectra_default"
    safe_fname = service.sanitize_filename(file.filename or "uploaded_file.jpg")
    content = await file.read()

    is_valid, mime_type, err_msg = service.validate_uploaded_file(safe_fname, content)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # Check workspace ownership if uploading to a private workspace
    try:
        ws = repo.get_workspace(workspace_id, requesting_user_id=uid)
        if ws and ws.user_id != uid and ws.visibility == VisibilityType.PRIVATE:
            raise HTTPException(status_code=403, detail="RLS Policy Violation: Cannot upload files to another student's private workspace.")
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))

    try:
        upload_meta = storage_manager.upload_file(
            bucket=bucket.value,
            user_id=uid,
            workspace_id=workspace_id,
            filename=safe_fname,
            content=content,
            content_type=mime_type,
        )
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    effective_vis = VisibilityType.SECTION if bucket == StorageBucketType.SHARED_MATERIALS else visibility
    source_item = UploadedSourceItem(
        id=f"src_{uuid4().hex[:10]}",
        workspace_id=workspace_id,
        lecture_id=workspace_id,
        user_id=uid,
        file_name=safe_fname,
        original_filename=safe_fname,
        file_type=mime_type,
        mime_type=mime_type,
        storage_path=upload_meta["storage_path"],
        file_path=upload_meta["local_disk_path"],
        bucket_id=bucket,
        source_type=source_type,
        file_size_bytes=len(content),
        page_number=1,
        extracted_text_snippet=f"Stored in Supabase bucket '{bucket.value}' ({len(content)} bytes).",
        visibility=effective_vis,
    )
    repo.save_uploaded_source(source_item, requesting_user_id=uid)

    signed = storage_manager.create_signed_url(
        bucket=bucket.value,
        storage_path=upload_meta["storage_path"],
        requesting_user_id=uid,
        is_shared_authorized=(effective_vis != VisibilityType.PRIVATE),
    )

    return {
        "message": "File uploaded securely to Supabase Storage",
        "source": source_item,
        "signed_url": signed["signed_url"],
        "expires_at": signed["expires_at"],
    }


@router.post("/storage/signed-url")
def generate_signed_url(
    req: SignedUrlRequest,
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    uid = opt_user.id if opt_user else "usr_lectra_default"
    # Check if file is explicitly shared in DB
    is_shared = req.bucket == StorageBucketType.SHARED_MATERIALS
    for src in repo.list_uploaded_sources(include_shared=True):
        if src.storage_path == req.storage_path:
            if src.visibility in (VisibilityType.SECTION, VisibilityType.PUBLIC):
                is_shared = True
            break

    try:
        signed = storage_manager.create_signed_url(
            bucket=req.bucket.value,
            storage_path=req.storage_path,
            requesting_user_id=uid,
            expires_in=req.expires_in,
            is_shared_authorized=is_shared,
        )
        return signed
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.get("/storage/download/{bucket}/{storage_path:path}")
def download_via_signed_url(
    bucket: str,
    storage_path: str,
    uid: str = Query(..., description="User ID that signed the URL"),
    exp: int = Query(..., description="Expiration Unix timestamp"),
    sig: str = Query(..., description="HMAC-SHA256 signature"),
):
    if not storage_manager.verify_signed_url(bucket=bucket, storage_path=storage_path, uid=uid, exp=exp, sig=sig):
        raise HTTPException(status_code=403, detail="Invalid or expired signed URL signature.")

    try:
        target = storage_manager.read_file_path(
            bucket=bucket,
            storage_path=storage_path,
            requesting_user_id=uid,
            is_shared_authorized=True,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Stored object not found in bucket.")
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))

    guessed_mime, _ = mimetypes.guess_type(target.name)
    return FileResponse(path=str(target), media_type=guessed_mime or "application/octet-stream", filename=target.name)


@router.get("/sources")
def list_upload_history(
    workspace_id: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    bucket_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    include_shared: bool = Query(True),
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    uid = opt_user.id if opt_user else None
    return repo.list_uploaded_sources(
        requesting_user_id=uid,
        workspace_id=workspace_id,
        source_type=source_type,
        bucket_id=bucket_id,
        search_query=search,
        include_shared=include_shared,
    )


@router.delete("/sources/{source_id}")
def delete_uploaded_source(
    source_id: str,
    current_user: UserProfile = Depends(get_current_user),
    repo: LectraRepository = Depends(get_repo),
):
    try:
        src = repo.get_uploaded_source(source_id, requesting_user_id=current_user.id)
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    if not src:
        raise HTTPException(status_code=404, detail="Uploaded source not found")
    if src.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="RLS Policy Violation: Users can only delete their own private files.")

    try:
        storage_manager.delete_file(
            bucket=src.bucket_id.value if hasattr(src.bucket_id, "value") else str(src.bucket_id),
            storage_path=src.storage_path,
            requesting_user_id=current_user.id,
        )
    except Exception:
        pass

    repo.delete_uploaded_source(source_id, requesting_user_id=current_user.id)
    return {"message": "Uploaded source deleted"}


# -------------------------------------------------------------------------
# 3. AI Notes Studio (Upload, Validation, 10-Stage Pipeline & Retry)
# -------------------------------------------------------------------------
@router.post("/studio/process", status_code=status.HTTP_202_ACCEPTED)
async def process_lecture_upload(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    title: str = Form(...),
    subject_id: Optional[str] = Form(None),
    chapter: str = Form("Chapter 1: Foundations"),
    professor_name: str = Form("Dr. Aris Thorne"),
    section: SectionId = Form(SectionId.A),
    source_sections: str = Form("A"),
    generation_style: GenerationStyle = Form(GenerationStyle.COMPREHENSIVE),
    user_id: str = Form("usr_lectra_default"),
    user_name: str = Form("Alex Rivera"),
    material_types: Optional[str] = Form(None),
    repo: LectraRepository = Depends(get_repo),
    service: LectraSynthesisService = Depends(get_service),
):
    if not files:
        raise HTTPException(status_code=400, detail="At least one file must be uploaded")

    lecture_id = f"lec_{uuid4().hex[:10]}"
    job_id = f"job_{uuid4().hex[:10]}"

    parsed_sections: List[SectionId] = []
    for s in source_sections.split(","):
        clean_s = s.strip().upper()
        if clean_s in [sec.value for sec in SectionId]:
            parsed_sections.append(SectionId(clean_s))
    if not parsed_sections:
        parsed_sections = [section]

    explicit_types = [t.strip() for t in (material_types or "").split(",") if t.strip()]

    # Validate and save uploaded files to disk
    uploaded_files_info: List[tuple[str, Path, SourceMaterialType]] = []
    originals_dir = _UPLOAD_DIR / "originals"
    originals_dir.mkdir(parents=True, exist_ok=True)

    for idx, f in enumerate(files):
        safe_fname = service.sanitize_filename(f.filename or f"upload_{idx}.jpg")
        content = await f.read()

        is_valid, _, err_msg = service.validate_uploaded_file(safe_fname, content)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

        dest_path = originals_dir / f"{lecture_id}_{idx}_{safe_fname}"
        with open(dest_path, "wb") as out:
            out.write(content)

        # Categorize source type
        ext = dest_path.suffix.lower()
        if idx < len(explicit_types) and explicit_types[idx] in [m.value for m in SourceMaterialType]:
            stype = SourceMaterialType(explicit_types[idx])
        elif ext == ".pdf":
            stype = SourceMaterialType.SYLLABUS if "syllabus" in safe_fname.lower() else SourceMaterialType.REFERENCE_PDF
        elif ext in (".ppt", ".pptx"):
            stype = SourceMaterialType.PROFESSOR_SLIDES
        elif "blackboard" in safe_fname.lower():
            stype = SourceMaterialType.BLACKBOARD
        elif "hand" in safe_fname.lower() or "note" in safe_fname.lower():
            stype = SourceMaterialType.HANDWRITTEN_NOTES
        else:
            stype = SourceMaterialType.WHITEBOARD

        uploaded_files_info.append((safe_fname, dest_path, stype))

    # Initialize Job
    initial_job = ProcessingPipelineJob(
        id=job_id,
        lecture_id=lecture_id,
        stage_index=1,
        total_stages=10,
        stage_name="Upload Sources",
        progress=10,
        status="running",
        details=f"Received and validated {len(files)} source file(s). Starting 10-Stage AI Synthesis...",
    )
    repo.save_pipeline_job(initial_job)

    # Launch background task
    background_tasks.add_task(
        service.execute_six_stage_pipeline,
        lecture_id=lecture_id,
        job_id=job_id,
        title=title,
        subject_id=subject_id,
        chapter=chapter,
        professor_name=professor_name,
        section=section,
        source_sections=parsed_sections,
        generation_style=generation_style,
        uploaded_files=uploaded_files_info,
        user_id=user_id,
        user_name=user_name,
    )

    return {
        "lecture_id": lecture_id,
        "job_id": job_id,
        "message": "AI Synthesis pipeline initiated across 10 stages.",
    }


@router.get("/studio/status/{job_id}")
def get_pipeline_status(job_id: str, repo: LectraRepository = Depends(get_repo)):
    job = repo.get_pipeline_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Pipeline job not found")
    return job


@router.post("/studio/retry/{job_id}")
async def retry_pipeline_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    repo: LectraRepository = Depends(get_repo),
    service: LectraSynthesisService = Depends(get_service),
):
    job = repo.get_pipeline_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Pipeline job not found")
    background_tasks.add_task(service.retry_pipeline_job, job_id)
    return {
        "job_id": job.id,
        "lecture_id": job.lecture_id,
        "message": "Pipeline retry initiated.",
    }


@router.get("/sources/{source_id}/file")
def get_protected_source_file(
    source_id: str,
    preprocessed: bool = Query(False),
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    uid = opt_user.id if opt_user else None
    try:
        src = repo.get_uploaded_source(source_id, requesting_user_id=uid)
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    if not src:
        raise HTTPException(status_code=404, detail="Source file not found")
    target = Path(src.preprocessed_path) if (preprocessed and src.preprocessed_path) else Path(src.file_path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Source binary not found on disk")
    return FileResponse(path=str(target), media_type=src.mime_type, filename=src.original_filename)


# -------------------------------------------------------------------------
# 4. Master Notes Routes (Viewer, Editor, Auto-save, Regenerate, Q&A, Citations)
# -------------------------------------------------------------------------
@router.get("/notes")
def list_master_notes(
    subject_code: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    include_shared: bool = Query(True),
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    uid = opt_user.id if opt_user else None
    return repo.list_master_notes(
        requesting_user_id=uid,
        subject_code=subject_code,
        section=section,
        search_query=search,
        include_shared=include_shared,
    )


@router.get("/notes/{lecture_id}")
def get_master_note(
    lecture_id: str,
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    uid = opt_user.id if opt_user else None
    try:
        note = repo.get_master_note(lecture_id, requesting_user_id=uid)
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    if not note:
        raise HTTPException(status_code=404, detail="Master note not found")
    diagrams = repo.get_diagrams_for_lecture(lecture_id)
    study_kit = repo.get_study_kit(lecture_id)
    sources = repo.get_sources_for_lecture(lecture_id, requesting_user_id=uid)

    return {
        "note": note,
        "diagrams": diagrams,
        "study_kit": study_kit,
        "sources": sources,
    }


@router.put("/notes/{lecture_id}")
def update_master_note(
    lecture_id: str,
    req: UpdateMasterNoteRequest,
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    uid = opt_user.id if opt_user else "usr_lectra_default"
    try:
        note = repo.get_master_note(lecture_id, requesting_user_id=uid)
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    if not note:
        raise HTTPException(status_code=404, detail="Master note not found")
    if note.user_id != uid:
        raise HTTPException(status_code=403, detail="RLS Policy Violation: Students cannot edit another student's private notes.")

    if req.title:
        note.title = req.title
    if req.summary:
        note.summary = req.summary
    if req.user_markdown_override is not None:
        note.user_markdown_override = req.user_markdown_override
    if req.sections is not None:
        note.sections = req.sections
    if req.visibility is not None:
        note.visibility = req.visibility
    note.version = (note.version or 1) + 1
    note.updated_at = utc_now()

    try:
        repo.save_master_note(note, requesting_user_id=uid)
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    return {"message": "Master note updated", "note": note}


@router.delete("/notes/{lecture_id}")
def delete_master_note(
    lecture_id: str,
    current_user: UserProfile = Depends(get_current_user),
    repo: LectraRepository = Depends(get_repo),
):
    try:
        deleted = repo.delete_master_note(lecture_id, requesting_user_id=current_user.id)
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    if not deleted:
        raise HTTPException(status_code=404, detail="Master note not found")
    return {"message": "Master note deleted"}


@router.post("/notes/{lecture_id}/regenerate-section")
async def regenerate_master_note_section(
    lecture_id: str,
    req: RegenerateSectionRequest,
    service: LectraSynthesisService = Depends(get_service),
):
    try:
        updated_note = await service.regenerate_note_section(
            lecture_id=lecture_id,
            section_index=req.section_index,
            custom_instruction=req.instruction,
        )
        return {"message": "Section regenerated from grounded sources", "note": updated_note}
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))


@router.post("/notes/{lecture_id}/ask")
async def ask_master_note_question(
    lecture_id: str,
    req: AskSourceQuestionRequest,
    service: LectraSynthesisService = Depends(get_service),
):
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    try:
        result = await service.answer_source_question(lecture_id=lecture_id, question=req.question)
        return result
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))


# -------------------------------------------------------------------------
# 5. Smart Digital Diagrams
# -------------------------------------------------------------------------
@router.get("/diagrams/{lecture_id}")
def get_diagrams(lecture_id: str, repo: LectraRepository = Depends(get_repo)):
    return repo.get_diagrams_for_lecture(lecture_id)


@router.put("/diagrams/{diagram_id}")
def update_diagram(
    diagram_id: str,
    req: UpdateDiagramRequest,
    repo: LectraRepository = Depends(get_repo),
):
    # Find diagram across all lectures
    for n in repo.list_master_notes():
        for d in repo.get_diagrams_for_lecture(n.lecture_id):
            if d.id == diagram_id:
                if req.title:
                    d.title = req.title
                d.mermaid_code = req.mermaid_code
                if req.diagram_type:
                    d.diagram_type = req.diagram_type
                repo.save_diagram(d)
                return {"message": "Diagram updated", "diagram": d}

    raise HTTPException(status_code=404, detail="Diagram not found")


# -------------------------------------------------------------------------
# 6. The Nine-Section Vault Routes (Sections A to I)
# -------------------------------------------------------------------------
@router.get("/vault")
def get_section_vault(
    section: Optional[str] = Query(None, description="Section A to I"),
    subject: Optional[str] = Query(None, description="Subject filter"),
    professor: Optional[str] = Query(None, description="Professor filter"),
    verification_status: Optional[str] = Query(None, description="Status filter"),
    search: Optional[str] = Query(None, description="Search keyword"),
    repo: LectraRepository = Depends(get_repo),
):
    notes = repo.list_vault_notes(
        section=section,
        subject=subject,
        professor=professor,
        verification_status=verification_status,
        search_query=search,
    )
    return {
        "section_filter": section or "ALL",
        "total_notes": len(notes),
        "notes": notes,
    }


@router.get("/vault/compare")
def compare_sections(
    subject_code: str = Query("CS-244", description="Subject code to compare"),
    chapter: str = Query("Chapter 4: Consensus in Fault-Tolerant Clusters"),
    sections: str = Query("A,C", description="Comma-separated sections to compare, e.g. A,C"),
    repo: LectraRepository = Depends(get_repo),
):
    sec_list: List[SectionId] = []
    for s in sections.split(","):
        clean_s = s.strip().upper()
        if clean_s in [sec.value for sec in SectionId]:
            sec_list.append(SectionId(clean_s))
    if not sec_list:
        sec_list = [SectionId.A, SectionId.C]

    result = repo.compare_sections(subject_code=subject_code, chapter=chapter, sections=sec_list)
    return result


@router.post("/vault/upvote")
def upvote_vault_note(req: UpvoteRequest, repo: LectraRepository = Depends(get_repo)):
    new_upvotes = repo.upvote_vault_note(req.vault_note_id)
    return {"message": "Upvoted successfully", "upvotes": new_upvotes}


@router.post("/vault/report")
def report_vault_note(req: ReportNoteRequest, repo: LectraRepository = Depends(get_repo)):
    repo.report_vault_note(req.vault_note_id, req.reason, req.reporter_name)
    return {"message": "Inaccuracy report submitted for review"}


@router.post("/vault/share")
def share_to_vault(
    req: ShareVaultRequest,
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    uid = opt_user.id if opt_user else "usr_lectra_default"
    uname = opt_user.full_name if opt_user else "Alex Rivera"
    try:
        existing = repo.get_master_note(req.lecture_id, requesting_user_id=uid)
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    if not existing:
        raise HTTPException(status_code=404, detail="Master note not found to share")
    if existing.user_id != uid:
        raise HTTPException(status_code=403, detail="RLS Policy Violation: Only the owner of a master note can share it to the Section Vault.")

    # Explicitly mark master note visibility as shared
    existing.visibility = req.visibility if req.visibility != VisibilityType.PRIVATE else VisibilityType.SECTION
    repo.save_master_note(existing, requesting_user_id=uid)

    vault_entry = SectionVaultNote(
        id=f"vlt_{uuid4().hex[:10]}",
        master_notes_id=existing.id,
        lecture_id=req.lecture_id,
        title=req.title,
        chapter=req.chapter,
        subject_id=existing.subject_id,
        subject_name=existing.subject_name,
        subject_code=req.subject_code,
        professor=existing.professor,
        section=req.section,
        source_sections=existing.source_sections,
        lecture_date=utc_now()[:10],
        contributor_id=uid,
        contributor_name=uname,
        visibility=existing.visibility,
        verification_status=VerificationStatus.COMMUNITY_REVIEWED,
        upvotes=1,
        summary=req.summary or existing.summary,
        download_available=True,
        tags=[req.subject_code, f"Section {req.section.value}", "Student Shared"],
    )
    repo.save_vault_note(vault_entry)
    return {"message": "Shared to Section Vault successfully", "vault_note": vault_entry}


# -------------------------------------------------------------------------
# 7. Study Kits Routes (Flashcards, MCQs, Timed Practice Quiz, Revision Sheets)
# -------------------------------------------------------------------------
@router.get("/study-kits")
def list_study_kits(repo: LectraRepository = Depends(get_repo)):
    return repo.list_study_kits()


@router.get("/flashcards")
def list_flashcards(
    study_kit_id: Optional[str] = Query(None),
    repo: LectraRepository = Depends(get_repo),
):
    return repo.list_flashcards(study_kit_id=study_kit_id)


@router.get("/quiz-questions")
def list_quiz_questions(
    study_kit_id: Optional[str] = Query(None),
    repo: LectraRepository = Depends(get_repo),
):
    return repo.list_quiz_questions(study_kit_id=study_kit_id)


@router.get("/study-kits/{lecture_id}")
def get_study_kit(lecture_id: str, repo: LectraRepository = Depends(get_repo)):
    kit = repo.get_study_kit(lecture_id)
    if not kit:
        raise HTTPException(status_code=404, detail="Study kit not found for this lecture")
    return kit


@router.post("/study-kits/{lecture_id}/quiz-submit")
def submit_quiz_answers(
    lecture_id: str,
    req: QuizSubmissionRequest,
    repo: LectraRepository = Depends(get_repo),
):
    kit = repo.get_study_kit(lecture_id)
    if not kit:
        raise HTTPException(status_code=404, detail="Study kit not found")

    total_questions = len(kit.mcqs)
    if total_questions == 0:
        return {"score": 0, "total": 0, "percentage": 0}

    correct_count = 0
    breakdown = []
    topic_scores: Dict[str, Dict[str, int]] = {}

    for q in kit.mcqs:
        selected = req.answers.get(q.id)
        is_correct = selected == q.correct_option_index
        if is_correct:
            correct_count += 1

        topic = q.topic_reference or "General"
        if topic not in topic_scores:
            topic_scores[topic] = {"correct": 0, "total": 0}
        topic_scores[topic]["total"] += 1
        if is_correct:
            topic_scores[topic]["correct"] += 1

        breakdown.append({
            "question_id": q.id,
            "question": q.question,
            "selected_option": selected,
            "correct_option": q.correct_option_index,
            "is_correct": is_correct,
            "explanation": q.explanation,
            "topic": topic,
        })

    percentage = round((correct_count / total_questions) * 100, 1)

    return {
        "score": correct_count,
        "total": total_questions,
        "percentage": percentage,
        "passed": percentage >= 70,
        "time_taken_seconds": req.time_taken_seconds,
        "topic_performance": topic_scores,
        "detailed_breakdown": breakdown,
    }


# -------------------------------------------------------------------------
# 8. Professor Library Routes
# -------------------------------------------------------------------------
@router.get("/professors")
def list_professors(repo: LectraRepository = Depends(get_repo)):
    return repo.list_professors()


@router.get("/professors/{prof_id}")
def get_professor(prof_id: str, repo: LectraRepository = Depends(get_repo)):
    prof = repo.get_professor(prof_id)
    if not prof:
        raise HTTPException(status_code=404, detail="Professor not found")
    return prof


@router.post("/professors")
def create_professor(prof: ProfessorProfile, repo: LectraRepository = Depends(get_repo)):
    repo.save_professor(prof)
    return {"message": "Professor profile created", "professor": prof}


# -------------------------------------------------------------------------
# 9. Community Contributions & Reviews
# -------------------------------------------------------------------------
@router.get("/community/reviews/{vault_id}")
def get_reviews(vault_id: str, repo: LectraRepository = Depends(get_repo)):
    return repo.list_reviews_for_note(vault_id)


@router.post("/community/reviews")
def add_review(req: ReviewSubmissionRequest, repo: LectraRepository = Depends(get_repo)):
    rev = CommunityReview(
        vault_note_id=req.vault_note_id,
        user_id=req.user_id,
        user_name=req.user_name,
        user_section=req.user_section,
        rating=req.rating,
        comment=req.comment,
    )
    repo.save_review(rev)
    return {"message": "Review added", "review": rev}


# -------------------------------------------------------------------------
# 10. Notifications & Supabase Realtime Events
# -------------------------------------------------------------------------
@router.get("/notifications")
def get_notifications(
    user_id: Optional[str] = Query(None),
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    target_uid = opt_user.id if opt_user else (user_id or "usr_lectra_default")
    return repo.list_notifications(target_uid)


@router.post("/notifications/read")
def mark_notifications_read(
    user_id: Optional[str] = Query(None),
    opt_user: Optional[UserProfile] = Depends(get_optional_user),
    repo: LectraRepository = Depends(get_repo),
):
    target_uid = opt_user.id if opt_user else (user_id or "usr_lectra_default")
    repo.mark_notifications_read(target_uid)
    return {"message": "All notifications marked as read"}


@router.get("/realtime/events")
def get_realtime_events(since_seq: int = Query(0, ge=0)):
    return {
        "events": realtime_broker.get_events_since(since_seq=since_seq),
    }


# -------------------------------------------------------------------------
# 11. Document Export (Real PDF, DOCX, Markdown Downloads)
# -------------------------------------------------------------------------
@router.get("/export/markdown/{lecture_id}")
def export_markdown(lecture_id: str, repo: LectraRepository = Depends(get_repo)):
    note = repo.get_master_note(lecture_id)
    if not note:
        raise HTTPException(status_code=404, detail="Master note not found")

    content = note.user_markdown_override or note.ai_synthesized_markdown or f"# {note.title}\n\n{note.summary}\n"
    headers = {
        "Content-Disposition": f'attachment; filename="LECTRA_{note.subject_code}_{note.chapter.replace(" ", "_")}.md"'
    }
    return Response(content=content, media_type="text/markdown", headers=headers)


@router.get("/export/pdf/{lecture_id}", response_class=HTMLResponse)
def export_printable_pdf_html(lecture_id: str, repo: LectraRepository = Depends(get_repo)):
    note = repo.get_master_note(lecture_id)
    if not note:
        raise HTTPException(status_code=404, detail="Master note not found")

    diagrams = repo.get_diagrams_for_lecture(lecture_id)

    tables_html = ""
    for tbl in note.tables:
        header_row = "".join(f"<th style='border:1px solid #CBD5E1;padding:8px;background:#F1F5F9;text-align:left;'>{h}</th>" for h in tbl.headers)
        body_rows = "".join(
            "<tr>" + "".join(f"<td style='border:1px solid #CBD5E1;padding:8px;'>{c}</td>" for c in row) + "</tr>"
            for row in tbl.rows
        )
        tables_html += f"""
        <div style="margin: 14px 0;">
          <h4>{tbl.title} <small style="color:#64748B;">({tbl.source})</small></h4>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr>{header_row}</tr></thead>
            <tbody>{body_rows}</tbody>
          </table>
        </div>
        """

    diagrams_html = ""
    for d in diagrams:
        diagrams_html += f"""
        <div style="border:1px solid #E2E8F0;border-radius:8px;padding:12px;margin:12px 0;">
          <strong>{d.title}</strong> <span style="font-size:11px;color:#64748B;">({d.diagram_type} • Confidence: {int(d.confidence * 100)}%)</span>
          <p style="font-size:13px;color:#334155;">{d.caption}</p>
          {d.svg_code if d.svg_code else f"<pre style='background:#F8FAFC;padding:10px;border-radius:6px;font-size:12px;'>{d.mermaid_code}</pre>"}
        </div>
        """

    uncertain_html = ""
    if note.uncertain_words or note.needs_verification or note.source_conflicts:
        uncertain_html += "<ul>"
        for uw in note.uncertain_words:
            uncertain_html += f"<li><strong>[Uncertain Handwriting: {uw.word_or_phrase}]</strong> (Confidence: {int(uw.confidence * 100)}%) — {uw.reason} <em>[{uw.source_doc or uw.source_file}]</em></li>"
        for nv in note.needs_verification:
            uncertain_html += f"<li><strong>{nv.item}:</strong> {nv.reason} <em>[{nv.source_doc or ''}]</em></li>"
        for cf in note.source_conflicts:
            uncertain_html += f"<li><strong>[Conflict Flagged — {cf.topic}]:</strong> Reference: {cf.reference_statement} | Classroom: {cf.classroom_statement} | Resolution: {cf.resolution_note}</li>"
        uncertain_html += "</ul>"
    else:
        uncertain_html = "<p style='color:#64748B;font-size:13px;'>No uncertain tokens or conflicts flagged.</p>"

    # Generate high fidelity printable HTML document with Auto-Print triggering for vector PDF save
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LECTRA Master Notes — {note.title}</title>
  <style>
    @page {{
      size: A4;
      margin: 20mm;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #0F172A;
      background: #FFFFFF;
      max-width: 820px;
      margin: 0 auto;
      padding: 20px;
    }}
    .brand-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0B132B;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }}
    .brand-title {{
      font-size: 22px;
      font-weight: 800;
      color: #0B132B;
      letter-spacing: -0.5px;
    }}
    .brand-tagline {{
      font-size: 11px;
      color: #64748B;
      text-transform: uppercase;
      font-weight: 600;
    }}
    .metadata-box {{
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      font-size: 13px;
    }}
    .metadata-label {{
      font-weight: 600;
      color: #475569;
    }}
    h1 {{
      font-size: 24px;
      color: #0F172A;
      margin-bottom: 8px;
    }}
    h2 {{
      font-size: 18px;
      color: #1E293B;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 6px;
      margin-top: 24px;
    }}
    .emphasis-box {{
      background: #EFF6FF;
      border-left: 4px solid #3B82F6;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin: 12px 0;
      font-size: 13px;
      color: #1E3A8A;
    }}
    .formula-box {{
      background: #F1F5F9;
      padding: 12px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 14px;
      margin: 10px 0;
      border: 1px solid #CBD5E1;
    }}
    .print-button {{
      background: #0B132B;
      color: #FFFFFF;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 20px;
    }}
    @media print {{
      .no-print {{
        display: none !important;
      }}
    }}
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right;">
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="brand-header">
    <div>
      <div class="brand-title">LECTRA</div>
      <div class="brand-tagline">One Classroom. Nine Sections. One Master Notebook.</div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #64748B;">
      Verified Master Note • OCR Confidence {int(note.ocr_confidence * 100)}%
    </div>
  </div>

  <h1>1. {note.title}</h1>
  <div class="metadata-box">
    <div><span class="metadata-label">Course:</span> {note.subject_code} - {note.subject_name}</div>
    <div><span class="metadata-label">Chapter:</span> {note.chapter}</div>
    <div><span class="metadata-label">Instructor:</span> {note.professor}</div>
    <div><span class="metadata-label">Source Sections:</span> Section {", ".join([s.value for s in note.source_sections])}</div>
  </div>

  <h2>2. Chapter Overview</h2>
  <p>{note.summary}</p>

  <h2>3. Learning Objectives</h2>
  <ul>
    {"".join(f"<li>{obj}</li>" for obj in note.learning_objectives)}
  </ul>

  <h2>4. Detailed Notes</h2>
  {"".join(f'''
    <h3>{sec.heading}</h3>
    <p>{sec.content}</p>
    {f'<div class="emphasis-box"><strong>Professor Verbal Emphasis:</strong> {sec.professor_emphasis}</div>' if sec.professor_emphasis else ''}
  ''' for sec in note.sections)}

  <h2>5. Definitions</h2>
  <ul>
    {"".join(f"<li><strong>{d.term}:</strong> {d.definition} <em>({d.context})</em></li>" for d in note.key_definitions)}
  </ul>

  <h2>6. Important Formulas</h2>
  {"".join(f'''
    <div class="formula-box">
      <strong>Formula:</strong> {f.latex_or_text}<br>
      <small>{f.explanation}</small>
    </div>
  ''' for f in note.important_formulas)}

  <h2>7. Professor's Examples</h2>
  <ul>
    {"".join(f"<li><strong>{ex.title}:</strong> {ex.description}</li>" for ex in note.important_examples)}
  </ul>

  <h2>8. Tables</h2>
  {tables_html or "<p style='color:#64748B;font-size:13px;'>No structured tables extracted.</p>"}

  <h2>9. Diagrams</h2>
  {diagrams_html or "".join(f"<p>• {ds.get('title', ds) if isinstance(ds, dict) else ds}</p>" for ds in note.diagram_summaries)}

  <h2>10. High-Priority Topics</h2>
  <ul>
    {"".join(f"<li><strong>{hp.topic}</strong> ({hp.frequency_or_weight}): {hp.reason}</li>" for hp in note.exam_focused_concepts)}
  </ul>

  <h2>11. Key Takeaways</h2>
  <ul>
    {"".join(f"<li>{t}</li>" for t in note.key_takeaways)}
  </ul>

  <h2>12. Exam Revision Summary</h2>
  <ul>
    {"".join(f"<li>{rev}</li>" for rev in note.exam_revision_summary)}
  </ul>

  <h2>13. Source References</h2>
  <ul>
    {"".join(f"<li><strong>{c.source_name}</strong> ({c.source_type}, {c.page_or_region}): {c.quote}</li>" for c in note.citations)}
  </ul>

  <h2>14. Uncertain Content & Conflict Log</h2>
  {uncertain_html}

  <div style="margin-top: 40px; padding-top: 10px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; text-align: center;">
    Generated by LECTRA Academic Collaboration Platform • {note.professor_style.disclaimer if note.professor_style else ""}
  </div>
</body>
</html>"""
    return HTMLResponse(content=html_content)


@router.get("/export/docx/{lecture_id}")
def export_docx(lecture_id: str, repo: LectraRepository = Depends(get_repo)):
    note = repo.get_master_note(lecture_id)
    if not note:
        raise HTTPException(status_code=404, detail="Master note not found")

    docx_bytes = LectraSynthesisService.build_docx_bytes(note)
    safe_chapter = note.chapter.replace(" ", "_").replace("/", "_")
    headers = {
        "Content-Disposition": f'attachment; filename="LECTRA_{note.subject_code}_{safe_chapter}.docx"'
    }
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers=headers,
    )
