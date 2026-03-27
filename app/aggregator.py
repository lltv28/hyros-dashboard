from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional


def _booly(value: Any) -> Optional[bool]:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    s = str(value).strip().lower()
    if s in {"true", "1", "yes", "y"}:
        return True
    if s in {"false", "0", "no", "n"}:
        return False
    return None


def _as_float(v: Any) -> float:
    try:
        return float(v)
    except Exception:
        return 0.0


def _iso(v: Any) -> Optional[str]:
    if not v:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00")).isoformat()
    except Exception:
        return None


def _normalize_sale(row: Dict[str, Any]) -> Dict[str, Any]:
    lead = row.get("lead") or {}
    first_source = row.get("firstSource") or {}
    traffic_source = first_source.get("trafficSource") or {}
    category = first_source.get("category") or {}
    ad_source = first_source.get("adSource") or {}
    source_link_ad = first_source.get("sourceLinkAd") or {}
    product = row.get("product") or {}
    usd_price = row.get("usdPrice") or {}
    price = row.get("price") or {}
    tags = lead.get("tags") or []

    platform = ad_source.get("platform") or traffic_source.get("name") or "Unknown"
    campaign = category.get("name") or "Unknown"
    booked_call = "$booked-call" in tags

    return {
        "id": row.get("id"),
        "created_at": _iso(row.get("_created_dt") or row.get("creationDate")),
        "platform": platform,
        "traffic_source": traffic_source.get("name") or platform,
        "campaign": campaign,
        "qualified": bool(row.get("qualified")),
        "booked_call": booked_call,
        "customer": lead.get("email") or row.get("email") or "",
        "customer_name": " ".join(part for part in [lead.get("firstName"), lead.get("lastName")] if part).strip(),
        "amount": _as_float(usd_price.get("price") or price.get("price") or 0),
        "product": product.get("name") or "",
        "ad_name": source_link_ad.get("name") or "",
        "ad_account_id": ad_source.get("adAccountId") or "",
        "source_name": first_source.get("name") or "",
        "tags": tags,
    }


def aggregate_metrics(sales: List[Dict[str, Any]], filters: Dict[str, Optional[Any]]) -> Dict[str, Any]:
    platform_f = filters.get("platform")
    campaign_f = filters.get("campaign")
    qualified_f = _booly(filters.get("qualified"))
    booked_call_f = _booly(filters.get("booked_call"))

    normalized = [_normalize_sale(row) for row in sales]
    platforms = sorted({row["platform"] for row in normalized if row.get("platform")})
    campaigns = sorted({row["campaign"] for row in normalized if row.get("campaign")})

    filtered: List[Dict[str, Any]] = []
    for row in normalized:
        if platform_f and row["platform"] != platform_f:
            continue
        if campaign_f and row["campaign"] != campaign_f:
            continue
        if qualified_f is not None and row["qualified"] != qualified_f:
            continue
        if booked_call_f is not None and row["booked_call"] != booked_call_f:
            continue
        filtered.append(row)

    total_sales = len(filtered)
    total_revenue = sum(item["amount"] for item in filtered)
    qualified_count = sum(1 for item in filtered if item["qualified"])
    booked_call_count = sum(1 for item in filtered if item["booked_call"])

    trend_map = defaultdict(lambda: {"sales": 0, "revenue": 0.0})
    for item in filtered:
        dt = item["created_at"]
        if not dt:
            continue
        day = dt.split("T", 1)[0]
        trend_map[day]["sales"] += 1
        trend_map[day]["revenue"] += item["amount"]

    trend = [
        {"date": day, "sales": values["sales"], "revenue": round(values["revenue"], 2)}
        for day, values in sorted(trend_map.items())
    ]

    return {
        "kpis": {
            "total_sales": total_sales,
            "total_revenue": round(total_revenue, 2),
            "qualified_count": qualified_count,
            "booked_call_count": booked_call_count,
        },
        "trend": trend,
        "table": filtered,
        "platforms": platforms,
        "campaigns": campaigns,
    }

