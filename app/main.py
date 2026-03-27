import os
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .aggregator import aggregate_metrics
from .hyros_client import HYROS_API_KEY_PATH, HyrosClient, HyrosError


BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="HYROS Reporting Dashboard", version="1.0.0")

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/debug/env")
def debug_env():
    return {
        "has_hyros_api_key_env": bool(os.getenv("HYROS_API_KEY")),
        "hyros_key_path": HYROS_API_KEY_PATH,
        "hyros_key_path_exists": Path(HYROS_API_KEY_PATH).exists(),
    }


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/dashboard")
async def api_dashboard(
    start: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end: date = Query(..., description="End date (YYYY-MM-DD)"),
    platform: Optional[str] = Query(None),
    campaign: Optional[str] = Query(None),
    qualified: Optional[bool] = Query(None),
    booked_call: Optional[bool] = Query(None),
):
    client = HyrosClient()
    try:
        sales = await client.fetch_sales(start=start, end=end)
    except HyrosError as e:
        return JSONResponse(
            {
                "error": str(e),
                "kpis": {
                    "total_sales": 0,
                    "total_revenue": 0.0,
                    "qualified_count": 0,
                    "booked_call_count": 0,
                },
                "trend": [],
                "table": [],
                "platforms": [],
                "campaigns": [],
                "warning": "HYROS API unavailable or key missing; returning empty dataset.",
            }
        )

    metrics = aggregate_metrics(
        sales,
        filters={
            "platform": platform,
            "campaign": campaign,
            "qualified": qualified,
            "booked_call": booked_call,
        },
    )

    return metrics


if __name__ == "__main__":
    # Useful for `python app/main.py` quick run
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)

