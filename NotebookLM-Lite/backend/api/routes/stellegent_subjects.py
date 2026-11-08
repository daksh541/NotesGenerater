"""Subject and course workspaces routes for Stellegent."""

from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...core.stellegent_dependencies import get_current_user, get_current_workspace, get_stellegent_repo
from ...domain.stellegent import Subject, User, Workspace
from ...infrastructure.repositories.stellegent_repository import StellegentRepository

router = APIRouter(prefix="/subjects", tags=["Stellegent Subjects"])


class CreateSubjectRequest(BaseModel):
    name: str
    code: Optional[str] = None
    teacher: Optional[str] = None
    semester: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"


@router.get("", response_model=List[Subject])
async def list_subjects(
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
):
    return repo.list_subjects(workspace.id)


@router.post("", response_model=Subject, status_code=status.HTTP_201_CREATED)
async def create_subject(
    req: CreateSubjectRequest,
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Subject name is required")

    subj = Subject(
        workspace_id=workspace.id,
        name=req.name.strip(),
        code=req.code.strip() if req.code else None,
        teacher=req.teacher.strip() if req.teacher else None,
        semester=req.semester.strip() if req.semester else None,
        description=req.description.strip() if req.description else None,
        color=req.color or "#6366f1",
    )
    return repo.create_subject(subj)


@router.get("/{subject_id}", response_model=Subject)
async def get_subject(
    subject_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
):
    subj = repo.get_subject(subject_id)
    if not subj or subj.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subj


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    repo: StellegentRepository = Depends(get_stellegent_repo),
):
    subj = repo.get_subject(subject_id)
    if not subj or subj.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Subject not found")
    repo.delete_subject(subject_id)
