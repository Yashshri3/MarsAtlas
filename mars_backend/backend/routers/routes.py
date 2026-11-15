
from math import acos, asin, atan2, cos, degrees, radians, sin, sqrt
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/routes", tags=["Route planning"])

MARS_RADIUS_KM = 3390.0


class RouteRequest(BaseModel):
    start_latitude: float = Field(ge=-90, le=90)
    start_longitude: float = Field(ge=-180, le=180)
    end_latitude: float = Field(ge=-90, le=90)
    end_longitude: float = Field(ge=-180, le=180)
    max_slope_degrees: float = Field(default=15, gt=0, le=90)


def to_vector(lat, lon):
    lat_r = radians(lat)
    lon_r = radians(lon)

    return (
        cos(lat_r) * cos(lon_r),
        cos(lat_r) * sin(lon_r),
        sin(lat_r),
    )


def normalize_longitude(lon):
    return (lon + 180) % 360 - 180


def calculate_route(start_lat, start_lon, end_lat, end_lon):
    start = to_vector(start_lat, start_lon)
    end = to_vector(end_lat, end_lon)

    dot = sum(a * b for a, b in zip(start, end))
    dot = max(-1.0, min(1.0, dot))

    angle = acos(dot)
    distance_km = MARS_RADIUS_KM * angle

    # Generate approximately one waypoint every 100 km.
    segments = max(1, min(100, int(distance_km / 100) + 1))

    waypoints = []

    for i in range(segments + 1):
        t = i / segments

        if angle < 1e-10:
            vector = start
        elif abs(sin(angle)) < 1e-10:
            # Antipodal points have no unique great-circle path.
            raise ValueError(
                "The selected points are nearly antipodal. "
                "Choose a different destination."
            )
        else:
            a = sin((1 - t) * angle) / sin(angle)
            b = sin(t * angle) / sin(angle)

            vector = tuple(
                a * start[j] + b * end[j]
                for j in range(3)
            )

        x, y, z = vector

        lat = degrees(atan2(z, sqrt(x * x + y * y)))
        lon = degrees(atan2(y, x))

        waypoints.append({
            "latitude": round(lat, 6),
            "longitude": round(normalize_longitude(lon), 6),
        })

    return distance_km, waypoints


@router.post("/plan")
def plan_route(request: RouteRequest):
    try:
        distance_km, waypoints = calculate_route(
            request.start_latitude,
            request.start_longitude,
            request.end_latitude,
            request.end_longitude,
        )
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=str(exc))

    return {
        "status": "success",
        "distance_km": round(distance_km, 2),
        "route_type": "geodesic_preview",
        "hazard_aware": False,
        "mars_radius_km": MARS_RADIUS_KM,
        "start": {
            "latitude": request.start_latitude,
            "longitude": request.start_longitude,
        },
        "destination": {
            "latitude": request.end_latitude,
            "longitude": request.end_longitude,
        },
        "waypoints": waypoints,
        "message": (
            "Geodesic surface preview calculated. "
            "Terrain and slope avoidance are not yet enabled."
        ),
    }
