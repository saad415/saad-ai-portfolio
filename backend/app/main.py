from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.inference_routes import router as inference_router
from app.api.uterus_routes import router as uterus_router
from app.api.annotation_routes import router as annotation_router
from app.db import init_pool, create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    create_tables()
    yield


app = FastAPI(title="Medical Landmark AI Backend", lifespan=lifespan)

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
app.include_router(annotation_router, prefix="/api/annotations")


@app.get("/health")
def health():
    return {"status": "ok"}
