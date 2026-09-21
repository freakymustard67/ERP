"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import { usePortalSession } from "@/components/usePortalSession";
import { lmsActivities, lmsMarkRead, type LmsActivity } from "@/lib/more";
import { loadSession, saveSession } from "@/lib/session";

const TYPES = ["HOMEWORK", "PORTION COVERED"];

export default function ActivitiesPage() {
  const { session } = usePortalSession();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [type, setType] = useState(TYPES[0]);
  const [items, setItems] = useState<LmsActivity[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  function fetchPage(sid: number, t: string, off: number, append: boolean) {
    setLoading(true);
    lmsActivities(sid, off, 10, t)
      .then((d) => {
        const list = (Array.isArray(d) ? d : []).map((a) => {
          let attachmentIdJson = a.attachmentIdJson;
          try {
            if (typeof attachmentIdJson === "string" && attachmentIdJson) {
              const p = JSON.parse(attachmentIdJson);
              attachmentIdJson = p;
            }
          } catch {}
          return {
            ...a,
            attachmentIdJson,
            description:
              a.description === "null" || !a.description ? "Nil" : a.description,
          };
        });
        if (list.length === 0) {
          setHasMore(false);
          if (!append) setStatus("No activities found.");
          return;
        }
        setItems((g) => (append ? [...g, ...list] : list));
        setOffset(off + 10);
        if (list.length < 10) setHasMore(false);
      })
      .catch((e) => setStatus(`Failed to load: ${(e as Error).message}`))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const sid = session.selectedStudentId ?? session.studentList[0].id;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setStudentId(sid);
      fetchPage(sid, TYPES[0], 0, false);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  function pickStudent(id: number) {
    setStudentId(id);
    const s = loadSession();
    if (s) {
      const next = { ...s, selectedStudentId: id };
      saveSession(next);
    }
    setItems([]);
    setOffset(0);
    setHasMore(true);
    setStatus("");
    fetchPage(id, type, 0, false);
  }

  function pickType(t: string) {
    setType(t);
    setItems([]);
    setOffset(0);
    setHasMore(true);
    setStatus("");
    if (studentId) fetchPage(studentId, t, 0, false);
  }

  function markRead(a: LmsActivity) {
    const s = loadSession();
    const st = s?.studentList.find((x) => x.id === studentId);
    if (!s || !studentId || !a.activityId) return;
    lmsMarkRead(a.activityId, studentId, String(st?.name ?? ""))
      .then(() => setStatus("Marked as read."))
      .catch((e) => setStatus(`Failed: ${(e as Error).message}`));
  }

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Activities</h1>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <StudentPicker
          students={session.studentList}
          value={studentId}
          onChange={pickStudent}
        />
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            className="rounded border bg-white p-2"
            value={type}
            onChange={(e) => pickType(e.target.value)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      <section className="flex flex-col gap-2">
        {items.map((a, i) => (
          <article
            key={a.activityId ?? i}
            className="rounded-lg border bg-white p-3 text-sm shadow-sm"
          >
            <p className="whitespace-pre-line">{String(a.description ?? "")}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {[a.sendDate && `Sent: ${a.sendDate}`, a.dueDate && `Due: ${a.dueDate}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <button
              className="mt-2 rounded border px-3 py-1"
              onClick={() => markRead(a)}
            >
              Mark read
            </button>
          </article>
        ))}
      </section>

      <div className="flex justify-center pb-8">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          hasMore &&
          studentId && (
            <button
              className="rounded border px-4 py-2 text-sm"
              onClick={() => fetchPage(studentId, type, offset, true)}
            >
              Load more
            </button>
          )
        )}
      </div>
    </main>
  );
}
