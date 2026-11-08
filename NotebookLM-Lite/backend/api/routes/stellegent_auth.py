"""Authentication and workspace management routes for Stellegent."""

from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...core.security import create_access_token, hash_password, verify_password
from ...core.stellegent_dependencies import get_current_user, get_stellegent_repo
from ...domain.stellegent import User, UserRole, Workspace
from ...infrastructure.repositories.stellegent_repository import StellegentRepository

router = APIRouter(prefix="/auth", tags=["Stellegent Auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[UserRole] = UserRole.STUDENT


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    role: str
    default_workspace_id: str


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    workspaces: List[Workspace]


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest, repo: StellegentRepository = Depends(get_stellegent_repo)):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = repo.get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    hashed = hash_password(req.password)
    user = User(
        email=req.email,
        password_hash=hashed,
        full_name=req.full_name,
        role=req.role or UserRole.STUDENT,
    )
    repo.create_user(user)
    ws = repo.get_or_create_default_workspace(user.id)
    token = create_access_token(user.id, user.email, user.role.value)

    return AuthResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        default_workspace_id=ws.id,
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, repo: StellegentRepository = Depends(get_stellegent_repo)):
    user = repo.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    ws = repo.get_or_create_default_workspace(user.id)
    token = create_access_token(user.id, user.email, user.role.value)

    return AuthResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        default_workspace_id=ws.id,
    )


@router.post("/demo-login", response_model=AuthResponse)
async def demo_login(repo: StellegentRepository = Depends(get_stellegent_repo)):
    demo_email = "demo@stellegent.ai"
    user = repo.get_user_by_email(demo_email)
    if not user:
        user = User(
            email=demo_email,
            password_hash=hash_password("stellegent123"),
            full_name="Stellegent Scholar",
            role=UserRole.STUDENT,
        )
        repo.create_user(user)
    ws = repo.get_or_create_default_workspace(user.id)
    token = create_access_token(user.id, user.email, user.role.value)
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        default_workspace_id=ws.id,
    )


@router.get("/me", response_model=UserProfileResponse)

async def get_me(
    user: User = Depends(get_current_user),
    repo: StellegentRepository = Depends(get_stellegent_repo),
):
    workspaces = repo.list_workspaces(user.id)
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        workspaces=workspaces,
    )
