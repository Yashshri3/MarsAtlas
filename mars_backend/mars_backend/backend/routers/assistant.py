from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/assistant", tags=["Mission assistant"])


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    location_id: str | None = None


@router.post("/chat")
def chat(request: ChatRequest):
    return {
        "answer": (
            "The mission assistant API is connected, but its NASA-data retrieval "
            "and language-model integration have not been configured yet. "
            "I won't invent terrain or safety facts."
        ),
        "source_status": "not_configured",
        "received_location_id": request.location_id,
    }
