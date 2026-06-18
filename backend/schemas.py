from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class Patient(BaseModel):
    name: str = ""
    age: int = 0
    patientId: str = ""


class ReportItem(BaseModel):
    name: str
    value: float
    unit: str
    refLow: float = 0
    refHigh: float = 0
    refText: str = ""
    refSource: str = "unknown"
    status: str

    @field_validator("name", "unit", "status")
    @classmethod
    def required_text(cls, value: str) -> str:
        if not str(value).strip():
            raise ValueError("field is required")
        return str(value).strip()


class Report(BaseModel):
    id: str
    patient: Patient
    reportType: str
    hospital: str
    date: str
    items: List[ReportItem] = Field(default_factory=list)

    @field_validator("id", "reportType", "hospital", "date")
    @classmethod
    def required_text(cls, value: str) -> str:
        if not str(value).strip():
            raise ValueError("field is required")
        return str(value).strip()

    @field_validator("items")
    @classmethod
    def require_items(cls, value: List[ReportItem]) -> List[ReportItem]:
        if not value:
            raise ValueError("items is required")
        return value


class ImportReportsRequest(BaseModel):
    reports: Optional[List[Report]] = None

