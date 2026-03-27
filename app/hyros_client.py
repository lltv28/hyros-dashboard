import os
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

import httpx


HYROS_API_BASE = os.getenv("HYROS_API_BASE", "https://api.hyros.com/v1")
HYROS_API_KEY_PATH = os.getenv("HYROS_API_KEY_PATH", "/app/.hermes/secure/hyros_api_key.txt")


class HyrosError(Exception):
    pass


def _read_api_key() -> Optional[str]:
    try:
        with open(HYROS_API_KEY_PATH, "r", encoding="utf-8") as f:
            key = f.read().strip()
            if key:
                return key
    except FileNotFoundError:
        pass

    key = os.getenv("HYROS_API_KEY")
    return key.strip() if key else None


def _parse_hyros_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None

    text = str(value).strip()
    for fmt in (
        "%a %b %d %H:%M:%S %Z %Y",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
    ):
        try:
            dt = datetime.strptime(text, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


class HyrosClient:
    def __init__(self):
        self.api_key = _read_api_key()
        self.last_fetch_warning: Optional[str] = None

    def _headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {
            "Accept": "application/json",
            "User-Agent": "hyros-dashboard/1.0",
        }
        if self.api_key:
            headers["API-Key"] = self.api_key
            headers["X-API-Key"] = self.api_key
        return headers

    async def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = HYROS_API_BASE.rstrip("/") + path
        timeout = httpx.Timeout(20.0, read=40.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, headers=self._headers(), params=params or {})
            if resp.status_code >= 400:
                raise HyrosError(f"HYROS error {resp.status_code}: {resp.text[:200]}")
            return resp.json()

    async def fetch_user_info(self) -> Dict[str, Any]:
        if not self.api_key:
            raise HyrosError(f"HYROS API key not found at {HYROS_API_KEY_PATH}.")
        return await self._get("/api/v1.0/user-info")

    async def fetch_sales(self, start: date, end: date, max_pages: int = 20, page_size: int = 200) -> List[Dict[str, Any]]:
        if not self.api_key:
            raise HyrosError(f"HYROS API key not found at {HYROS_API_KEY_PATH}.")

        self.last_fetch_warning = None
        results: List[Dict[str, Any]] = []
        seen_ids = set()

        for page in range(1, max_pages + 1):
            payload = await self._get("/api/v1.0/sales", params={"page": page, "limit": page_size})
            if isinstance(payload, list):
                data = payload
            else:
                data = payload.get("result") or payload.get("data") or payload.get("items") or []

            if not data:
                break

            new_rows = 0
            for row in data:
                row_id = row.get("id")
                if row_id and row_id in seen_ids:
                    continue
                if row_id:
                    seen_ids.add(row_id)
                row["_created_dt"] = _parse_hyros_datetime(row.get("creationDate") or row.get("created_at") or row.get("createdAt"))
                results.append(row)
                new_rows += 1

            if new_rows == 0:
                break

            page_dates = []
            all_rows_have_dates = True
            for row in data:
                if not isinstance(row, dict):
                    all_rows_have_dates = False
                    continue
                created_dt = row.get("_created_dt")
                if created_dt is None:
                    all_rows_have_dates = False
                    continue
                page_dates.append(created_dt)

            if all_rows_have_dates and page_dates and all(dt.date() < start for dt in page_dates):
                break
        else:
            self.last_fetch_warning = f"HYROS pagination hit max_pages={max_pages}; results may be incomplete."

        return [row for row in results if row.get("_created_dt") and start <= row["_created_dt"].date() <= end]
