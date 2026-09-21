"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import { usePortalSession } from "@/components/usePortalSession";
import { classTimetable } from "@/lib/more";
import { loadSession, saveSession } from "@/lib/session";

function Cell({ v }: { v: unknown }): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function TimetablePage() {
  const { session, setSession } = usePortalSession();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  function fetchTT(studentId: number) {
    const s = loadSession();
    const st = s?.studentList.find((x) => x.id === studentId);
    const standardId = Number(st?.standardId ?? 0);
    const divisionId = Number(st?.divisionId ?? 0);
    if (!standardId || !divisionId) {
      setStatus("No class/division info for this student.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setStatus("");
    classTimetable(standardId, divisionId)
      .then((d) => {
        const list = (Array.isArray(d) ? d : []).filter(
          (x): x is Record<string, unknown> =>
            typeof x === "object" && x !== null
        );
        setRows(list);
        const keys: string[] = [];
        for (const r of list)
          for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
        setCols(keys);
        if (list.length === 0) setStatus("No timetable published.");
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
      fetchTT(sid);
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
    setRows([]);
    fetchTT(id);
  }

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Class Timetable</h1>
      </header>

      <StudentPicker
        students={session.studentList}
        value={studentId}
        onChange={pickStudent}
      />

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c} className="border bg-zinc-50 px-2 py-1 text-left">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c} className="border px-2 py-1">
                      {Cell({ v: r[c] })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="pb-8" />
    </main>
  );
}
