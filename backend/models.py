from __future__ import annotations

from datetime import datetime, timezone
from sqlite3 import Connection, Row
from typing import Iterable, List

from .schemas import Report


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_report(report_row: Row, item_rows: Iterable[Row]) -> dict:
    return {
        "id": report_row["id"],
        "patient": {
            "name": report_row["patient_name"] or "",
            "age": report_row["patient_age"] or 0,
            "patientId": report_row["patient_id"] or "",
        },
        "reportType": report_row["report_type"],
        "hospital": report_row["hospital"],
        "date": report_row["date"],
        "items": [
            {
                "name": item["name"],
                "value": item["value"],
                "unit": item["unit"],
                "refLow": item["ref_low"],
                "refHigh": item["ref_high"],
                "refText": item["ref_text"],
                "refSource": item["ref_source"],
                "status": item["status"],
            }
            for item in item_rows
        ],
    }


def fetch_report(conn: Connection, report_id: str, user_id: str | None = None) -> dict | None:
    if user_id is None:
        report_row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    else:
        report_row = conn.execute("SELECT * FROM reports WHERE id = ? AND user_id = ?", (report_id, user_id)).fetchone()
    if not report_row:
        return None
    item_rows = conn.execute(
        "SELECT * FROM report_items WHERE report_id = ? ORDER BY id ASC",
        (report_id,),
    ).fetchall()
    return row_to_report(report_row, item_rows)


def list_reports(conn: Connection, user_id: str | None = None) -> List[dict]:
    if user_id is None:
        rows = conn.execute("SELECT * FROM reports ORDER BY date DESC, created_at DESC").fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM reports WHERE user_id = ? ORDER BY date DESC, created_at DESC",
            (user_id,),
        ).fetchall()
    return [fetch_report(conn, row["id"], user_id) for row in rows]


def upsert_report(conn: Connection, report: Report, user_id: str | None = None) -> dict:
    current = now_iso()
    if user_id is None:
        existing = conn.execute("SELECT created_at FROM reports WHERE id = ?", (report.id,)).fetchone()
    else:
        existing = conn.execute("SELECT created_at FROM reports WHERE id = ? AND user_id = ?", (report.id, user_id)).fetchone()
    created_at = existing["created_at"] if existing else current
    conn.execute(
        """
        INSERT INTO reports (
            id, user_id, patient_name, patient_age, patient_id,
            report_type, hospital, date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            patient_name = excluded.patient_name,
            patient_age = excluded.patient_age,
            patient_id = excluded.patient_id,
            report_type = excluded.report_type,
            hospital = excluded.hospital,
            date = excluded.date,
            updated_at = excluded.updated_at
        """,
        (
            report.id,
            user_id,
            report.patient.name,
            report.patient.age,
            report.patient.patientId,
            report.reportType,
            report.hospital,
            report.date,
            created_at,
            current,
        ),
    )
    conn.execute("DELETE FROM report_items WHERE report_id = ?", (report.id,))
    conn.executemany(
        """
        INSERT INTO report_items (
            report_id, name, value, unit, ref_low, ref_high,
            ref_text, ref_source, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                report.id,
                item.name,
                item.value,
                item.unit,
                item.refLow,
                item.refHigh,
                item.refText or f"{item.refLow}-{item.refHigh}",
                item.refSource or "unknown",
                item.status,
            )
            for item in report.items
        ],
    )
    saved = fetch_report(conn, report.id, user_id)
    assert saved is not None
    return saved
