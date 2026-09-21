"use client";

import { useState } from "react";
import { uploadAnswerPaper } from "@/lib/more";

export default function AnswerUpload({
  studentId,
  dailyReportFileId,
  onDone,
}: {
  studentId: number;
  dailyReportFileId: number;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setMsg("Uploading…");
    uploadAnswerPaper(studentId, dailyReportFileId, Array.from(files))
      .then((r) => {
        setMsg(r?.success ? "Upload successful." : "Upload finished.");
        onDone?.();
      })
      .catch((e) => setMsg(`Upload failed: ${(e as Error).message}`))
      .finally(() => setBusy(false));
  }

  return (
    <label className="mt-2 inline-block text-sm">
      <span className="cursor-pointer rounded border px-3 py-1">
        {busy ? "Uploading…" : "Upload answer"}
      </span>
      <input
        type="file"
        multiple
        className="hidden"
        disabled={busy}
        onChange={(e) => pick(e.target.files)}
      />
      {msg && <span className="ml-2 text-xs text-zinc-600">{msg}</span>}
    </label>
  );
}
