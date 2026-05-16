from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, UploadFile, File, HTTPException

from app.ml.spine_predictor import predict_spine_landmarks

router = APIRouter()

UPLOAD_DIR = Path("app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

inference_jobs = {}


def update_job(job_id: str, **updates):
    if job_id in inference_jobs:
        inference_jobs[job_id].update(updates)


def run_inference_job(job_id: str, file_path: Path):
    def report_progress(progress: int, stage: str):
        update_job(
            job_id,
            progress=max(0, min(100, progress)),
            stage=stage,
            status="running",
        )

    try:
        report_progress(1, "Queued")
        result = predict_spine_landmarks(
            str(file_path),
            progress_callback=report_progress,
        )
        update_job(
            job_id,
            status="completed",
            progress=100,
            stage="Inference complete",
            result=result,
        )
    except Exception as exc:
        update_job(
            job_id,
            status="failed",
            stage="Inference failed",
            error=str(exc),
        )
    finally:
        if file_path.exists():
            file_path.unlink()


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


@router.post("/predict-landmarks/start")
async def start_predict_landmarks(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    if not file.filename.lower().endswith((".nii", ".nii.gz")):
        raise HTTPException(status_code=400, detail="Only .nii or .nii.gz files are supported.")

    job_id = str(uuid4())
    safe_filename = f"{job_id}_{file.filename}"
    file_path = UPLOAD_DIR / safe_filename

    contents = await file.read()
    file_path.write_bytes(contents)

    inference_jobs[job_id] = {
        "jobId": job_id,
        "status": "queued",
        "progress": 0,
        "stage": "Queued",
        "result": None,
        "error": None,
    }

    background_tasks.add_task(run_inference_job, job_id, file_path)

    return {
        "jobId": job_id,
        "status": "queued",
        "progress": 0,
        "stage": "Queued",
    }


@router.get("/predict-landmarks/progress/{job_id}")
async def get_predict_landmarks_progress(job_id: str):
    job = inference_jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Inference job not found.")

    return job
