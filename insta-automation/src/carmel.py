"""Fetch circulars from the school backend (same contract as the portal)."""

from __future__ import annotations

import hashlib

import requests

PAGE = 10


def fetch_page(
    phone: str,
    school_id: str,
    offset: int = 0,
    count: int = PAGE,
    base: str = "https://mob.parentconnect.in/ssdiary/parentApp",
    timeout: int = 20,
) -> list[dict]:
    url = f"{base.rstrip('/')}/circulars/countwise"
    resp = requests.post(
        url,
        json={
            "phoneNumber": phone,
            "offset": offset,
            "count": count,
            "schoolId": school_id,
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


def fetch_latest(
    phone: str,
    school_id: str,
    limit: int = 20,
    base: str = "https://mob.parentconnect.in/ssdiary/parentApp",
) -> list[dict]:
    """Paginate date-grouped circulars, return newest-first flat items."""
    groups: list[dict] = []
    offset = 0
    while len(groups) < limit:
        page = fetch_page(phone, school_id, offset=offset, count=PAGE, base=base)
        if not page:
            break
        groups.extend(page)
        offset += PAGE
        if len(page) < PAGE:
            break
    return flatten(groups)[:limit]


def stable_id(date: str, item: dict) -> str:
    # NOTE: the backend repeats id=1 across items, so the key must hash the
    # full content (not just the raw id) to stay unique per circular.
    blob = "|".join(
        [
            str(item.get("id") or ""),
            date or "",
            str(item.get("messageType") or ""),
            str(item.get("messageCircular") or item.get("message") or ""),
            str(item.get("sentAt") or ""),
        ]
    )
    return "h:" + hashlib.sha1(blob.encode("utf-8")).hexdigest()[:16]


def flatten(groups: list[dict]) -> list[dict]:
    out: list[dict] = []
    for g in groups or []:
        date = str(g.get("date") or "")
        for c in g.get("circularList") or []:
            if not isinstance(c, dict):
                continue
            out.append(
                {
                    "key": stable_id(date, c),
                    "date": date,
                    "title": str(c.get("messageType") or "Circular"),
                    "body": str(c.get("messageCircular") or c.get("message") or ""),
                    "sent_at": str(c.get("sentAt") or ""),
                    "raw_id": c.get("id"),
                }
            )
    return out
