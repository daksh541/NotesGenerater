"""Lecture upload, processing, notes, diagrams, flashcards, search, and timeline APIs for Stellegent."""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel

from ...core.services.multimodal_lecture_service import MultimodalLectureService
from ...core.stellegent_dependencies import get_current_user, get_current_workspace, get_stellegent_repo
from ...domain.stellegent import (
    CrossLectureConnection,
    DiagramArtifact,
    DiagramType,
    Flashcard,
    Lecture,
    LecturePage,
    ProcessingJob,
    ProcessingStatus,
    ReviewStatus,
    SourceType,
    StructuredNote,
    Subject,
    User,
    Workspace,
    utc_now,
)
from ...infrastructure.repositories.stellegent_repository import StellegentRepository

router = APIRouter(prefix="/lectures", tags=["Stellegent Lectures"])

UPLOAD_DIR = Path("./uploads")
ORIGINALS_DIR = UPLOAD_DIR / "originals"
ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)


def get_multimodal_service(repo: StellegentRepository = Depends(get_stellegent_repo)) -> MultimodalLectureService:
    api_key = os.getenv("OPENAI_API_KEY", "")
    return MultimodalLectureService(repo=repo, upload_dir=UPLOAD_DIR, api_key=api_key)


class LectureDetailResponse(BaseModel):
    lecture: Lecture
    pages: List[LecturePage]
    job: Optional[ProcessingJob] = None
    note: Optional[StructuredNote] = None
    diagrams: List[DiagramArtifact] = []
    flashcards: List[Flashcard] = []


class UpdateNoteRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    user_markdown_override: Optional[str] = None


class UpdateDiagramRequest(BaseModel):
    title: Optional[str] = None
    mermaid_code: str
    diagram_type: Optional[DiagramType] = None


class RegenerateDiagramRequest(BaseModel):
    diagram_type: DiagramType = DiagramType.FLOWCHART


class UpdateFlashcardRequest(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    explanation: Optional[str] = None
    review_status: Optional[ReviewStatus] = None


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_lecture(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    title: str = Form(...),
    subject_id: Optional[str] = Form(None),
    teacher: Optional[str] = Form(None),
    semester: Optional[str] = Form(None),
    lecture_date: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    mock_pipeline: bool = Form(False),
    user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
    service: MultimodalLectureService = Depends(get_multimodal_service),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided for upload")

    # Parse tags
    parsed_tags = []
    if tags:
        try:
            parsed_tags = json.loads(tags) if tags.strip().startswith("[") else [t.strip() for t in tags.split(",") if t.strip()]
        except Exception:
            parsed_tags = [t.strip() for t in tags.split(",") if t.strip()]

    # Validate file formats & compute hash
    hasher = hashlib.sha256()
    saved_pages_info = []

    for idx, file in enumerate(files):
        ext = Path(file.filename or "").suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".bmp"}:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Supported: JPG, PNG, WEBP, PDF",
            )

        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File {file.filename} exceeds maximum size limit of 50MB")

        hasher.update(contents)

        safe_filename = f"{user.id}_{int(asyncio.get_event_loop().time())}_{idx}_{Path(file.filename).name}"
        orig_dest = ORIGINALS_DIR / safe_filename
        with open(orig_dest, "wb") as f:
            f.write(contents)

        source_type = SourceType.PDF_DOCUMENT if ext == ".pdf" else SourceType.WHITEBOARD
        saved_pages_info.append({
            "path": str(orig_dest),
            "filename": file.filename or safe_filename,
            "type": source_type,
            "size": len(contents),
            "mime": file.content_type or "image/jpeg",
        })

    content_hash = hasher.hexdigest()

    # Duplicate check within workspace
    existing_lecture = repo.get_lecture_by_hash(workspace.id, content_hash)
    if existing_lecture:
        return {
            "message": "Duplicate lecture detected in workspace",
            "is_duplicate": True,
            "lecture_id": existing_lecture.id,
            "lecture": existing_lecture,
        }

    # Create Lecture record
    lecture = Lecture(
        workspace_id=workspace.id,
        subject_id=subject_id if subject_id else None,
        user_id=user.id,
        title=title.strip() or "Untitled Lecture",
        teacher=teacher.strip() if teacher else None,
        semester=semester.strip() if semester else None,
        lecture_date=lecture_date or utc_now()[:10],
        tags=parsed_tags,
        status=ProcessingStatus.PENDING,
        page_count=len(saved_pages_info),
        content_hash=content_hash,
    )
    repo.create_lecture(lecture)

    # Create Page records
    for page_idx, info in enumerate(saved_pages_info):
        page = LecturePage(
            lecture_id=lecture.id,
            page_number=page_idx + 1,
            file_path=info["path"],
            original_filename=info["filename"],
            source_type=info["type"],
            mime_type=info["mime"],
            file_size_bytes=info["size"],
        )
        repo.add_lecture_page(page)

    # Create Initial Processing Job
    job = ProcessingJob(
        lecture_id=lecture.id,
        workspace_id=workspace.id,
        stage=ProcessingStatus.PENDING,
        progress=0,
        status="running",
    )
    repo.create_or_update_job(job)

    # Launch background processing pipeline
    # If no OpenAI API key is set and mock_pipeline is not explicitly false, auto-enable mock in test/offline environments
    auto_mock = mock_pipeline or (not service.api_key and os.getenv("STELLEGENT_DEV_MODE", "false").lower() == "true")
    background_tasks.add_task(
        service.process_lecture_pipeline,
        lecture_id=lecture.id,
        job_id=job.id,
        mock_pipeline=auto_mock,
    )

    return {
        "message": "Lecture uploaded and processing started",
        "lecture_id": lecture.id,
        "job_id": job.id,
        "is_duplicate": False,
        "lecture": lecture,
    }


