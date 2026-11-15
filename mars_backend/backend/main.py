from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import assistant, mars, routes, terrain

app = FastAPI(
    title="Mars Explorer API",
    description="Backend API for the NASA Space Apps Martian exploration prototype.",
    version="0.1.0",
)

# Vite's default development server runs on localhost:5173.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mars.router)
app.include_router(terrain.router)
app.include_router(routes.router)
app.include_router(assistant.router)


@app.get("/")
def root():
    return {"name": "Mars Explorer API", "status": "online", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
