"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import { usePortalSession } from "@/components/usePortalSession";
import { examDetails } from "@/lib/more";
import { loadSession, saveSession } from "@/lib/session";

const LINKS: [string, string, string][] = [
  ["/marks", "Marks card", "progress cards + PDF"],
  ["/timetable", "Class timetable", "weekly schedule"],
  ["/hallticket", "Hall ticket", "exam hall ticket"],
  ["/online-class", "Online class", "live class status"],
  ["/previous-classes", "Previous classes", "past class reports"],
];

export default function ExamsPage() {
  const { session } = usePortalSession();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [details, setDetails] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  function fetchAll(sid: number) {
    const s = loadSession();
    if (!s) return;
    setLoading(true);
    setStatus("");
    examDetails(sid, Number(s.schoolId) || s.schoolCode)
      .then((d) => setDetails(d))
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
        <h1 className="text-2xl font-semibold">Exams</h1>
      </header>

      <StudentPicker
        students={session.studentList}
        value={studentId}
        onChange={pickStudent}
      />

      <nav className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {LINKS.map(([href, label, desc]) => (
          <Link
            key={href}
            href={href}
            className="rounded border bg-white p-3 shadow-sm hover:bg-zinc-50"
          >
            <div className="font-medium">{label}</div>
            <div className="text-xs text-zinc-500">{desc}</div>
          </Link>
        ))}
      </nav>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      {details !== null && details !== undefined && (
        <section className="rounded-lg border bg-white p-3 text-sm shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-zinc-600">
            Exam details
          </h2>
          {typeof details === "object" ? (
            Object.entries(details as Record<string, unknown>).map(([k, v]) => (
              <p key={k}>
                <span className="text-zinc-500">{k}: </span>
                {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
              </p>
            ))
          ) : (
            <p>{String(details)}</p>
          )}
        </section>
      )}
      <div className="pb-8" />
    </main>
  );
}