@router.get("", response_model=List[Lecture])
async def list_lectures(
    subject_id: Optional[str] = Query(None),
    teacher: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
):
    return repo.list_lectures(
        workspace_id=workspace.id,
        subject_id=subject_id,
        teacher=teacher,
        semester=semester,
        search_query=search,
    )


@router.get("/{lecture_id}", response_model=LectureDetailResponse)
async def get_lecture_detail(
    lecture_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
):
    lecture = repo.get_lecture(lecture_id)
    if not lecture or lecture.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Lecture not found")

    pages = repo.get_lecture_pages(lecture_id)
    job = repo.get_job_by_lecture(lecture_id)
    note = repo.get_structured_note(lecture_id)
    diagrams = repo.get_diagrams(lecture_id)
    flashcards = repo.list_flashcards(lecture_id=lecture_id)

    return LectureDetailResponse(
        lecture=lecture,
        pages=pages,
        job=job,
        note=note,
        diagrams=diagrams,
        flashcards=flashcards,
    )


@router.get("/{lecture_id}/status", response_model=ProcessingJob)
async def get_lecture_status(
    lecture_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
):
    lecture = repo.get_lecture(lecture_id)
    if not lecture or lecture.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Lecture not found")

    job = repo.get_job_by_lecture(lecture_id)
    if not job:
        raise HTTPException(status_code=404, detail="No processing job found for lecture")
    return job


@router.post("/{lecture_id}/retry", status_code=status.HTTP_202_ACCEPTED)
async def retry_lecture_processing(
    lecture_id: str,
    background_tasks: BackgroundTasks,
    mock_pipeline: bool = Query(False),
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
    service: MultimodalLectureService = Depends(get_multimodal_service),
):
    lecture = repo.get_lecture(lecture_id)
    if not lecture or lecture.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Lecture not found")

    job = repo.get_job_by_lecture(lecture_id)
    if not job:
        job = ProcessingJob(lecture_id=lecture.id, workspace_id=workspace.id)

    job.retry_count += 1
    job.status = "running"
    job.stage = ProcessingStatus.PENDING
    job.progress = 0
    job.error_message = None
    repo.create_or_update_job(job)

    background_tasks.add_task(
        service.process_lecture_pipeline,
        lecture_id=lecture.id,
        job_id=job.id,
        mock_pipeline=mock_pipeline or (not service.api_key and os.getenv("STELLEGENT_DEV_MODE", "false").lower() == "true"),
    )
    return {"message": "Retry initiated", "job_id": job.id}


