import os
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from supabase import create_client

from app.db import get_cursor

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
BUCKET = "annotation-volumes"

router = APIRouter()

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class Landmark(BaseModel):
    id: str
    label: str
    plane: str
    slice: int
    x: float
    y: float
    radius: float
    name: str | None = None
    color: str | None = None
    tool: str


class SegmentationStroke(BaseModel):
    id: str
    label: str
    plane: str
    slice: int
    x: float
    y: float
    radius: float
    source: str


class SaveAnnotationsBody(BaseModel):
    annotations: list[Landmark] = []
    segmentations: list[SegmentationStroke] = []
    status: str = "in-progress"
    notes: str = ""
    modality: str | None = None
    region: str | None = None


class CaseMetaPatch(BaseModel):
    status: str | None = None
    notes: str | None = None


# ---------------------------------------------------------------------------
# Case endpoints
# ---------------------------------------------------------------------------

@router.get("/cases")
def list_cases():
    with get_cursor() as cur:
        cur.execute("""
            SELECT
                c.id,
                c.status,
                c.modality,
                c.region,
                c.volume_file_name,
                c.updated_at,
                COUNT(DISTINCT l.id)  AS landmark_count,
                COUNT(DISTINCT s.id)  AS stroke_count
            FROM annotation_cases c
            LEFT JOIN annotation_landmarks l ON l.case_id = c.id
            LEFT JOIN annotation_segmentation_strokes s ON s.case_id = c.id
            GROUP BY c.id
            ORDER BY c.updated_at DESC
        """)
        return cur.fetchall()


@router.get("/cases/{case_id}")
def get_case(case_id: str):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM annotation_cases WHERE id = %s", (case_id,))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return row


@router.patch("/cases/{case_id}")
def patch_case(case_id: str, body: CaseMetaPatch):
    with get_cursor() as cur:
        cur.execute("SELECT id FROM annotation_cases WHERE id = %s", (case_id,))
        if cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="Case not found")

        fields: list[str] = ["updated_at = NOW()"]
        values: list[Any] = []

        if body.status is not None:
            fields.append("status = %s")
            values.append(body.status)
        if body.notes is not None:
            fields.append("notes = %s")
            values.append(body.notes)

        values.append(case_id)
        cur.execute(
            f"UPDATE annotation_cases SET {', '.join(fields)} WHERE id = %s",
            values,
        )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Annotation CRUD
# ---------------------------------------------------------------------------

@router.post("/{case_id}")
def save_annotations(case_id: str, body: SaveAnnotationsBody):
    with get_cursor() as cur:
        # Upsert the case row
        cur.execute("""
            INSERT INTO annotation_cases (id, modality, region, status, notes, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (id) DO UPDATE SET
                modality   = EXCLUDED.modality,
                region     = EXCLUDED.region,
                status     = EXCLUDED.status,
                notes      = EXCLUDED.notes,
                updated_at = NOW()
        """, (case_id, body.modality, body.region, body.status, body.notes))

        # Replace all landmarks for this case
        cur.execute("DELETE FROM annotation_landmarks WHERE case_id = %s", (case_id,))
        if body.annotations:
            cur.executemany("""
                INSERT INTO annotation_landmarks
                    (id, case_id, label, plane, slice, x, y, radius, name, color, tool)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, [
                (a.id, case_id, a.label, a.plane, a.slice, a.x, a.y, a.radius, a.name, a.color, a.tool)
                for a in body.annotations
            ])

        # Replace all segmentation strokes for this case
        cur.execute("DELETE FROM annotation_segmentation_strokes WHERE case_id = %s", (case_id,))
        if body.segmentations:
            cur.executemany("""
                INSERT INTO annotation_segmentation_strokes
                    (id, case_id, label, plane, slice, x, y, radius, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, [
                (s.id, case_id, s.label, s.plane, s.slice, s.x, s.y, s.radius, s.source)
                for s in body.segmentations
            ])

    return {"ok": True, "caseId": case_id}


@router.get("/{case_id}")
def load_annotations(case_id: str):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM annotation_cases WHERE id = %s", (case_id,))
        case = cur.fetchone()

        cur.execute(
            "SELECT * FROM annotation_landmarks WHERE case_id = %s ORDER BY created_at",
            (case_id,),
        )
        landmarks = cur.fetchall()

        cur.execute(
            "SELECT * FROM annotation_segmentation_strokes WHERE case_id = %s ORDER BY created_at",
            (case_id,),
        )
        strokes = cur.fetchall()

    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    return {
        "case": case,
        "annotations": landmarks,
        "segmentations": strokes,
    }


@router.get("/{case_id}/export")
def export_annotations(case_id: str):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM annotation_cases WHERE id = %s", (case_id,))
        case = cur.fetchone()

        cur.execute(
            "SELECT * FROM annotation_landmarks WHERE case_id = %s ORDER BY created_at",
            (case_id,),
        )
        landmarks = cur.fetchall()

        cur.execute(
            "SELECT * FROM annotation_segmentation_strokes WHERE case_id = %s ORDER BY created_at",
            (case_id,),
        )
        strokes = cur.fetchall()

    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    label_counts: dict[str, int] = {}
    for lm in landmarks:
        label_counts[lm["label"]] = label_counts.get(lm["label"], 0) + 1

    seg_counts: dict[str, int] = {}
    for s in strokes:
        seg_counts[s["label"]] = seg_counts.get(s["label"], 0) + 1

    return {
        "caseId": case_id,
        "modality": case["modality"],
        "region": case["region"],
        "status": case["status"],
        "notes": case["notes"],
        "volume": {
            "url": case["volume_url"],
            "fileName": case["volume_file_name"],
            "dims": case["volume_dims"],
        } if case["volume_file_name"] else None,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "annotationCount": len(landmarks),
        "segmentationStrokeCount": len(strokes),
        "labels": label_counts,
        "segmentationLabels": seg_counts,
        "annotations": [dict(lm) for lm in landmarks],
        "segmentation": {
            "representation": "brush-stroke mask overlay",
            "strokes": [dict(s) for s in strokes],
        },
        "backendContract": {
            "save": f"POST /api/annotations/{case_id}",
            "load": f"GET /api/annotations/{case_id}",
            "export": f"GET /api/annotations/{case_id}/export",
        },
    }


# ---------------------------------------------------------------------------
# Volume upload → Vercel Blob
# ---------------------------------------------------------------------------

@router.post("/{case_id}/volume")
async def upload_volume(case_id: str, file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith((".nii", ".nii.gz")):
        raise HTTPException(status_code=400, detail="Only .nii or .nii.gz files are supported.")

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Supabase storage not configured.")

    contents = await file.read()
    storage_path = f"{case_id}/{file.filename}"

    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    sb.storage.from_(BUCKET).upload(
        path=storage_path,
        file=contents,
        file_options={"content-type": "application/octet-stream", "upsert": "true"},
    )

    public_url = sb.storage.from_(BUCKET).get_public_url(storage_path)

    with get_cursor() as cur:
        cur.execute("""
            INSERT INTO annotation_cases (id, volume_url, volume_file_name, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (id) DO UPDATE SET
                volume_url       = EXCLUDED.volume_url,
                volume_file_name = EXCLUDED.volume_file_name,
                updated_at       = NOW()
        """, (case_id, public_url, file.filename))

    return {"url": public_url, "fileName": file.filename, "caseId": case_id}
