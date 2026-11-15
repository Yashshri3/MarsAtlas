from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/routes", tags=["Route planning"])


class RouteRequest(BaseModel):
    start_latitude: float = Field(ge=-90, le=90)
    start_longitude: float = Field(ge=-180, le=180)
    end_latitude: float = Field(ge=-90, le=90)
    end_longitude: float = Field(ge=-180, le=180)
    max_slope_degrees: float = Field(default=15, gt=0, le=90)


@router.post("/plan")
def plan_route(request: RouteRequest):
    # A* must run against a real elevation/roughness grid. Until that grid is
    # installed, do not present a straight line as a safe route.
    raise HTTPException(
        status_code=503,
        detail=(
            "Route planning is not available yet: the MOLA terrain grid and "
            "A* cost surface have not been configured."
        ),
    )
