"""Persistent state via a secret GitHub Gist (survives Render's ephemeral disk).

Files synced: the IG session and the sent-ids list. Sync strategy (watch.py):
  boot: if a local file is missing, restore it from the gist (else keep local).
  after each cycle: if a file changed since last push, PATCH the gist.
Only GIST_ID + GITHUB_TOKEN env vars are needed. Local-only mode when unset.
"""

from __future__ import annotations

import json
import urllib.request

API = "https://api.github.com"


class GistStore:
    def __init__(self, token: str, gist_id: str):
        self.token = token
        self.gist_id = gist_id

    @property
    def enabled(self) -> bool:
        return bool(self.token and self.gist_id)

    def _req(self, method: str, path: str, data=None) -> dict:
        req = urllib.request.Request(
            API + path,
            data=json.dumps(data).encode() if data is not None else None,
            headers={
                "Authorization": "Bearer " + self.token,
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
            },
            method=method,
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)

    def pull(self) -> dict[str, str]:
        """Return {filename: content} for files present in the gist."""
        g = self._req("GET", f"/gists/{self.gist_id}")
        out: dict[str, str] = {}
        for name, meta in (g.get("files") or {}).items():
            content = (meta or {}).get("content")
            if isinstance(content, str):
                out[name] = content
        return out

    def push(self, files: dict[str, str]) -> None:
        self._req(
            "PATCH",
            f"/gists/{self.gist_id}",
            {"files": {name: {"content": c} for name, c in files.items()}},
        )
