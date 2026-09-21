"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import {
  absentReport,
  onlineAttendance,
  type AbsentEntry,
} from "@/lib/attendance";
import { loadSession, saveSession, type Session } from "@/lib/session";

export default function AttendancePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [absents, setAbsents] = useState<AbsentEntry[]>([]);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  function fetchAll(sid: number) {
    setLoading(true);
    setStatus("");
    absentReport(sid)
      .then((d) => {
        setAbsents(Array.isArray(d) ? d : []);
        if (!Array.isArray(d) || d.length === 0)
          setStatus("No absent records found.");
      })
      .catch((e) => setStatus(`Failed to load: ${(e as Error).message}`))
      .finally(() => setLoading(false));
    onlineAttendance(sid)
      .then((d) => {
        try {
          const list = JSON.parse(d.response || "[]") as unknown[];
          setOnlineCount(Array.isArray(list) ? list.length : 0);
        } catch {
          setOnlineCount(0);
        }
      })
      .catch(() => setOnlineCount(null));
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const s = loadSession();
      if (!s || s.studentList.length === 0) {
        router.replace("/login");
        return;
      }
      setSession(s);
      const sid = s.selectedStudentId ?? s.studentList[0].id;
      setStudentId(sid);
      setLoading(true);
      absentReport(sid)
        .then((d) => {
          if (cancelled) return;
          setAbsents(Array.isArray(d) ? d : []);
          if (!Array.isArray(d) || d.length === 0)
            setStatus("No absent records found.");
        })
        .catch((e) => {
          if (!cancelled) setStatus(`Failed to load: ${(e as Error).message}`);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      onlineAttendance(sid)
        .then((d) => {
          if (cancelled) return;
          try {
            const list = JSON.parse(d.response || "[]") as unknown[];
            setOnlineCount(Array.isArray(list) ? list.length : 0);
          } catch {
            setOnlineCount(0);
          }
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  function pickStudent(id: number) {
    setStudentId(id);
    if (session) {
      const next = { ...session, selectedStudentId: id };
      setSession(next);
      saveSession(next);
    }
    setAbsents([]);
    setStatus("");
    fetchAll(id);
  }

  const applied = absents.filter((a) => (a.studentLeaveId ?? 0) > 0).length;
  const recorded = absents.length - applied;

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Absent Report</h1>
      </header>

      <StudentPicker
        students={session.studentList}
        value={studentId}
        onChange={pickStudent}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded border px-3 py-1">
          Total absent: <b>{absents.length}</b>
        </span>
        <span className="rounded border px-3 py-1">
          Leave applied: <b>{applied}</b>
        </span>
        <span className="rounded border px-3 py-1">
          Recorded absent: <b>{recorded}</b>
        </span>
        {onlineCount !== null && (
          <span className="rounded border px-3 py-1">
            Online sessions: <b>{onlineCount}</b>
          </span>
        )}
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      <section className="flex flex-col gap-2">
        {absents.map((a, i) => (
          <article
            key={a.id ?? i}
            className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm"
          >
            <div>
              <p className="font-medium">{a.absentDate || "Unknown date"}</p>
              <p className="text-sm text-zinc-600">
                {a.status || "Absent"}
                {a.reason ? ` · ${a.reason}` : ""}
                {(a.studentLeaveId ?? 0) > 0 ? " · Leave applied" : ""}
              </p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
