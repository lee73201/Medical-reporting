from __future__ import annotations

from typing import List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .database import get_connection, init_db
from .models import fetch_report, list_reports, upsert_report
from .schemas import Report


app = FastAPI(title="Medical Reports API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8088",
        "http://localhost:8088",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/reports")
def get_reports() -> List[dict]:
    with get_connection() as conn:
        return list_reports(conn)


@app.get("/api/reports/{report_id}")
def get_report(report_id: str) -> dict:
    with get_connection() as conn:
        report = fetch_report(conn, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@app.post("/api/reports")
def create_report(report: Report) -> dict:
    with get_connection() as conn:
        saved = upsert_report(conn, report)
        conn.commit()
        return saved


@app.put("/api/reports/{report_id}")
def update_report(report_id: str, report: Report) -> dict:
    if report.id != report_id:
        report = report.model_copy(update={"id": report_id})
    with get_connection() as conn:
        if not fetch_report(conn, report_id):
            raise HTTPException(status_code=404, detail="Report not found")
        saved = upsert_report(conn, report)
        conn.commit()
        return saved


@app.delete("/api/reports/{report_id}")
def delete_report(report_id: str) -> dict:
    with get_connection() as conn:
        if not fetch_report(conn, report_id):
            raise HTTPException(status_code=404, detail="Report not found")
        conn.execute("DELETE FROM reports WHERE id = ?", (report_id,))
        conn.commit()
    return {"ok": True}


@app.delete("/api/reports")
def clear_reports() -> dict:
    with get_connection() as conn:
        conn.execute("DELETE FROM report_items")
        conn.execute("DELETE FROM reports")
        conn.commit()
    return {"ok": True}


@app.post("/api/reports/import")
def import_reports(reports: List[Report], replace: bool = Query(default=True)) -> dict:
    with get_connection() as conn:
        if replace:
            conn.execute("DELETE FROM report_items")
            conn.execute("DELETE FROM reports")
        for report in reports:
            upsert_report(conn, report)
        conn.commit()
    return {"imported": len(reports)}
