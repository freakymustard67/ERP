"""Watcher: poll school backends and push new circulars/reports to IG DMs.

Runs forever: each cycle sends anything not yet in the sent-state file, then
sleeps POLL_INTERVAL seconds (default 300). Exposes /health and /trigger
(force a cycle now) for Render health checks and manual runs.

Same contracts as the one-shot CLI (see src/main.py, src/carmel.py, src/daily.py).
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer

from src import main as cli

_state_lock = threading.Lock()
_trigger = threading.Event()
_stop = threading.Event()
_info: dict = {"started": time.time(), "cycles": 0, "last_cycle": None, "last_result": "booting"}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # quiet
        pass

    def _send(self, code: int, obj: dict) -> None:
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            with _state_lock:
                self._send(200, dict(status="ok", **_info))
        else:
            self._send(404, {"status": "not found"})

    def do_POST(self):
        if self.path == "/trigger":
            _trigger.set()
            self._send(202, {"status": "cycle triggered"})
        else:
            self._send(404, {"status": "not found"})


def ensure_session_file(path: str) -> None:
    """Seed the IG session from IG_SESSION_JSON env (first boot on Render,
    where the gitignored session file doesn't exist). Never logs the value."""
    from pathlib import Path

    p = Path(path)
    if p.exists():
        return
    blob = os.environ.get("IG_SESSION_JSON", "")
    if not blob.strip():
        return
    try:
        json.loads(blob)  # validate before writing
    except json.JSONDecodeError as exc:
        print(f"[watch] IG_SESSION_JSON invalid: {exc}", flush=True)
        return
    p.parent.mkdir(parents=True, exist_ok=True)
    # 0o600 via opener so the file is never world-readable, even briefly.
    fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as fh:
        fh.write(blob)
    print("[watch] wrote IG session from IG_SESSION_JSON", flush=True)


def serve_health(port: int) -> threading.Thread:
    server = HTTPServer(("0.0.0.0", port), Handler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return t


def circular_args(limit: int) -> argparse.Namespace:
    return argparse.Namespace(
        module="circular", fetch_only=False, dry_run=False, check=False,
        hello=None, send=True, limit=limit, thread_ids="",
        force=False, include_account=False, date="", student_ids="",
        kinds=",".join(cli.DAILY_KINDS), history_limit=5,
    )


def daily_args(history_limit: int) -> argparse.Namespace:
    return argparse.Namespace(
        module="daily", fetch_only=False, dry_run=False, check=False,
        hello=None, send=True, limit=10, thread_ids="",
        force=False, include_account=False, date="", student_ids="",
        kinds=",".join(cli.DAILY_KINDS), history_limit=history_limit,
    )


def run_cycle(cfg) -> str:
    """One poll: circulars then daily. Returns a short summary. Never raises."""
    cfg.thread_ids = [t.strip() for t in cfg.thread_ids if t.strip()]
    parts: list[str] = []
    try:
        cli.run_circular(circular_args(limit=10), cfg)
        parts.append("circular ok")
    except BaseException as exc:  # noqa: BLE001 - watcher must survive (except Ctrl-C)
        if isinstance(exc, KeyboardInterrupt):
            raise
        parts.append(f"circular FAILED: {exc}")
        traceback.print_exc()
    try:
        cli.run_daily(daily_args(history_limit=5), cfg)
        parts.append("daily ok")
    except BaseException as exc:  # noqa: BLE001
        if isinstance(exc, KeyboardInterrupt):
            raise
        parts.append(f"daily FAILED: {exc}")
        traceback.print_exc()
    return "; ".join(parts)


def main() -> int:
    from src.config import Config

    interval = int(os.environ.get("POLL_INTERVAL", "300"))
    port = int(os.environ.get("PORT", "8000"))

    ensure_session_file(Config.from_env().session_file)
    serve_health(port)
    print(f"[watch] health on :{port}, poll every {interval}s", flush=True)

    def _sig(_signo, _frame):
        _stop.set()
        _trigger.set()

    signal.signal(signal.SIGTERM, _sig)

    while not _stop.is_set():
        _trigger.clear()
        cfg = Config.from_env()
        if not cfg.thread_ids:
            print("[watch] no IG_THREAD_IDS, skipping cycle", flush=True)
        else:
            try:
                result = run_cycle(cfg)
            except KeyboardInterrupt:
                break
            with _state_lock:
                _info["cycles"] += 1
                _info["last_cycle"] = time.strftime("%Y-%m-%d %H:%M:%S")
                _info["last_result"] = result
            print(f"[watch] cycle #{_info['cycles']}: {result}", flush=True)
        _trigger.wait(timeout=interval)
    print("[watch] stopping", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
