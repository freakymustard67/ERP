"""CLI: fetch Carmel circulars / daily-report -> preview or send to IG DM thread(s)."""

from __future__ import annotations

import argparse
import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))

from src import carmel, daily
from src.config import Config, _ints
from src.format import format_circular, split_message
from src.ig import check_login, get_client, load_sent, save_sent, send_chunks

DAILY_KINDS = ["day", "homework", "portion", "files", "activities"]


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Send Carmel Public School updates to an Instagram DM group."
    )
    p.add_argument("--module", choices=["circular", "daily"], default="circular")
    p.add_argument("--fetch-only", action="store_true", help="Fetch and print raw count only.")
    p.add_argument("--dry-run", action="store_true", help="Fetch + print formatted messages, send nothing.")
    p.add_argument("--check", action="store_true", help="Login to IG and print user id, send nothing.")
    p.add_argument("--hello", metavar="TEXT", help="Send TEXT to the thread (connectivity test).")
    p.add_argument("--send", action="store_true", help="Send unsent items to the thread(s).")
    p.add_argument("--limit", type=int, default=10, help="Max circulars to consider (default 10).")
    p.add_argument("--thread-ids", default="", help="Comma-separated thread IDs (overrides IG_THREAD_IDS).")
    p.add_argument("--force", action="store_true", help="Resend even if already marked sent.")
    p.add_argument(
        "--include-account",
        action="store_true",
        help="Also send AccountNotification items (OTP etc). Excluded by default.",
    )
    p.add_argument("--date", default="", help="Day-report date YYYY-MM-DD (default today).")
    p.add_argument("--student-ids", default="", help="Comma-separated student IDs (overrides CARMEL_STUDENT_IDS).")
    p.add_argument(
        "--kinds",
        default=",".join(DAILY_KINDS),
        help=f"Daily kinds, subset of: {','.join(DAILY_KINDS)}.",
    )
    p.add_argument("--history-limit", type=int, default=5, help="Items per history/activity kind (default 5).")
    return p


def is_personal_circular(item: dict) -> bool:
    title = str(item.get("title") or "").lower()
    body = str(item.get("body") or "").lower()
    return "accountnotification" in title or "one time password" in body


def run_circular(args: argparse.Namespace, cfg: Config) -> int:
    if not cfg.carmel_phone:
        print("Missing CARMEL_PHONE env var (parent phone number).", file=sys.stderr)
        return 2

    items = carmel.fetch_latest(
        cfg.carmel_phone, cfg.carmel_school_id, limit=args.limit, base=cfg.carmel_base
    )

    if args.fetch_only:
        print(f"Fetched {len(items)} circular(s).")
        for it in items:
            print(f"- [{it['key']}] {it['date']} | {it['title']} | {it['body'][:80]}")
        return 0

    sent = load_sent(cfg.state_file)
    pending = [
        it
        for it in items
        if (args.include_account or not is_personal_circular(it))
        and (args.force or it["key"] not in sent)
    ]
    # send oldest-first so the group reads in order
    pending = list(reversed(pending))

    if args.dry_run or not args.send:
        print(f"Fetched {len(items)}, {len(pending)} unsent (dry run, sending nothing).")
        for it in (pending or items[:3]):
            print("=" * 60)
            print(f"[{it['key']}] {it['date']}")
            for chunk in split_message(format_circular(it)):
                print(chunk)
        if not args.dry_run:
            print("\nPass --send to actually deliver, --dry-run to preview only.")
        return 0

    if not pending:
        print("Nothing new to send.")
        return 0

    cl = get_client(cfg.ig_user, cfg.ig_pass, cfg.session_file)
    newly_sent: list[str] = []
    for it in pending:
        chunks = split_message(format_circular(it))
        try:
            send_chunks(cl, chunks, cfg.thread_ids)
        except Exception as exc:
            print(f"FAILED [{it['key']}]: {exc}", file=sys.stderr)
            break
        newly_sent.append(it["key"])
        print(f"Sent [{it['key']}] {it['date']} ({len(chunks)} msg)")
    if newly_sent:
        save_sent(cfg.state_file, set(newly_sent))
        print(f"Marked {len(newly_sent)} circular(s) sent -> {cfg.state_file}")
    return 0


