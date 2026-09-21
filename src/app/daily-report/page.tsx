"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import {
  dayReport,
  fileName,
  prettyDate,
  todayLocal,
  type DayItem,
  type DayReport,
} from "@/lib/daily";
import { loadSession, saveSession, type Session } from "@/lib/session";

function ItemCard({ item }: { item: DayItem }) {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      {item.subject && <p className="font-medium">{item.subject}</p>}
      {item.description && (
        <p className="whitespace-pre-line text-sm text-zinc-600">
          {item.description}
        </p>
      )}
      <p className="mt-1 text-xs text-zinc-500">
        {[item.chapters && `Ch: ${item.chapters}`, item.pageNo && `Pg: ${item.pageNo}`, item.templateName, item.date]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {item.fileUrl && (
        <a
          href={item.fileUrl}
          target="_blank"
          rel="noreferrer"
          download={fileName(item.fileUrl)}
          className="mt-2 inline-block rounded border px-3 py-1 text-sm"
        >
          Download {fileName(item.fileUrl).slice(0, 28)}
        </a>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items?: DayItem[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-zinc-600">
        {title} ({items.length})
      </h2>
      {items.map((it, i) => (
        <ItemCard key={`${title}-${it.id ?? i}`} item={it} />
      ))}
    </section>
  );
}

export default function DailyReportPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [report, setReport] = useState<DayReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  function fetchDay(sid: number, ymd: string) {
    setLoading(true);
    setStatus("");
    dayReport(sid, ymd)
      .then((d) => {
        setReport(d);
        const empty =
          !d.paHomeworks?.length &&
          !d.paPortioncovereds?.length &&
          !d.paClassTests?.length &&
          !d.paInstructions?.length &&
          !d.dailyReportFiles?.length;
        if (empty) setStatus("No data found for this date.");
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
      const ymd = todayLocal();
      setStudentId(sid);
      setDate(ymd);
      setLoading(true);
      dayReport(sid, ymd)
        .then((d) => {
          if (cancelled) return;
          setReport(d);
          const empty =
            !d.paHomeworks?.length &&
            !d.paPortioncovereds?.length &&
            !d.paClassTests?.length &&
            !d.paInstructions?.length &&
            !d.dailyReportFiles?.length;
          if (empty) setStatus("No data found for this date.");
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
    if (date) fetchDay(id, date);
  }

  function pickDate(ymd: string) {
    setDate(ymd);
    if (studentId) fetchDay(studentId, ymd);
  }

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Daily Report</h1>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <StudentPicker
          students={session.studentList}
          value={studentId}
          onChange={pickStudent}
        />
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            className="rounded border bg-white p-2"
            value={date}
            max={todayLocal()}
            onChange={(e) => e.target.value && pickDate(e.target.value)}
          />
        </label>
      </div>
      {date && (
        <p className="text-sm text-zinc-500">{prettyDate(date)}</p>
      )}

      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          ["/daily-report/homework", "Homework"],
          ["/daily-report/portion", "Portion Taken"],
          ["/daily-report/files", "Files & Images"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="rounded border px-3 py-1">
            {label} →
          </Link>
        ))}
      </nav>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      {report && (
        <>
          <Section title="Homework" items={report.paHomeworks} />
          <Section title="Portion Covered" items={report.paPortioncovereds} />
          <Section title="Class Test" items={report.paClassTests} />
          <Section title="Instructions" items={report.paInstructions} />
          <Section title="Files & Images" items={report.dailyReportFiles} />
        </>
      )}
    </main>
  );
}
