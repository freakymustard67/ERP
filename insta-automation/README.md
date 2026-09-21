# insta-automation — Carmel circulars → Instagram DM

New, isolated folder for Instagram automation. v1 scope: **circulars only**.

## How it works

1. Fetch uses the exact portal contract: `POST {CARMEL_BASE}/circulars/countwise`
   with `{phoneNumber, offset, count, schoolId}` (see `carmel-portal/src/app/circular/page.tsx`).
2. Each circular gets a stable key (`id:<n>` or a hash), formatted to plain-text
   DM chunks (≤900 chars), sent oldest-first via `instagrapi.Client.direct_send`
   with `thread_ids=[...]` — the pattern verified in the automation report.
3. Sent keys are stored in `data/sent_circulars.json` (600, gitignored) so
   re-runs only deliver new circulars. IG session reuses `data/ig_session.json`
   (600, gitignored).

Two backend quirks handled: the API repeats `id=1` across items, so dedup keys
are content hashes; `AccountNotification` items (contain live OTPs) are
excluded from group sends unless `--include-account` is passed.

## Setup

```bash
cd ~/insta-automation
uv venv --python 3.11 .venv
uv pip install -r requirements.txt
cp .env.example .env   # fill in values, never commit
set -a; source .env; set +a
```

Required env: `IG_USER` + `IG_PASS` (env only, never in code),
`CARMEL_PHONE` (parent phone number). Defaults cover the verified group thread
`340282366841710301281176154729206641683` and `CARMEL_SCHOOL_ID=875`.

## Usage

```bash
.venv/bin/python -m src.main --check                 # IG login check
.venv/bin/python -m src.main --fetch-only --limit 5  # raw fetch sanity
.venv/bin/python -m src.main --dry-run --limit 10    # preview, sends nothing
.venv/bin/python -m src.main --send --limit 10       # deliver unsent
.venv/bin/python -m src.main --hello "hi"            # connectivity test only
```

Daily report (day digest, homework / portion / files histories with links,
LMS activities):

```bash
.venv/bin/python -m src.main --module daily --fetch-only
.venv/bin/python -m src.main --module daily --dry-run
.venv/bin/python -m src.main --module daily --send
# narrow it down:
.venv/bin/python -m src.main --module daily --dry-run \
  --kinds day,activities --date 2026-09-22 --student-ids 1511360
.venv/bin/python -m src.main --module daily --dry-run \
  --kinds homework,portion,files --history-limit 3
```

Flags: `--thread-ids` overrides env, `--force` resends, `--limit` caps fetch.

## Watch mode (group gets new items automatically)

```bash
.venv/bin/python -m src.watch   # poll every POLL_INTERVAL (default 300s)
```

Each cycle sends any circular / daily unit not yet in `data/sent_circulars.json`,
oldest-first, then sleeps. Failures are logged, never crash the loop.
`GET /health` (Render health checks) and `POST /trigger` (run a cycle now).
Port comes from `$PORT` (Render injects it), default 8000.

## Render (backend, not frontend)

Deploys from this repo (`rootDir: insta-automation`, see `/render.yaml`):

- Build: `pip install -r requirements.txt` · Start: `python -m src.watch`
- Health check path: `/health`
- Set secrets in the Render dashboard (never in git): `IG_USER`, `IG_PASS`,
  `CARMEL_PHONE`. Optional: `IG_THREAD_IDS`, `CARMEL_STUDENT_IDS`,
  `CARMEL_SCHOOL_ID`, `POLL_INTERVAL`.
- First run logs in with `IG_USER`/`IG_PASS`, reuses the session file after that.

Caveats: free web services sleep after 15 min without inbound traffic, and the
disk is ephemeral (restarts lose `data/*.json`, so recent items may resend
once). For true 24/7 immediacy use a Starter plan (always-on + persistent disk).

## Safety

- No secrets in code or git (`.env`, `data/*.json` ignored).
- `--dry-run` is the default preview path; `--send` is explicit.
- 1.5 s delay between chunks to avoid rate limits.
- Start with `--hello` / one `--limit 1 --send` before full runs.
