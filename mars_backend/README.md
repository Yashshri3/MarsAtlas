# Mars Explorer Backend

Python + FastAPI API for the Mars exploration frontend.

## Setup (Windows PowerShell)

Open a terminal in this `mars_backend` folder and run:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Open `http://127.0.0.1:8000/` for the status response and `http://127.0.0.1:8000/docs` for interactive API documentation.

## Endpoints

- `GET /health` — server health
- `GET /api/mars/locations` — five curated exploration targets
- `GET /api/mars/locations/{location_id}` — one target
- `POST /api/terrain/sample` — intentionally returns 503 until a real MOLA DEM is configured
- `POST /api/routes/plan` — intentionally returns 503 until real terrain data and A* are configured
- `POST /api/assistant/chat` — connection stub; no live model integration yet

Scientific elevation, slope, hazard, and safe-route values are not fabricated. The next implementation step is installing and parsing a documented MOLA MEGDR grid.
