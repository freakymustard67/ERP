"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { parentBadging } from "@/lib/more";
import {
  clearSession,
  loadSession,
  saveSession,
  type Session,
} from "@/lib/session";

type Group = {
  title: string;
  links: { href: string; label: string; desc: string; badge?: string }[];
};

const GROUPS: Group[] = [
  {
    title: "Notices",
    links: [
      { href: "/circular", label: "Circular", desc: "Dear Parents notices", badge: "circular" },
      { href: "/newsletter", label: "Newsletter", desc: "files & announcements", badge: "newsletter" },
      { href: "/gallery", label: "Gallery", desc: "school photos", badge: "gallery" },
      { href: "/calendar", label: "Calendar", desc: "events & holidays" },
    ],
  },
  {
    title: "Daily report",
    links: [
      { href: "/daily-report", label: "Day report", desc: "per date + feedback" },
      { href: "/daily-report/homework", label: "Homework", desc: "full history" },
      { href: "/daily-report/portion", label: "Portion taken", desc: "full history" },
      { href: "/daily-report/files", label: "Files & images", desc: "downloads + upload" },
      { href: "/activities", label: "Activities", desc: "LMS assignments" },
    ],
  },
  {
    title: "Exams & attendance",
    links: [
      { href: "/exams", label: "Exams", desc: "details + reports" },
      { href: "/marks", label: "Marks card", desc: "progress cards + PDF" },
      { href: "/timetable", label: "Timetable", desc: "class schedule" },
      { href: "/hallticket", label: "Hall ticket", desc: "exam hall ticket" },
      { href: "/online-class", label: "Online class", desc: "live class status" },
      { href: "/previous-classes", label: "Previous classes", desc: "past reports" },
      { href: "/attendance", label: "Attendance", desc: "absent report" },
      { href: "/leave", label: "Apply leave", desc: "leave form" },
    ],
  },
  {
    title: "More",
    links: [
      { href: "/medical", label: "Medical consent", desc: "health conditions" },
      { href: "/transport", label: "Transport", desc: "bus tracking" },
      { href: "/library", label: "Library", desc: "book history" },
      { href: "/feedback", label: "Feedback", desc: "history + report issue" },
    ],
  },
];

export default function DashboardPage() {
  const router = useRouter();
  // null on first render on BOTH server and client (hydration-safe);
  // session is loaded after mount.
  const [session, setSession] = useState<Session | null>(null);
  const [badges, setBadges] = useState<Record<string, number>>({});

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
      parentBadging(s.parent.id, s.schoolId)
        .then((b) => {
          if (cancelled) return;
          setBadges({
            circular: Number(b.circularCount ?? 0),
            newsletter: Number(b.newsLetterCount ?? 0),
            gallery: Number(b.galleryCount ?? 0),
          });
        })
        .catch(() => {});
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

      {GROUPS.map((g) => (
        <section key={g.title} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-600">{g.title}</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {g.links.map((q) => (
              <Link
                key={q.label}
                href={q.href}
                className="rounded border bg-white p-3 shadow-sm hover:bg-zinc-50"
              >
                <div className="flex items-center justify-between font-medium">
                  {q.label}
                  {q.badge && (badges[q.badge] ?? 0) > 0 && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                      {badges[q.badge]}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500">{q.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div className="pb-8" />
      <div className="pb-8" />
    </main>
  );
}