def collect_daily(args: argparse.Namespace, cfg: Config) -> list[tuple[str, str]]:
    """Return (state_key, message_text) units oldest-first across students/kinds."""
    kinds = [k.strip() for k in args.kinds.split(",") if k.strip() in DAILY_KINDS]
    if not kinds:
        raise SystemExit(f"--kinds must be a subset of {','.join(DAILY_KINDS)}")
    ymd = args.date or daily.today_ymd()
    units: list[tuple[str, str]] = []
    for sid in cfg.student_ids:
        label = f"Student {sid}"
        if "day" in kinds:
            report = daily.day_report(sid, ymd, cfg.carmel_base)
            empty = not any(report.get(f) for f, _ in daily.DAY_SECTIONS)
            if not empty:
                units.append((f"daily:{sid}:{ymd}", daily.format_day(label, ymd, report)))
            else:
                print(f"({label} {ymd}: day report empty)")
        for kind in kinds:
            if kind in ("day", "activities"):
                continue
            for entry in daily.history(kind, sid, args.history_limit, cfg.carmel_base):
                title = daily.HISTORY[kind][2]
                text = (
                    f"{title} - {entry['date']} ({label})\n"
                    + daily.format_item(entry["item"])
                )
                units.append((f"{entry['key']}", text))
        if "activities" in kinds:
            for type_ in daily.LMS_TYPES:
                acts = daily.lms_activities(sid, type_, args.history_limit, cfg.carmel_lms_base)
                for a in reversed(acts):  # oldest-first
                    text = f"({label})\n" + daily.format_activity(a)
                    units.append((a["key"], text))
    return units


def run_daily(args: argparse.Namespace, cfg: Config) -> int:
    if args.student_ids.strip():
        cfg.student_ids = _ints(args.student_ids)
    ymd = args.date or daily.today_ymd()

    units = collect_daily(args, cfg)

    if args.fetch_only:
        print(f"Collected {len(units)} unit(s) for {ymd}.")
        for key, text in units:
            print(f"- [{key}] {text.splitlines()[0][:100]}")
        return 0

    sent = load_sent(cfg.state_file)
    pending = [(k, t) for k, t in units if args.force or k not in sent]

    if args.dry_run or not args.send:
        print(f"Collected {len(units)}, {len(pending)} unsent (dry run, sending nothing).")
        for key, text in (pending or units[:2]):
            print("=" * 60)
            print(f"[{key}]")
            for chunk in split_message(text):
                print(chunk)
        if not args.dry_run:
            print("\nPass --send to actually deliver, --dry-run to preview only.")
        return 0

    if not pending:
        print("Nothing new to send.")
        return 0

    cl = get_client(cfg.ig_user, cfg.ig_pass, cfg.session_file)
    newly_sent: list[str] = []
    for key, text in pending:
        chunks = split_message(text)
        try:
            send_chunks(cl, chunks, cfg.thread_ids)
        except Exception as exc:
            print(f"FAILED [{key}]: {exc}", file=sys.stderr)
            break
        newly_sent.append(key)
        print(f"Sent [{key}] ({len(chunks)} msg)")
    if newly_sent:
        save_sent(cfg.state_file, set(newly_sent))
        print(f"Marked {len(newly_sent)} unit(s) sent -> {cfg.state_file}")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    cfg = Config.from_env()
    if args.thread_ids.strip():
        cfg.thread_ids = [t.strip() for t in args.thread_ids.split(",") if t.strip()]

    if args.check:
        cl = get_client(cfg.ig_user, cfg.ig_pass, cfg.session_file)
        info = check_login(cl)
        print(f"Logged in as {info['username']} (user_id {info['user_id']})")
        return 0

    if args.hello:
        cl = get_client(cfg.ig_user, cfg.ig_pass, cfg.session_file)
        ids = send_chunks(cl, [args.hello], cfg.thread_ids)
        print(f"Sent hello -> threads {cfg.thread_ids}, message ids {ids}")
        return 0

    if args.module == "daily":
        return run_daily(args, cfg)
    return run_circular(args, cfg)


if __name__ == "__main__":
    raise SystemExit(main())
