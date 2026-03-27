# HYROS Reporting Dashboard (Internal)

Read-only internal dashboard built with FastAPI. No Node.js required.

## Features
- Filters: date range, platform/traffic source, campaign, qualified, booked-call
- KPI cards: total sales, revenue, qualified count, booked-call count
- Trend chart (sales + revenue) via Chart.js CDN
- Results table with the filtered sales
- Server-side HYROS API integration using key at `/app/.hermes/secure/hyros_api_key.txt`

## Prereqs
- Python 3.10+
- HYROS API key available at `/app/.hermes/secure/hyros_api_key.txt`
  - Optional: set `HYROS_API_KEY` env var for local testing if the file is not present

## Setup
```
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run
```
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Open http://localhost:8000 in your browser.

Note: If the HYROS key is missing or the API is unreachable, the dashboard still loads but shows an empty dataset with a warning banner.

## Project Layout
- `app/main.py` — FastAPI app and routes
- `app/hyros_client.py` — HYROS client: reads API key from `/app/.hermes/secure/hyros_api_key.txt`, fetches paginated sales
- `app/aggregator.py` — Filtering + KPI aggregation + trend building
- `app/templates/index.html` — Minimal UI
- `app/static/` — CSS + JS
- `tests/test_smoke.py` — App boot + basic endpoint smoke test

## Smoke Tests
Run the smoke tests locally:
```
pytest -q
```
The tests do not call HYROS; they only verify app boot and endpoint shapes.

## Environment
- Base URL can be changed with `HYROS_API_BASE` env var (defaults to `https://api.hyros.com`).

## Internal & Read-only
This app only exposes read-only GET endpoints and does not modify any HYROS data.

