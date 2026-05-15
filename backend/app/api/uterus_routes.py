from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.ml.uterus_predictor import predict_uterus_landmarks

router = APIRouter()

UPLOAD_DIR = Path("app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/predict")
async def predict_uterus(
    volume: UploadFile = File(...),
    segmentation: UploadFile = File(...),
):
    for f in (volume, segmentation):
        if not f.filename.lower().endswith((".nii", ".nii.gz")):
            raise HTTPException(status_code=400, detail=f"{f.filename}: only .nii or .nii.gz supported.")

    uid = uuid4()
    vol_path = UPLOAD_DIR / f"{uid}_vol_{volume.filename}"
    seg_path = UPLOAD_DIR / f"{uid}_seg_{segmentation.filename}"

    try:
        vol_path.write_bytes(await volume.read())
        seg_path.write_bytes(await segmentation.read())
        return predict_uterus_landmarks(str(vol_path), str(seg_path))
    finally:
        for p in (vol_path, seg_path):
            if p.exists():
                p.unlink()
