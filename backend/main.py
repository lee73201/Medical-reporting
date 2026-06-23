from __future__ import annotations

from typing import List

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .ai_routes import router as ai_router
from .auth_routes import router as auth_router
from .auth_service import get_current_user
from .database import get_connection, init_db
from .models import fetch_report, list_reports, upsert_report
from .schemas import Report


app = FastAPI(title="Medical Reports API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:8088",
        "http://localhost:8088",
        "null",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ai_router)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/reports")
def get_reports(current_user: dict = Depends(get_current_user)) -> List[dict]:
    with get_connection() as conn:
        return list_reports(conn, current_user["id"])


@app.get("/api/reports/{report_id}")
def get_report(report_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    with get_connection() as conn:
        report = fetch_report(conn, report_id, current_user["id"])
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@app.post("/api/reports")
def create_report(report: Report, current_user: dict = Depends(get_current_user)) -> dict:
    with get_connection() as conn:
        existing = conn.execute("SELECT user_id FROM reports WHERE id = ?", (report.id,)).fetchone()
        if existing and existing["user_id"] != current_user["id"]:
            raise HTTPException(status_code=409, detail="Report id already exists")
        saved = upsert_report(conn, report, current_user["id"])
        conn.commit()
        return saved


@app.put("/api/reports/{report_id}")
def update_report(report_id: str, report: Report, current_user: dict = Depends(get_current_user)) -> dict:
    if report.id != report_id:
        report = report.model_copy(update={"id": report_id})
    with get_connection() as conn:
        if not fetch_report(conn, report_id, current_user["id"]):
            raise HTTPException(status_code=404, detail="Report not found")
        saved = upsert_report(conn, report, current_user["id"])
        conn.commit()
        return saved


@app.delete("/api/reports/{report_id}")
def delete_report(report_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    with get_connection() as conn:
        if not fetch_report(conn, report_id, current_user["id"]):
            raise HTTPException(status_code=404, detail="Report not found")
        conn.execute("DELETE FROM reports WHERE id = ? AND user_id = ?", (report_id, current_user["id"]))
        conn.commit()
    return {"ok": True}


@app.delete("/api/reports")
def clear_reports(current_user: dict = Depends(get_current_user)) -> dict:
    with get_connection() as conn:
        rows = conn.execute("SELECT id FROM reports WHERE user_id = ?", (current_user["id"],)).fetchall()
        report_ids = [row["id"] for row in rows]
        if report_ids:
            placeholders = ",".join("?" for _ in report_ids)
            conn.execute(f"DELETE FROM report_items WHERE report_id IN ({placeholders})", report_ids)
        conn.execute("DELETE FROM reports WHERE user_id = ?", (current_user["id"],))
        conn.commit()
    return {"ok": True}


@app.post("/api/reports/import")
def import_reports(reports: List[Report], replace: bool = Query(default=True), current_user: dict = Depends(get_current_user)) -> dict:
    with get_connection() as conn:
        if replace:
            rows = conn.execute("SELECT id FROM reports WHERE user_id = ?", (current_user["id"],)).fetchall()
            report_ids = [row["id"] for row in rows]
            if report_ids:
                placeholders = ",".join("?" for _ in report_ids)
                conn.execute(f"DELETE FROM report_items WHERE report_id IN ({placeholders})", report_ids)
            conn.execute("DELETE FROM reports WHERE user_id = ?", (current_user["id"],))
        imported = 0
        for report in reports:
            existing = conn.execute("SELECT user_id FROM reports WHERE id = ?", (report.id,)).fetchone()
            if existing and existing["user_id"] != current_user["id"]:
                continue
            upsert_report(conn, report, current_user["id"])
            imported += 1
        conn.commit()
    return {"imported": imported}
