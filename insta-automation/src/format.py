"""Format circulars for Instagram DMs (plain text, chunked)."""

from __future__ import annotations

IG_CHUNK = 900


def fmt_time(sent_at: str) -> str:
    if not sent_at:
        return ""
    import re

    m = re.search(r"(\d{2}):(\d{2})(?::\d{2})?$", sent_at.strip())
    if not m:
        return ""
    h = int(m.group(1))
    suffix = "PM" if h >= 12 else "AM"
    h = h % 12 or 12
    return f"{h}:{m.group(2)} {suffix}"


def format_circular(item: dict) -> str:
    lines = [f"Circular - {item.get('date', '')}".strip()]
    title = str(item.get("title") or "Circular")
    if title and title != "Circular":
        lines.append(title)
    body = str(item.get("body") or "").strip()
    if body:
        lines.append(body)
    t = fmt_time(str(item.get("sent_at") or ""))
    if t:
        lines.append(t)
    return "\n".join([ln for ln in lines if ln]).strip()


def split_message(text: str, limit: int = IG_CHUNK) -> list[str]:
    text = text.strip()
    if len(text) <= limit:
        return [text]
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for line in text.splitlines(keepends=True):
        if current_len + len(line) > limit and current:
            chunks.append("".join(current).rstrip())
            current, current_len = [], 0
        # hard-split overlong single lines
        while len(line) > limit:
            chunks.append(line[:limit])
            line = line[limit:]
        current.append(line)
        current_len += len(line)
    if current:
        chunks.append("".join(current).rstrip())
    return [c for c in chunks if c]
