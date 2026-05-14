from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.inference_routes import router as inference_router

app = FastAPI(title="Spine Landmark AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inference_router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}