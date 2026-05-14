from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.ml.spine_predictor import predict_spine_landmarks

router = APIRouter()

UPLOAD_DIR = Path("app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/predict-landmarks")
async def predict_landmarks(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".nii", ".nii.gz")):
        raise HTTPException(status_code=400, detail="Only .nii or .nii.gz files are supported.")

    safe_filename = f"{uuid4()}_{file.filename}"
    file_path = UPLOAD_DIR / safe_filename

    try:
        contents = await file.read()
        file_path.write_bytes(contents)

        result = predict_spine_landmarks(str(file_path))
        return result

    finally:
        if file_path.exists():
            file_path.unlink()