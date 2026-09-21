"use client";

import { useState } from "react";
import { saveItemFeedback } from "@/lib/more";

const OPTIONS = ["Excellent", "Good", "Average", "Poor", "Other"];

/** App-style feedback: preset rating or free text, saved per item. */
export default function FeedbackForm({
  studentId,
  dailyreportId,
  studentFeedbackId = 0,
  category,
  existingText = "",
  onSaved,
}: {
  studentId: number;
  dailyreportId: number;
  studentFeedbackId?: number;
  category: string;
  existingText?: string;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [option, setOption] = useState(existingText || "Good");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function submit() {
    const feedbackText = option === "Other" ? text.trim() : option;
    if (!feedbackText) {
      setMsg("Pick a rating or write feedback.");
      return;
    }
    setBusy(true);
    saveItemFeedback({
      studentId,
      feedbackText,
      dailyreportId,
      studentFeedbackId,
      category,
    })
      .then((t) => {
        if (String(t).trim().toLowerCase().includes("success")) {
          setMsg("Feedback sent successfully!");
          setOpen(false);
          onSaved?.();
        } else {
          setMsg(`Server said: ${String(t).slice(0, 120)}`);
        }
      })
      .catch((e) => setMsg(`Failed: ${(e as Error).message}`))
      .finally(() => setBusy(false));
  }

  if (!open) {
    return (
      <button
        className="mt-2 rounded border px-3 py-1 text-sm"
        onClick={() => {
          setOpen(true);
          setMsg("");
        }}
      >
        {studentFeedbackId ? "View / update feedback" : "Give feedback"}
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded border p-2">
      <select
        className="rounded border bg-white p-1 text-sm"
        value={OPTIONS.includes(option) ? option : "Other"}
        onChange={(e) => setOption(e.target.value)}
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {(option === "Other" || !OPTIONS.includes(option)) && (
        <textarea
          className="rounded border p-1 text-sm"
          rows={2}
          placeholder="Write feedback…"
          value={OPTIONS.includes(option) ? text : option}
          onChange={(e) => {
            setText(e.target.value);
            setOption("Other");
          }}
        />
      )}
      <div className="flex gap-2 text-sm">
        <button
          className="rounded bg-zinc-900 px-3 py-1 text-white disabled:opacity-50"
          disabled={busy}
          onClick={submit}
        >
          Submit
        </button>
        <button
          className="rounded border px-3 py-1"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
      {msg && <p className="text-xs text-zinc-600">{msg}</p>}
    </div>
  );
}
