"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import { usePortalSession } from "@/components/usePortalSession";
import {
  classAvailable,
  classroomDetails,
  examDetails,
  hostDetails,
  onlineClassFlag,
} from "@/lib/more";
import { loadSession, saveSession } from "@/lib/session";

function KV({ data }: { data: unknown }) {
  if (data === null || data === undefined || data === "")
    return <p className="text-sm text-zinc-500">No data.</p>;
  if (typeof data !== "object")
    return <p className="text-sm">{String(data)}</p>;
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) return <p className="text-sm text-zinc-500">No data.</p>;
  return (
    <div className="flex flex-col gap-1 text-sm">
      {entries.map(([k, v]) => (
        <p key={k}>
          <span className="text-zinc-500">{k}: </span>
          {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
        </p>
      ))}
    </div>
  );
}

export default function OnlineClassPage() {
  const { session, setSession } = usePortalSession();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [flag, setFlag] = useState<unknown>(null);
  const [exams, setExams] = useState<unknown>(null);
  const [active, setActive] = useState<unknown>(null);
  const [host, setHost] = useState<unknown>(null);
  const [room, setRoom] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  function fetchAll(sid: number) {
    const s = loadSession();
    if (!s) return;
    setLoading(true);
    setStatus("");
    const schoolId = Number(s.schoolId) || s.schoolCode;
    Promise.allSettled([
      onlineClassFlag(sid),
      examDetails(sid, schoolId),
      classAvailable(sid),
      hostDetails(sid),
      classroomDetails(sid, schoolId),
    ]).then((r) => {
      const val = (x: PromiseSettledResult<unknown>) =>
        x.status === "fulfilled" ? x.value : `failed: ${String((x as PromiseRejectedResult).reason).slice(0, 100)}`;
      setFlag(val(r[0]));
      setExams(val(r[1]));
      setActive(val(r[2]));
      setHost(val(r[3]));
      setRoom(val(r[4]));
      setLoading(false);
    });
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

  const cards: [string, unknown][] = [
    ["Online class feature", flag],
    ["Exam details", exams],
    ["Active class", active],
    ["Classroom settings", host],
    ["Classroom", room],
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Online Class</h1>
      </header>

      <StudentPicker
        students={session.studentList}
        value={studentId}
        onChange={pickStudent}
      />

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      {cards.map(([title, data]) => (
        <section key={title} className="rounded-lg border bg-white p-3 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-zinc-600">{title}</h2>
          <KV data={data} />
        </section>
      ))}
      <div className="pb-8" />
    </main>
  );
}
