from fastapi.testclient import TestClient

from app.hyros_client import HyrosClient
from app.main import app


client = TestClient(app)


async def _fake_fetch_sales(self, start, end, max_pages=20, page_size=200):
    return [
        {
            "id": "sale-1",
            "creationDate": "Thu Mar 26 16:59:24 UTC 2026",
            "_created_dt": None,
            "qualified": True,
            "lead": {
                "email": "buyer@example.com",
                "firstName": "Test",
                "lastName": "Buyer",
                "tags": ["$booked-call"],
            },
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


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_dashboard_shape(monkeypatch):
    monkeypatch.setattr(HyrosClient, "fetch_sales", _fake_fetch_sales)
    r = client.get("/api/dashboard", params={"start": "2025-01-01", "end": "2025-01-02"})
    assert r.status_code == 200
    j = r.json()
    assert "kpis" in j and "trend" in j and "table" in j
    assert set(j["kpis"].keys()) == {"total_sales", "total_revenue", "qualified_count", "booked_call_count"}
    assert j["kpis"]["total_sales"] == 1
    assert j["kpis"]["booked_call_count"] == 1
    assert j["table"][0]["campaign"] == "Campaign A"

