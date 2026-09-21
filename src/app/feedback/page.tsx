"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePortalSession } from "@/components/usePortalSession";
import {
  issueList,
  parentEmail,
  parentFeedbackHistory,
  submitIssue,
} from "@/lib/more";

function toList(d: unknown): Record<string, unknown>[] {
  if (Array.isArray(d)) return d as Record<string, unknown>[];
  if (d && typeof d === "object") {
    for (const v of Object.values(d as Record<string, unknown>)) {
      if (Array.isArray(v)) return v as Record<string, unknown>[];
    }
    return [d as Record<string, unknown>];
  }
  return [];
}

export default function FeedbackPage() {
  const { session } = usePortalSession();
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [issues, setIssues] = useState<{ id?: number; name?: string }[]>([]);
  const [issueId, setIssueId] = useState("");
  const [rating, setRating] = useState("5");
  const [desc, setDesc] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      parentFeedbackHistory(session.parent.id)
        .then((d) => {
          if (!cancelled) setHistory(toList(d));
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      issueList(session.schoolId)
        .then((d) => {
          if (cancelled) return;
          const list = toList(d).flatMap((x) =>
            Array.isArray(x.issueList) ? x.issueList : [x]
          ) as { id?: number; name?: string }[];
          setIssues(list.filter((x) => x && (x.id !== undefined || x.name)));
        })
        .catch(() => {});
      parentEmail(session.parent.id)
        .then((d) => {
          if (cancelled) return;
          try {
            const em = JSON.parse(d.response || "null") as string;
            if (typeof em === "string") setEmail(em);
          } catch {}
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  function submit() {
    if (!session) return;
    if (!issueId || !desc.trim()) {
      setStatus("Pick an issue and describe it.");
      return;
    }
    setBusy(true);
    submitIssue({
      SchoolId: session.schoolId,
      parentId: session.parent.id,
      rating: Number(rating),
      IssueId: Number(issueId),
      Connectivity: "",
      Carriers: "",
      IssueDescription: desc,
      Devicename: "web",
      Devicetype: "portal",
      DeviceOs: "portal",
      OtherDetails: "",
      module: "portal",
      emailId: email,
    })
      .then((r) => {
        setStatus(
          r?.success ? "Saved. Thank you for the feedback!" : "Submit returned without success."
        );
        setDesc("");
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
        <h1 className="text-2xl font-semibold">Feedback</h1>
      </header>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      <section className="flex flex-col gap-2 rounded-lg border bg-white p-3">
        <h2 className="text-sm font-semibold text-zinc-600">Report an issue</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Issue
            <select
              className="rounded border bg-white p-2"
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
            >
              <option value="">Select…</option>
              {issues.map((x, i) => (
                <option key={x.id ?? i} value={x.id ?? ""}>
                  {x.name ?? `Issue ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Rating (1-5)
            <select
              className="rounded border bg-white p-2"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            >
              {["5", "4", "3", "2", "1"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            className="rounded border p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            className="rounded border p-2"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </label>
        <button
          className="self-start rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={busy}
          onClick={submit}
        >
          Submit
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-600">
          Past feedback {history.length > 0 && `(${history.length})`}
        </h2>
        {history.map((h, i) => (
          <article key={i} className="rounded-lg border bg-white p-3 text-sm shadow-sm">
            {Object.entries(h)
              .slice(0, 6)
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
