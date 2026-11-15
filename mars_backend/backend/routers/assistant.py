
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.data import LOCATIONS

router = APIRouter(
    prefix="/api/assistant",
    tags=["Mission assistant"]
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    location_id: str | None = None


@router.post("/chat")
def chat(request: ChatRequest):
    question = request.message.strip().lower()

    location = next(
        (
            item for item in LOCATIONS
            if request.location_id
            and item["id"] == request.location_id
        ),
        None
    )

    if location is None:
        location = next(
            (
                item for item in LOCATIONS
                if item["name"].lower() in question
            ),
            None
        )

    if location:
        answer = (
            f"{location['name']} is located in "
            f"{location['region']}. "
            f"{location['description']} "
            f"Coordinates: {location['latitude']}° latitude, "
            f"{location['longitude']}° longitude."
        )

    elif any(word in question for word in ["mars", "planet"]):
        answer = (
            "Mars is the fourth planet from the Sun. "
            "This mission prototype provides information about "
            "five curated exploration targets: Jezero Crater, "
            "Gale Crater, Olympus Mons, Valles Marineris "
            "and Utopia Planitia."
        )

    elif any(word in question for word in ["route", "distance", "travel"]):
        answer = (
            "The Mars Explorer backend supports geodesic route "
            "distance calculations and waypoint generation. "
            "Terrain-aware rover navigation is not yet enabled."
        )

    elif any(word in question for word in ["hazard", "safe", "safety", "risk"]):
        answer = (
            "Scientific hazard assessment requires numerical "
            "elevation and terrain roughness data. MOLA integration "
            "is pending, so this prototype cannot yet provide "
            "verified terrain safety scores."
        )

    else:
        answer = (
            "I can currently help with the five built-in Mars "
            "exploration locations, basic Mars information, "
            "route planning capabilities and project data status. "
            "Try asking about Jezero Crater, Gale Crater or Mars routes."
        )

    return {
        "answer": answer,
        "source_status": "local_mars_dataset",
        "location": location["name"] if location else None,
        "ai_model_connected": False
    }
