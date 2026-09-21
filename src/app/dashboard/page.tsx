"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearSession,
  loadSession,
  pcPost,
  saveSession,
  type Session,
} from "@/lib/session";

const QUICK_LINKS = [
  { href: "/circular", label: "Circular", desc: "Dear Parents notices" },
  { href: "/daily-report", label: "Day report / Homework", desc: "dailyreport/dayReport" },
  { href: "#", label: "Fees & receipts", desc: "loadFeePayment" },
  { href: "#", label: "Exams & hall tickets", desc: "loadStudentExamReportForParentApp" },
  { href: "#", label: "Timetable", desc: "loadClassTimetable" },
  { href: "#", label: "Attendance", desc: "attendanceList" },
  { href: "#", label: "Circulars", desc: "app/circular" },
];

export default function DashboardPage() {
  const router = useRouter();
  // null on first render on BOTH server and client (hydration-safe);
  // session is loaded after mount.
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<string>("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const s = loadSession();
      if (!s) {
        router.replace("/login");
        return;
      }
      setSession(s);
      pcPost(`/profile.html?parentId=${s.parent.id}&schoolCode=${s.schoolCode}`, "")
        .then((d) => {
          if (!cancelled) setProfile(JSON.stringify(d).slice(0, 600));
        })
        .catch((e) => {
          if (!cancelled)
            setStatus(`Profile load failed: ${(e as Error).message}`);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!session) return <main className="p-6 text-sm">Loading…</main>;
  const selected = session.studentList.find(
    (s) => s.id === session.selectedStudentId
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {session.schoolName || "Carmel Public School"}
          </h1>
          <p className="text-sm text-zinc-600">
            {session.parent.name} · {session.parent.phoneNo}
          </p>
        </div>
        <button
          className="rounded border px-3 py-1 text-sm"
          onClick={() => {
            clearSession();
            router.replace("/login");
          }}
        >
          Logout
        </button>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-600">Students</h2>
        <div className="flex flex-wrap gap-2">
          {session.studentList.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                const next = { ...session, selectedStudentId: s.id };
                setSession(next);
                saveSession(next);
              }}
              className={`rounded border px-3 py-2 text-left text-sm ${
                s.id === session.selectedStudentId
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "bg-white"
              }`}
            >
              <div className="font-medium">{s.name}</div>
              <div className="opacity-70">
                {String(s.standard ?? "")} {String(s.division ?? "")} · Adm{" "}
                {String(s.admissionNo ?? "")}
              </div>
            </button>
          ))}
        </div>
        {selected && (
          <p className="text-sm text-zinc-600">
            Selected: {selected.name} (id {selected.id})
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {QUICK_LINKS.map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className="rounded border p-3 hover:bg-zinc-50"
          >
            <div className="font-medium">{q.label}</div>
            <div className="text-xs text-zinc-500">{q.desc} — coming in v1 next</div>
          </Link>
        ))}
      </section>

      {profile && (
        <section className="rounded bg-zinc-50 p-3 text-xs text-zinc-700">
          profile.html preview: {profile}…
        </section>
      )}
      {status && <p className="text-sm text-red-700">{status}</p>}
    </main>
  );
}
