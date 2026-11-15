from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/terrain", tags=["Terrain"])


class TerrainRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


@router.post("/sample")
def sample_terrain(request: TerrainRequest):
    # Deliberately fail closed until a real MOLA DEM is installed.
    # Never return fabricated elevation/slope values as scientific measurements.
    raise HTTPException(
        status_code=503,
        detail=(
            "MOLA elevation data is not configured yet. Install the MOLA MEGDR "
            "dataset before requesting scientific terrain measurements."
        ),
    )
