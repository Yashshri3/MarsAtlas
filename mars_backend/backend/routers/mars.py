from fastapi import APIRouter, HTTPException
from backend.data import LOCATIONS

router = APIRouter(prefix="/api/mars", tags=["Mars"])


@router.get("/locations")
def get_locations():
    return {"count": len(LOCATIONS), "locations": LOCATIONS}


@router.get("/locations/{location_id}")
def get_location(location_id: str):
    for location in LOCATIONS:
        if location["id"] == location_id:
            return location
    raise HTTPException(status_code=404, detail="Mars location not found")
