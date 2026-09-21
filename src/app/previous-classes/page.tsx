"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import { usePortalSession } from "@/components/usePortalSession";
import { previousClasses } from "@/lib/more";
import { loadSession, saveSession } from "@/lib/session";

type PrevClass = {
  id?: number;
  meetingDate?: string;
  [k: string]: unknown;
};

export default function PreviousClassesPage() {
  const { session } = usePortalSession();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [items, setItems] = useState<PrevClass[]>([]);
  const [applied, setApplied] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  function fetchAll(sid: number) {
    setLoading(true);
    setStatus("");
    previousClasses(sid)
      .then((d) => {
        if (!d.success) {
          setStatus("No previous classes found.");
          setItems([]);
          return;
        }
        try {
          const list = JSON.parse(d.response || "[]") as PrevClass[];
          setItems(Array.isArray(list) ? list : []);
          setApplied(list.filter((x) => (x.id ?? 0) > 0).length);
          setCompleted(list.filter((x) => (x.id ?? 0) <= 0).length);
          if (!Array.isArray(list) || list.length === 0)
            setStatus("No previous classes found.");
        } catch {
          setItems([]);
          setStatus("No previous classes found.");
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
        <h1 className="text-2xl font-semibold">Previous Classes</h1>
      </header>

      <StudentPicker
        students={session.studentList}
        value={studentId}
        onChange={pickStudent}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded border px-3 py-1">
          Total: <b>{items.length}</b>
        </span>
        <span className="rounded border px-3 py-1">
          Applied: <b>{applied}</b>
        </span>
        <span className="rounded border px-3 py-1">
          Completed: <b>{completed}</b>
        </span>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      <section className="flex flex-col gap-2">
        {items.map((it, i) => (
          <article
            key={it.id ?? i}
            className="rounded-lg border bg-white p-3 text-sm shadow-sm"
          >
            {Object.entries(it)
              .slice(0, 8)
              .map(([k, v]) => (
                <p key={k}>
                  <span className="text-zinc-500">{k}: </span>
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                </p>
              ))}
          </article>
        ))}
      </section>
      <div className="pb-8" />
    </main>
  );
}
