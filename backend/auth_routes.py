from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from .auth_service import auth_response, create_user, get_current_user, get_user_by_email, user_to_public, validate_password, verify_password
from .database import get_connection


router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str = ""

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("valid email is required")
        return value


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("valid email is required")
        return value


@router.post("/register")
def register(payload: RegisterRequest) -> dict:
    try:
        validate_password(payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    with get_connection() as conn:
        if get_user_by_email(conn, payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        user = create_user(conn, payload.email, payload.password, payload.name)
        conn.commit()
        return auth_response(user)


@router.post("/login")
def login(payload: LoginRequest) -> dict:
    with get_connection() as conn:
        user = get_user_by_email(conn, payload.email)
        if not user or not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        return auth_response(user)


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)) -> dict:
    return {"user": current_user}


@router.post("/logout")
def logout() -> dict:
    return {"ok": True}
