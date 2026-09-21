"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePortalSession } from "@/components/usePortalSession";
import { fileName } from "@/lib/daily";
import { loadNewsLetter, type NewsFile } from "@/lib/more";

const MODES = [
  { value: "SchoolWise,ClassWise", id: "All" },
  { value: "SchoolWise", id: "General" },
  { value: "ClassWise", id: "Individual" },
];

function ddmmyyyy(ymd: string): string | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-");
  return `${d}-${m}-${y}`;
}

export default function NewsletterPage() {
  const { session } = usePortalSession();
  const [mode, setMode] = useState(MODES[0].value);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<[string, NewsFile[]][]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  function search() {
    if (!session) return;
    setLoading(true);
    setStatus("");
    const studentIds = session.studentList.map((s) => s.id).join(",");
    loadNewsLetter({
      studentIds,
      type: mode,
      searchData: query,
      fromDate: ddmmyyyy(from),
      toDate: ddmmyyyy(to),
    })
      .then((d) => {
        const entries = d ? Object.entries(d) : [];
        entries.sort((a, b) => +new Date(b[0]) - +new Date(a[0]));
        setGroups(entries);
        if (entries.length === 0) setStatus("No newsletters found.");
      })
      .catch((e) => setStatus(`Failed to load: ${(e as Error).message}`))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const studentIds = session.studentList.map((s) => s.id).join(",");
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      loadNewsLetter({
        studentIds,
        type: MODES[0].value,
        searchData: "",
        fromDate: null,
        toDate: null,
      })
        .then((d) => {
          if (cancelled) return;
          const entries = d ? Object.entries(d) : [];
          entries.sort((a, b) => +new Date(b[0]) - +new Date(a[0]));
          setGroups(entries);
          if (entries.length === 0) setStatus("No newsletters found.");
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
  }, [session]);

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Newsletter</h1>
      </header>

      <div className="grid grid-cols-1 gap-2 rounded-lg border bg-white p-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Audience
          <select
            className="rounded border bg-white p-2"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            {MODES.map((m) => (
              <option key={m.id} value={m.value}>
                {m.id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Search
          <input
            className="rounded border p-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search text…"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          From
          <input
            type="date"
            className="rounded border bg-white p-2"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          To
          <input
            type="date"
            className="rounded border bg-white p-2"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          className="rounded bg-zinc-900 p-2 text-white disabled:opacity-50 sm:col-span-2"
          disabled={loading}
          onClick={search}
        >
          Search
        </button>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      {groups.map(([date, files]) => (
        <section key={date} className="flex flex-col gap-2">
          <p className="text-sm text-zinc-500">{date}</p>
          {files.map((f, i) => (
            <article
              key={`${date}-${i}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm"
            >
              <div>
                <p className="font-medium">{f.fileName || "File"}</p>
                {f.description && (
                  <p className="text-sm text-zinc-600">{f.description}</p>
                )}
                <p className="text-xs text-zinc-500">
                  {[f.mode === "SchoolWise" ? "General" : f.className, f.fileType]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {f.fileUrl && (
                <a
                  href={String(f.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  download={fileName(String(f.fileUrl))}
                  className="shrink-0 rounded border px-3 py-1 text-sm"
                >
                  Download
                </a>
              )}
            </article>
          ))}
        </section>
      ))}
      <div className="pb-8" />
    </main>
  );
}
