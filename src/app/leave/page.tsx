"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import { usePortalSession } from "@/components/usePortalSession";
import { absentReport, type AbsentEntry } from "@/lib/attendance";
import { applyLeave, cancelLeave } from "@/lib/more";
import { loadSession, saveSession } from "@/lib/session";

function dstr(d: Date): string {
  return d.toString();
}

export default function LeavePage() {
  const { session } = usePortalSession();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [applied, setApplied] = useState<AbsentEntry[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  function fetchApplied(sid: number) {
    setLoading(true);
    absentReport(sid)
      .then((d) => {
        setApplied(
          (Array.isArray(d) ? d : []).filter((a) => (a.studentLeaveId ?? 0) > 0)
        );
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
      fetchApplied(sid);
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
    fetchApplied(id);
  }

  function submit() {
    if (!studentId || !start || !end || !reason.trim()) {
      setStatus("Fill start, end and reason.");
      return;
    }
    setBusy(true);
    applyLeave({
      startDate: dstr(new Date(`${start}T00:00:00`)),
      endDate: dstr(new Date(`${end}T00:00:00`)),
      reason: reason.trim(),
      studentId,
    })
      .then((d) => {
        if (Array.isArray(d) && d[0]?.id) {
          setStatus("Leave applied.");
          setStart("");
          setEnd("");
          setReason("");
          fetchApplied(studentId);
        } else {
          setStatus("Server did not confirm. Try again.");
        }
      })
      .catch((e) => setStatus(`Failed: ${(e as Error).message}`))
      .finally(() => setBusy(false));
  }

  function cancel(id: number) {
    setBusy(true);
    cancelLeave(id)
      .then((d) => {
        setStatus(
          (d.message || "").toLowerCase().includes("successfully")
            ? "Leave cancelled."
            : d.message || "Done."
        );
        if (studentId) fetchApplied(studentId);
      })
      .catch((e) => setStatus(`Failed: ${(e as Error).message}`))
      .finally(() => setBusy(false));
  }

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/attendance" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Apply Leave</h1>
      </header>

      <StudentPicker
        students={session.studentList}
        value={studentId}
        onChange={pickStudent}
      />

      {status && <p className="text-sm text-zinc-700">{status}</p>}

      <section className="grid grid-cols-1 gap-2 rounded-lg border bg-white p-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Start date
          <input
            type="date"
            className="rounded border bg-white p-2"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          End date
          <input
            type="date"
            className="rounded border bg-white p-2"
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Reason
          <textarea
            className="rounded border p-2"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button
          className="rounded bg-zinc-900 p-2 text-sm text-white disabled:opacity-50 sm:col-span-2"
          disabled={busy}
          onClick={submit}
        >
          Submit leave
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-600">
          Applied leaves {applied.length > 0 && `(${applied.length})`}
        </h2>
        {loading && <p className="text-sm text-zinc-500">Loading…</p>}
        {applied.map((a, i) => (
          <article
            key={a.id ?? i}
            className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3 text-sm shadow-sm"
          >
            <p>
              {a.absentDate || ""} {a.reason ? `· ${a.reason}` : ""} · {a.status || ""}
            </p>
            <button
              className="shrink-0 rounded border px-3 py-1"
              disabled={busy}
              onClick={() => cancel(Number(a.studentLeaveId ?? a.id ?? 0))}
            >
              Cancel
            </button>
          </article>
        ))}
      </section>
      <div className="pb-8" />
    </main>
  );
}
