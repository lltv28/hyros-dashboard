from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient

from app.aggregator import _normalize_sale
from app.hyros_client import HyrosClient
from app.main import app


client = TestClient(app)


def _sale(**overrides):
    base = {
        "id": "sale-1",
        "creationDate": "2026-01-10T12:00:00Z",
        "qualified": False,
        "lead": {"tags": []},
        "firstSource": {"adSource": {}, "trafficSource": {}, "category": {}},
    }
    base.update(overrides)
    return base


def test_table_row_rendering_avoids_innerhtml_for_user_data():
    script = Path("app/static/app.js").read_text(encoding="utf-8")
    assert "tr.innerHTML" not in script


def test_normalize_sale_coerces_qualified_string_false_to_false():
    normalized = _normalize_sale(_sale(qualified="false"))
    assert normalized["qualified"] is False


def test_normalize_sale_coerces_booked_call_string_true_to_true():
    normalized = _normalize_sale(_sale(booked_call="true", lead={"tags": []}))
    assert normalized["booked_call"] is True


def test_dashboard_rejects_start_after_end_with_400(monkeypatch):
    async def _should_not_fetch(self, start, end, max_pages=20, page_size=200):
        raise AssertionError("fetch_sales should not be called for invalid date ranges")

    monkeypatch.setattr(HyrosClient, "fetch_sales", _should_not_fetch)

    response = client.get(
        "/api/dashboard",
        params={"start": "2026-01-10", "end": "2026-01-09"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "start must be on or before end"}


async def _fake_fetch_with_warning(self, start, end, max_pages=20, page_size=200):
    self.last_fetch_warning = "HYROS pagination hit max_pages cap; results may be incomplete."
    return [
        {
            "id": "sale-1",
            "creationDate": "Thu Mar 26 16:59:24 UTC 2026",
            "_created_dt": None,
            "qualified": True,
            "lead": {"email": "buyer@example.com", "firstName": "Test", "lastName": "Buyer", "tags": []},
            "firstSource": {
                "name": "Source A",
                "trafficSource": {"name": "facebook"},
                "category": {"name": "Campaign A"},
                "adSource": {"platform": "FACEBOOK", "adAccountId": "123"},
                "sourceLinkAd": {"name": "Ad A"},
            },
            "usdPrice": {"price": 4200.0},
            "product": {"name": "Flagship"},
        }
    ]


def test_dashboard_surfaces_pagination_cap_warning(monkeypatch):
    monkeypatch.setattr(HyrosClient, "fetch_sales", _fake_fetch_with_warning)

    response = client.get(
        "/api/dashboard",
        params={"start": "2026-01-01", "end": "2026-01-31"},
    )

    assert response.status_code == 200
    assert response.json().get("warning") == "HYROS pagination hit max_pages cap; results may be incomplete."


async def _paged_payload(path, params=None):
    page = (params or {}).get("page")
    if page == 1:
        return [
            {"id": "old", "creationDate": "2024-12-01T12:00:00Z"},
            {"id": "unknown", "creationDate": "not-a-date"},
        ]
    if page == 2:
        return [{"id": "in-range", "creationDate": "2025-01-05T12:00:00Z"}]
    return []


async def _always_full_page(path, params=None):
    page = (params or {}).get("page")
    return [{"id": f"sale-{page}", "creationDate": "2026-01-15T12:00:00Z"}]


def test_fetch_sales_does_not_early_stop_when_page_has_unparseable_dates():
    hyros = HyrosClient()
    hyros.api_key = "test-key"
    hyros._get = _paged_payload

    rows = run_async(hyros.fetch_sales(start=date(2025, 1, 1), end=date(2025, 1, 31), max_pages=5, page_size=2))

    ids = {row["id"] for row in rows}
    assert "in-range" in ids


def test_fetch_sales_sets_warning_when_max_pages_cap_is_hit():
    hyros = HyrosClient()
    hyros.api_key = "test-key"
    hyros._get = _always_full_page

    rows = run_async(hyros.fetch_sales(start=date(2026, 1, 1), end=date(2026, 1, 31), max_pages=2, page_size=1))

    assert len(rows) == 2
    warning = getattr(hyros, "last_fetch_warning", None)
    assert warning is not None
    assert "max_pages" in warning


def run_async(awaitable):
    import asyncio

    return asyncio.run(awaitable)
