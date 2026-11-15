
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.data import LOCATIONS

router = APIRouter(
    prefix="/api/hazards",
    tags=["Mars hazard analysis"]
)


class HazardRequest(BaseModel):
    location_id: str = Field(min_length=1)


@router.post("/analyze")
def analyze_hazards(request: HazardRequest):
    location = next(
        (item for item in LOCATIONS if item["id"] == request.location_id),
        None
    )

    if location is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Mars location not found")

    name = location["name"]

    known_considerations = {
        "olympus-mons": [
            {
                "category": "Steep terrain",
                "status": "CAUTION",
                "description": "The location description identifies steep terrain requiring caution."
            }
        ],
        "valles-marineris": [
            {
                "category": "Major terrain relief",
                "status": "REVIEW REQUIRED",
                "description": "The canyon system has major relief and potentially hazardous slopes."
            }
        ]
    }

    findings = known_considerations.get(name.lower().replace(" ", "-"), [])

    if not findings:
        findings = [{
            "category": "Terrain assessment",
            "status": "DATA REQUIRED",
            "description": "No verified hazard assessment is available for this location."
        }]

    return {
        "status": "success",
        "location": name,
        "coordinates": {
            "latitude": location["latitude"],
            "longitude": location["longitude"]
        },
        "findings": findings,
        "scientific_validation": "PENDING_MOLA_DATA",
        "safety_score": None,
        "message": "These are preliminary location notes, not a verified rover safety assessment."
    }
