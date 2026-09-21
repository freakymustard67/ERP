"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import { usePortalSession } from "@/components/usePortalSession";
import { trackerList } from "@/lib/more";
import { loadSession, saveSession } from "@/lib/session";

type Tracker = {
  trackingLink?: string;
  [k: string]: unknown;
};

export default function TransportPage() {
  const { session, setSession } = usePortalSession();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [busRoute, setBusRoute] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  function fetchAll(sid: number) {
    const s = loadSession();
    const st = s?.studentList.find((x) => x.id === sid);
    setBusRoute(
      [st?.busRoute, st?.busRouteMorningTime, st?.busRouteEvngTime]
        .filter(Boolean)
        .map(String)
        .join(" · ")
    );
    setLoading(true);
    setStatus("");
    trackerList(sid)
      .then((d) => {
        try {
          const list = JSON.parse(d.response || "[]") as Tracker[];
          setTrackers(Array.isArray(list) ? list : []);
          if (!Array.isArray(list) || list.length === 0)
            setStatus("No live tracking available.");
        } catch {
          setTrackers([]);
          setStatus("No live tracking available.");
        }
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
      fetchAll(sid);
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
      setSession(next);
      saveSession(next);
    }
    fetchAll(id);
  }

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Transport</h1>
      </header>

      <StudentPicker
        students={session.studentList}
        value={studentId}
        onChange={pickStudent}
      />

      {busRoute && (
        <p className="rounded-lg border bg-white p-3 text-sm shadow-sm">
          <span className="text-zinc-500">Bus route: </span>
          {busRoute}
        </p>
      )}

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      {trackers.map((t, i) => (
        <article
          key={i}
          className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm"
        >
          <div className="text-sm">
            {Object.entries(t)
              .filter(([k]) => k !== "trackingLink")
              .slice(0, 6)
              .map(([k, v]) => (
                <p key={k}>
                  <span className="text-zinc-500">{k}: </span>
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                </p>
              ))}
          </div>
          {t.trackingLink && (
            <a
              href={String(t.trackingLink)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded border px-3 py-1 text-sm"
            >
              Track →
            </a>
          )}
        </article>
      ))}
      <div className="pb-8" />
    </main>
  );
}
