"""API regression with a temporary SQLite database and no external AI calls."""
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import database
from backend.main import app


class BackendRegression(unittest.TestCase):
    def test_report_roundtrip_and_unconfigured_ai(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(database, "DB_PATH", Path(directory) / "test.db"):
                with patch.dict(os.environ, {"AI_API_KEY": "", "AI_MODEL": ""}):
                    with TestClient(app) as client:
                        self.assertEqual(client.get("/api/health").json(), {"ok": True})
                        report = {
                            "id": "synthetic-regression",
                            "patient": {"name": "测试患者", "age": 40, "patientId": "TEST"},
                            "reportType": "生化检验", "hospital": "测试机构", "date": "2026-06-01",
                            "items": [{"name": "空腹血糖", "value": 7.4, "unit": "mmol/L",
                                       "refLow": 3.9, "refHigh": 6.1, "refText": "3.9–6.1",
                                       "refSource": "report", "status": "high"}]
                        }
                        self.assertEqual(client.post("/api/reports", json=report).status_code, 200)
                        self.assertEqual(client.get("/api/reports").json()[0]["id"], report["id"])
                        self.assertEqual(client.get(f'/api/reports/{report["id"]}').json()["items"][0]["value"], 7.4)
                        report["hospital"] = "更新的测试机构"
                        self.assertEqual(client.put(f'/api/reports/{report["id"]}', json=report).json()["hospital"], report["hospital"])
                        preflight = client.options("/api/reports", headers={
                            "Origin": "http://localhost:8088", "Access-Control-Request-Method": "POST",
                            "Access-Control-Request-Headers": "Content-Type"
                        })
                        self.assertEqual(preflight.status_code, 200)
                        self.assertFalse(client.get("/api/ai/health").json()["configured"])
                        self.assertFalse(client.post("/api/ai/interpret", json={"report": report}).json()["ok"])
                        self.assertFalse(client.post("/api/ai/chat", json={"report": report, "messages": [], "question": "GLU是什么意思"}).json()["ok"])
                        self.assertEqual(client.delete(f'/api/reports/{report["id"]}').status_code, 200)
                        self.assertEqual(client.get(f'/api/reports/{report["id"]}').status_code, 404)
                        self.assertEqual(client.post("/api/reports/import", json=[report]).json()["imported"], 1)
                        self.assertEqual(client.delete("/api/reports").status_code, 200)
                        self.assertEqual(client.get("/api/reports").json(), [])
                        with database.get_connection() as conn:
                            self.assertEqual(conn.execute("SELECT count(*) FROM report_items").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