@router.delete("/{lecture_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lecture(
    lecture_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
):
    lecture = repo.get_lecture(lecture_id)
    if not lecture or lecture.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Lecture not found")
    repo.delete_lecture(lecture_id)


# --- Notes Endpoints ---
@router.put("/{lecture_id}/note", response_model=StructuredNote)
async def update_note(
    lecture_id: str,
    req: UpdateNoteRequest,
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
):
    lecture = repo.get_lecture(lecture_id)
    if not lecture or lecture.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Lecture not found")

    note = repo.get_structured_note(lecture_id)
    if not note:
        raise HTTPException(status_code=404, detail="No structured note found for lecture")

    if req.title is not None:
        note.title = req.title.strip()
    if req.summary is not None:
        note.summary = req.summary.strip()
    if req.user_markdown_override is not None:
        note.user_markdown_override = req.user_markdown_override

    note.updated_at = utc_now()
    return repo.save_structured_note(note)


# --- Diagram Endpoints ---
@router.put("/{lecture_id}/diagrams/{diagram_id}", response_model=DiagramArtifact)
async def update_diagram(
    lecture_id: str,
    diagram_id: str,
    req: UpdateDiagramRequest,
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
    service: MultimodalLectureService = Depends(get_multimodal_service),
):
    lecture = repo.get_lecture(lecture_id)
    if not lecture or lecture.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Lecture not found")

    diagrams = repo.get_diagrams(lecture_id)
    target_diag = next((d for d in diagrams if d.id == diagram_id), None)
    if not target_diag:
        raise HTTPException(status_code=404, detail="Diagram not found")

    if req.title:
        target_diag.title = req.title.strip()
    if req.diagram_type:
        target_diag.diagram_type = req.diagram_type
    target_diag.mermaid_code = req.mermaid_code
    target_diag.is_valid_syntax = service.validate_mermaid_syntax(req.mermaid_code)
    target_diag.updated_at = utc_now()

    return repo.save_diagram(target_diag)


@router.post("/{lecture_id}/diagrams/regenerate", response_model=DiagramArtifact)
async def regenerate_diagram(
    lecture_id: str,
    req: RegenerateDiagramRequest,
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
    service: MultimodalLectureService = Depends(get_multimodal_service),
):
    lecture = repo.get_lecture(lecture_id)
    if not lecture or lecture.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Lecture not found")

    note = repo.get_structured_note(lecture_id)
    if not note:
        raise HTTPException(status_code=400, detail="Cannot generate diagram without notes")

    # Generate tailored mermaid code according to requested type
    if req.diagram_type == DiagramType.MIND_MAP:
        code = f"mindmap\n  root(({note.title}))\n"
        for s in note.sections[:4]:
            clean_h = s.heading.replace("(", "").replace(")", "").replace("[", "").replace("]", "")
            code += f"    {clean_h}\n"
            for sub in s.subsections[:3]:
                clean_sub = sub.replace("(", "").replace(")", "").replace("[", "").replace("]", "")
                code += f"      {clean_sub}\n"
    elif req.diagram_type == DiagramType.SEQUENCE:
        code = f"sequenceDiagram\n  autonumber\n  participant User as 👤 Learner\n  participant S as ⚡ Stellegent\n  participant N as 📓 {note.title}\n  User->>S: Ingest Whiteboard Photo\n  S->>N: Transcribe & Verify Formulas\n  N-->>User: Interactive Notes & Mind Map\n"
    else:
        code = f"flowchart TD\n  Start([🚀 {note.title}]) --> Step1[1. {note.sections[0].heading if note.sections else 'Overview'}]\n"
        if len(note.sections) > 1:
            code += f"  Step1 --> Step2[2. {note.sections[1].heading}]\n  Step2 --> Finish([🎯 Mastery & Review])\n"
        else:
            code += "  Step1 --> Finish([🎯 Mastery & Review])\n"

    new_diagram = DiagramArtifact(
        lecture_id=lecture.id,
        diagram_type=req.diagram_type,
        title=f"{note.title} ({req.diagram_type.value.replace('_', ' ').title()})",
        description=f"Tailored {req.diagram_type.value} generated from lecture concepts",
        mermaid_code=code,
        is_valid_syntax=service.validate_mermaid_syntax(code),
    )
    return repo.save_diagram(new_diagram)
