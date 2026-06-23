from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from sqlite3 import Connection, Row
from typing import Any, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .database import get_connection


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_jwt_secret() -> str:
    return os.getenv("JWT_SECRET_KEY") or "dev-only-change-this-secret"


def get_jwt_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM") or "HS256"


def get_token_expire_minutes() -> int:
    raw = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or "1440"
    try:
        return int(raw)
    except ValueError:
        return 1440


def validate_password(password: str) -> None:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password cannot be longer than 72 bytes")


def hash_password(password: str) -> str:
    validate_password(password)
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def user_to_public(user: Row | Dict[str, Any]) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"] or "",
    }


def get_user_by_email(conn: Connection, email: str) -> Row | None:
    return conn.execute("SELECT * FROM users WHERE lower(email) = lower(?)", (email,)).fetchone()


def get_user_by_id(conn: Connection, user_id: str) -> Row | None:
    return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


def create_user(conn: Connection, email: str, password: str, name: str = "") -> Row:
    current = now_iso()
    user_id = f"u{uuid.uuid4().hex}"
    conn.execute(
        """
        INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (user_id, email.strip().lower(), hash_password(password), name.strip(), current, current),
    )
    user = get_user_by_id(conn, user_id)
    assert user is not None
    return user


def create_access_token(user_id: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=get_token_expire_minutes())
    payload = {"sub": user_id, "exp": expires}
    return jwt.encode(payload, get_jwt_secret(), algorithm=get_jwt_algorithm())


def auth_response(user: Row) -> dict:
    return {
        "access_token": create_access_token(user["id"]),
        "token_type": "bearer",
        "user": user_to_public(user),
    }


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, get_jwt_secret(), algorithms=[get_jwt_algorithm()])
        user_id = payload.get("sub")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    with get_connection() as conn:
        user = get_user_by_id(conn, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user_to_public(user)
