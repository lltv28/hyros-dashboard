# HYROS Reporting Dashboard v1

Goal: Build a brand new internal read-only HYROS reporting dashboard backed by the existing HYROS API key on this machine.

Scope:
- Python-based web app with no Node.js dependency
- Server-side HYROS API integration using `/app/.hermes/secure/hyros_api_key.txt`
- Internal read-only dashboard with filters
- KPI cards, trend chart, and attribution/sales table
- Local run + verification

Recommended approach:
- Use FastAPI + simple server-rendered/static frontend assets
- Add a small HYROS client layer that fetches paginated sales data
- Normalize/aggregate HYROS sales records into dashboard metrics
- Provide filters for date range, platform/traffic source, campaign, qualified status, and booked-call status
- Expose a JSON API endpoint for filtered dashboard data
- Render a lightweight frontend using Chart.js CDN and plain HTML/CSS/JS

Key endpoints/data already validated:
- Base: https://api.hyros.com/v1
- Health/user endpoint: /api/v1.0/user-info
- Sales endpoint: /api/v1.0/sales?page=1&limit=1

Expected deliverables:
- runnable app in this folder
- requirements file
- README with startup instructions
- local smoke test showing app boots and returns dashboard data
