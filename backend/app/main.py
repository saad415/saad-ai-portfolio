from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.inference_routes import router as inference_router
from app.api.uterus_routes import router as uterus_router

app = FastAPI(title="Medical Landmark AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "https://www.saadahmad.de",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inference_router, prefix="/api")
app.include_router(uterus_router, prefix="/api/uterus")

@app.get("/health")
def health():
    return {"status": "ok"}