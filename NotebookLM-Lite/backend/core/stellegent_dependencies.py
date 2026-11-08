"""FastAPI dependencies for Stellegent repository, authentication, and authorization."""

from __future__ import annotations

import os
from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..config import get_settings
from ..domain.stellegent import User, UserRole, Workspace
from ..infrastructure.repositories.stellegent_repository import StellegentRepository
from .security import decode_access_token

_stellegent_repo: Optional[StellegentRepository] = None
bearer_scheme = HTTPBearer(auto_error=False)


def get_stellegent_repo() -> StellegentRepository:
    global _stellegent_repo
    if _stellegent_repo is None:
        settings = get_settings()
        db_path = os.getenv("STELLEGENT_DB_PATH", "./data/stellegent.db")
        _stellegent_repo = StellegentRepository(db_path)
    return _stellegent_repo


def reset_stellegent_repo() -> None:
    global _stellegent_repo
    if _stellegent_repo is not None:
        _stellegent_repo.close()
        _stellegent_repo = None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    repo: StellegentRepository = Depends(get_stellegent_repo),
) -> User:
    if not credentials or not credentials.credentials:
        # Check if default demo user exists for seamless local first-run
        demo_user = repo.get_user_by_email("demo@stellegent.ai")
        if demo_user:
            return demo_user
        # Create default demo user
        from .security import hash_password
        new_demo = User(
            email="demo@stellegent.ai",
            password_hash=hash_password("stellegent123"),
            full_name="Stellegent Scholar",
            role=UserRole.STUDENT,
        )
        repo.create_user(new_demo)
        repo.get_or_create_default_workspace(new_demo.id)
        return new_demo

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = repo.get_user_by_id(payload.get("sub", ""))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
        )
    return user


async def get_current_workspace(
    user: User = Depends(get_current_user),
    repo: StellegentRepository = Depends(get_stellegent_repo),
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-Id"),
) -> Workspace:
    workspaces = repo.list_workspaces(user.id)
    if x_workspace_id:
        for ws in workspaces:
            if ws.id == x_workspace_id:
                return ws
        # Check if the requested workspace belongs to user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you do not have permission for this workspace",
        )

    if workspaces:
        return workspaces[0]

    return repo.get_or_create_default_workspace(user.id)
