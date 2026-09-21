"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import { homeworkHistory, type DayItem, type HomeworkGroup } from "@/lib/daily";
import { loadSession, saveSession, type Session } from "@/lib/session";

const PAGE = 10;

function fmtMeta(it: DayItem): string {
  return [
    it.chapters && `Ch: ${it.chapters}`,
    it.pageNo && `Pg: ${it.pageNo}`,
    it.templateName,
    it.date,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function HomeworkPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [groups, setGroups] = useState<HomeworkGroup[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  function fetchPage(sid: number, off: number, append: boolean) {
    setLoading(true);
    homeworkHistory(sid, off, PAGE)
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          setHasMore(false);
          if (!append) setStatus("No homework found.");
          return;
        }
        setGroups((g) => (append ? [...g, ...data] : data));
        setOffset(off + PAGE);
        if (data.length < PAGE) setHasMore(false);
      })
      .catch((e) => setStatus(`Failed to load: ${(e as Error).message}`))
      .finally(() => setLoading(false));
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
      homeworkHistory(sid, 0, PAGE)
        .then((data) => {
          if (cancelled) return;
          if (!Array.isArray(data) || data.length === 0) {
            setHasMore(false);
            setStatus("No homework found.");
            return;
          }
          setGroups(data);
          setOffset(PAGE);
          if (data.length < PAGE) setHasMore(false);
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
  }, [router]);

  function pickStudent(id: number) {
    setStudentId(id);
    if (session) {
      const next = { ...session, selectedStudentId: id };
      setSession(next);
      saveSession(next);
    }
    setGroups([]);
    setOffset(0);
    setHasMore(true);
    setStatus("");
    fetchPage(id, 0, false);
  }

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/daily-report" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Homework</h1>
      </header>

      <StudentPicker
        students={session.studentList}
        value={studentId}
        onChange={pickStudent}
      />

      {groups.map((g, gi) => (
        <section key={`${g.date}-${gi}`} className="flex flex-col gap-2">
          <p className="text-sm text-zinc-500">{g.date}</p>
          {g.homeworkList.map((it, i) => (
            <article
              key={`${gi}-${it.id ?? i}`}
              className="rounded-lg border bg-white p-3 shadow-sm"
            >
              <p className="font-medium">{it.subject || "Homework"}</p>
              {it.description && (
                <p className="whitespace-pre-line text-sm text-zinc-600">
                  {it.description}
                </p>
              )}
              <p className="mt-1 text-xs text-zinc-500">{fmtMeta(it)}</p>
            </article>
          ))}
        </section>
      ))}

      {status && <p className="text-sm text-zinc-700">{status}</p>}
      <div className="flex justify-center pb-8">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          hasMore &&
          studentId && (
            <button
              className="rounded border px-4 py-2 text-sm"
              onClick={() => fetchPage(studentId, offset, true)}
            >
              Load more
            </button>
          )
        )}
      </div>
    </main>
  );
}
