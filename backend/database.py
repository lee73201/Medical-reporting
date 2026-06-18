from __future__ import annotations

import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "med_reports.db"


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                patient_name TEXT,
                patient_age INTEGER,
                patient_id TEXT,
                report_type TEXT NOT NULL,
                hospital TEXT NOT NULL,
                date TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS report_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id TEXT NOT NULL,
                name TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                ref_low REAL NOT NULL DEFAULT 0,
                ref_high REAL NOT NULL DEFAULT 0,
                ref_text TEXT NOT NULL DEFAULT '',
                ref_source TEXT NOT NULL DEFAULT 'unknown',
                status TEXT NOT NULL,
                FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_report_items_report_id
            ON report_items(report_id);
            """
        )
