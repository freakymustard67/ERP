"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import { usePortalSession } from "@/components/usePortalSession";
import { calendarEvents, monthRange, type CalEvent } from "@/lib/more";
import { loadSession, saveSession } from "@/lib/session";

function curMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const { session, setSession } = usePortalSession();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [month, setMonth] = useState("");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  function fetchMonth(sid: number, ym: string) {
    const s = loadSession();
    if (!s) return;
    const { startDate, endDate } = monthRange(ym);
    setLoading(true);
    setStatus("");
    calendarEvents({
      endDate,
      parentId: s.parent.id,
      schoolId: s.schoolCode,
      startDate,
      studentId: sid,
    })
      .then((d) => {
        setEvents(Array.isArray(d) ? d : []);
        if (!Array.isArray(d) || d.length === 0)
          setStatus("No events this month.");
      })
      .catch((e) => setStatus(`Failed to load: ${(e as Error).message}`))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const sid = session.selectedStudentId ?? session.studentList[0].id;
    const ym = curMonth();
    const { startDate, endDate } = monthRange(ym);
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setStudentId(sid);
      setMonth(ym);
      setLoading(true);
      calendarEvents({
        endDate,
        parentId: session.parent.id,
        schoolId: session.schoolCode,
        startDate,
        studentId: sid,
      })
        .then((d) => {
          if (cancelled) return;
          setEvents(Array.isArray(d) ? d : []);
          if (!Array.isArray(d) || d.length === 0)
            setStatus("No events this month.");
        })
        .catch((e) => {
          if (!cancelled) setStatus(`Failed to load: ${(e as Error).message}`);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
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
    if (month) fetchMonth(id, month);
  }

  function move(delta: number) {
    const ym = shiftMonth(month, delta);
    setMonth(ym);
    if (studentId) fetchMonth(studentId, ym);
  }

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Calendar</h1>
      </header>

      <StudentPicker
        students={session.studentList}
        value={studentId}
        onChange={pickStudent}
      />

      <div className="flex items-center justify-between rounded-lg border bg-white p-2">
        <button className="rounded border px-3 py-1 text-sm" onClick={() => move(-1)}>
          ← Prev
        </button>
        <span className="font-medium">{month}</span>
        <button className="rounded border px-3 py-1 text-sm" onClick={() => move(1)}>
          Next →
        </button>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      <section className="flex flex-col gap-2">
        {events.map((e, i) => (
          <article
            key={i}
            className="rounded-lg border bg-white p-3 text-sm shadow-sm"
          >
            {Object.entries(e).map(([k, v]) => (
              <p key={k}>
                <span className="text-zinc-500">{k}: </span>
                {String(v ?? "")}
              </p>
            ))}
          </article>
        ))}
      </section>
      <div className="pb-8" />
    </main>
  );
}
