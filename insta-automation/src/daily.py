"""Daily-report + activities fetch/format (same contracts as the portal).

Endpoints (all POST JSON to {base}):
  /dailyreport/dayReport                {date: JS Date.toString(), studentId}
  /dailyreport/homeWork/countwise       {studentId, offset, count} -> [{date, homeworkList}]
  /dailyreport/portionTaken/countwise   {studentId, offset, count} -> [{date, portionCoveredList}]
  /dailyreport/file/countwise           {studentId, offset, count} -> [{date, dailyReportFiles}]
  /dailyLMSReport/countwise             {studentId, offset, count, type}
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json

import requests

PAGE = 10
LMS_TYPES = ["HOMEWORK", "PORTION COVERED"]
DEFAULT_LMS_BASE = "https://ssdiary.com/ssdiary/Lms"  # portal UPSTREAM.lms

HISTORY = {
    "homework": ("homeWork", "homeworkList", "Homework"),
    "portion": ("portionTaken", "portionCoveredList", "Portion Taken"),
    "files": ("file", "dailyReportFiles", "Files & Images"),
}

DAY_SECTIONS = [
    ("paHomeworks", "Homework"),
    ("paPortioncovereds", "Portion Covered"),
    ("paClassTests", "Class Test"),
    ("paInstructions", "Instructions"),
    ("dailyReportFiles", "Files & Images"),
]

MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def today_ymd() -> str:
    return dt.date.today().isoformat()


def pretty_date(ymd: str) -> str:
    try:
        y, m, d = (int(x) for x in ymd.split("-"))
        return f"{d} {MONTHS[m - 1]} {y}"
    except (ValueError, IndexError):
        return ymd


def app_date(ymd: str) -> str:
    """'YYYY-MM-DD' -> JS Date.toString() payload the backend expects."""
    y, m, d = (int(x) for x in ymd.split("-"))
    date = dt.date(y, m, d)
    # JS: "Mon Sep 22 2026 00:00:00 GMT+0530 (India Standard Time)"
    return (
        date.strftime("%a %b %d %Y")
        + " 00:00:00 GMT+0530 (India Standard Time)"
    )


def _post(base: str, path: str, body: dict, timeout: int = 20):
    resp = requests.post(f"{base.rstrip('/')}{path}", json=body, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def day_report(student_id: int, ymd: str, base: str) -> dict:
    data = _post(base, "/dailyreport/dayReport", {"date": app_date(ymd), "studentId": student_id})
    return data if isinstance(data, dict) else {}


def history(kind: str, student_id: int, limit: int, base: str) -> list[dict]:
    """Flatten date-grouped history newest-first: [{key, date, item}]."""
    path, list_key, _ = HISTORY[kind]
    groups: list[dict] = []
    offset = 0
    while len(groups) < limit:
        page = _post(
            base, f"/dailyreport/{path}/countwise",
            {"studentId": student_id, "offset": offset, "count": PAGE},
        )
        if not isinstance(page, list) or not page:
            break
        groups.extend(page)
        offset += PAGE
        if len(page) < PAGE:
            break
    out: list[dict] = []
    for g in groups:
        date = str(g.get("date") or "")
        items = g.get(list_key) or []
        for it in items:
            if isinstance(it, dict):
                out.append({"key": item_key("hist", kind, student_id, it), "date": date, "item": it})
    return out[:limit]


def lms_activities(student_id: int, type_: str, limit: int, lms_base: str = DEFAULT_LMS_BASE) -> list[dict]:
    """Newest-first LMS activities with normalized description/attachments."""
    data = _post(
        lms_base, "/dailyLMSReport/countwise",
        {"studentId": student_id, "offset": 0, "count": max(limit, PAGE)},
    )
    raw = data if isinstance(data, list) else []
    out: list[dict] = []
    for a in raw[:limit]:
        if not isinstance(a, dict):
            continue
        desc = a.get("description")
        if desc == "null" or not desc:
            desc = "Nil"
        aid = a.get("activityId")
        key = f"lms:{student_id}:{type_}:{aid}" if aid else item_key("lms", type_, student_id, a)
        out.append({**a, "description": desc, "key": key, "lms_type": type_})
    return out


def item_key(prefix: str, kind: str, student_id: int, item: dict) -> str:
    blob = "|".join(
        [
            prefix, kind, str(student_id),
            str(item.get("id") or ""),
            str(item.get("subject") or ""),
            str(item.get("description") or ""),
            str(item.get("date") or item.get("sendDate") or ""),
            str(item.get("fileUrl") or ""),
        ]
    )
    return hashlib.sha1(blob.encode("utf-8")).hexdigest()[:16]


def file_name(url: str) -> str:
    try:
        from urllib.parse import unquote

        return unquote(url.split("?")[0].rstrip("/").split("/")[-1] or "file")
    except Exception:
        return "file"


def format_item(item: dict) -> str:
    parts: list[str] = []
    subject = str(item.get("subject") or "").strip()
    desc = str(item.get("description") or "").strip()
    head = " - ".join([p for p in (subject, desc) if p]) or "(no details)"
    parts.append(f"- {head}")
    meta = " · ".join(
        [p for p in (
            f"Ch: {item.get('chapters')}".strip() if str(item.get("chapters") or "").strip() else "",
            f"Pg: {item.get('pageNo')}".strip() if str(item.get("pageNo") or "").strip() else "",
            str(item.get("templateName") or "").strip(),
            str(item.get("date") or "").strip(),
        ) if p]
    )
    if meta and meta not in head:
        parts.append(f"  {meta}")
    url = str(item.get("fileUrl") or "").strip()
    if url:
        parts.append(f"  File: {file_name(url)}: {url}")
    return "\n".join(parts)


def format_day(student_label: str, ymd: str, report: dict) -> str:
    lines = [f"Day Report - {pretty_date(ymd)} ({student_label})"]
    for field, title in DAY_SECTIONS:
        items = report.get(field) or []
        items = [i for i in items if isinstance(i, dict)]
        if not items:
            continue
        lines.append(f"\n{title} ({len(items)}):")
        lines.extend(format_item(i) for i in items)
    return "\n".join(lines).strip()


def attachment_links(activity: dict) -> list[str]:
    """Best-effort links/names out of attachmentIdJson (portal never downloads them)."""
    raw = activity.get("attachmentIdJson")
    if isinstance(raw, str) and raw.strip():
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return []
    links: list[str] = []
    if isinstance(raw, dict):
        raw = [raw]
    if isinstance(raw, list):
        for entry in raw:
            if isinstance(entry, str) and entry.startswith("http"):
                links.append(entry)
            elif isinstance(entry, dict):
                for v in entry.values():
                    if isinstance(v, str) and v.startswith("http") and v not in links:
                        links.append(v)
    return links


def format_activity(activity: dict) -> str:
    lines = [
        f"Activity [{activity.get('lms_type', '')}] - {pretty_date(str(activity.get('sendDate') or ''))}"
        if activity.get("sendDate")
        else f"Activity [{activity.get('lms_type', '')}]",
        str(activity.get("description") or "Nil").strip(),
    ]
    meta = " · ".join(
        f"{label}: {activity.get(k)}"
        for label, k in (("Due", "dueDate"),)
        if activity.get(k)
    )
    if meta:
        lines.append(meta)
    for link in attachment_links(activity):
        lines.append(f"File: {link}")
    return "\n".join([ln for ln in lines if ln]).strip()
