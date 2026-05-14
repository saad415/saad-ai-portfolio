from fastapi import APIRouter, UploadFile, File

router = APIRouter()

@router.post("/predict-landmarks")
async def predict_landmarks(file: UploadFile = File(...)):
    return {
        "status": "completed",
        "filename": file.filename,
        "s1Detected": True,
        "landmarks": [
            {"label": "L5", "voxel": [120, 85, 42], "confidence": 0.94, "type": "Lumbar"},
            {"label": "S1", "voxel": [123, 110, 45], "confidence": 0.96, "type": "Sacral"},
        ],
    }