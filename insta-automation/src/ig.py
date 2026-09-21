"""Instagram client helpers (session reuse, no secrets in files)."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

from instagrapi import Client


def get_client(username: str, password: str, session_file: str) -> Client:
    if not username or not password:
        raise SystemExit("Missing IG_USER / IG_PASS env vars (never hardcode them).")
    # override_app_version: IG rejects the library's pinned app version
    # ("Your version of Instagram is out of date"); this swaps in a
    # currently supported app profile on both fresh and loaded sessions.
    cl = Client(override_app_version=True)
    path = Path(session_file)
    if path.exists():
        try:
            cl.load_settings(str(path), override_app_version=True)
        except Exception:
            pass  # fall through to fresh login
    logged_in = False
    try:
        # If a session was loaded this may already be valid; login() refreshes.
        cl.login(username, password)
        logged_in = True
    except Exception as exc:
        raise SystemExit(f"IG login failed: {exc}") from exc
    if logged_in:
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            cl.dump_settings(str(path))
            os.chmod(path, 0o600)
        except Exception:
            pass
    return cl


def check_login(cl: Client) -> dict:
    user_id = cl.user_id
    return {"user_id": user_id, "username": cl.username}


def send_chunks(
    cl: Client, chunks: list[str], thread_ids: list[str], delay_s: float = 1.5
) -> list[str]:
    ids: list[str] = []
    tids = [int(t) for t in thread_ids]
    for chunk in chunks:
        msg = cl.direct_send(chunk, thread_ids=tids)
        mid = str(getattr(msg, "id", "") or "")
        ids.append(mid)
        time.sleep(delay_s)
    return ids


def load_sent(state_file: str) -> set[str]:
    try:
        data = json.loads(Path(state_file).read_text())
        return set(data.get("sent_ids", []))
    except (FileNotFoundError, json.JSONDecodeError):
        return set()


def save_sent(state_file: str, sent: set[str]) -> None:
    path = Path(state_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    existing = load_sent(state_file) | set(sent)
    path.write_text(json.dumps({"sent_ids": sorted(existing)}, indent=2))
    os.chmod(path, 0o600)
