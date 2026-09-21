"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import { usePortalSession } from "@/components/usePortalSession";
import { hallTicketLink, hallTicketStatus } from "@/lib/more";
import { loadSession, saveSession } from "@/lib/session";

export default function HallTicketPage() {
  const { session, setSession } = usePortalSession();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function fetchStatus(sid: number) {
    const s = loadSession();
    if (!s) return;
    setLoading(true);
    setStatus("");
    setInfo(null);
    hallTicketStatus(s.schoolId, sid)
      .then((d) => {
        try {
          const parsed = JSON.parse(d.response || "{}") as Record<string, unknown>;
          setInfo(parsed);
          if (!parsed || (parsed.hallTicketId as number) === 0)
            setStatus("Hall ticket not published.");
        } catch {
          setStatus("Hall ticket not published.");
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
      fetchStatus(sid);
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
    fetchStatus(id);
  }

  function download() {
    if (!studentId) return;
    const hallTicketId = Number(info?.hallTicketId ?? 0);
    if (!hallTicketId) return;
    setBusy(true);
    hallTicketLink(studentId, hallTicketId)
      .then((d) => {
        if (d.response) window.open(d.response, "_blank", "noopener");
        else setStatus("Hall ticket not published.");
      })
      .catch((e) => setStatus(`Failed: ${(e as Error).message}`))
      .finally(() => setBusy(false));
  }

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Hall Ticket</h1>
      </header>

      <StudentPicker
        students={session.studentList}
        value={studentId}
        onChange={pickStudent}
      />

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      {info && (info.isFeeDue ? (
        <p className="rounded border bg-amber-50 p-3 text-sm">
          Payment due! It seems the fees are not cleared. Please clear the dues
          or contact the school to download the hall ticket.
        </p>
      ) : (
        Number(info.hallTicketId ?? 0) > 0 && (
          <button
            className="self-start rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={busy}
            onClick={download}
          >
            Download hall ticket
          </button>
        )
      ))}
      <div className="pb-8" />
    </main>
  );
}
