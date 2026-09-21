"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MarkTableView from "@/components/MarkTable";
import StudentPicker from "@/components/StudentPicker";
import {
  academicYears,
  asTable,
  deletePdf,
  feePendingStatus,
  generatePdfLink,
  markDetails,
  yearLabel,
  type AcademicYear,
  type MarkReport,
} from "@/lib/marks";
import { loadSession, saveSession, type Session } from "@/lib/session";

function remarkText(r: MarkReport): string {
  const t = r.totalMarkAndRemark;
  if (!t || typeof t === "string") return "";
  return [t.markObtained, t.totalMark, t.grade, t.remark, t.remarkText]
    .filter((x) => x && x !== "")
    .join(" · ");
}

export default function MarksPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearId] = useState<number | null>(null);
  const [reports, setReports] = useState<MarkReport[]>([]);
  const [feeBlocked, setFeeBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [pdfBusy, setPdfBusy] = useState<number | null>(null);

  function fetchReports(sid: number, yid: number, schoolId: string) {
    setLoading(true);
    setStatus("");
    feePendingStatus(schoolId, sid)
      .then((f) => {
        if (f.feePendingStatus) {
          setFeeBlocked(true);
          setReports([]);
          setStatus(
            "We apologize, but the access to the results is currently restricted. It appears there are outstanding fees to be paid. Please clear the dues and avail the results."
          );
          return;
        }
        setFeeBlocked(false);
        return markDetails(sid, yid).then((d) => {
          setReports(Array.isArray(d) ? d : []);
          if (!Array.isArray(d) || d.length === 0)
            setStatus("No mark cards found for this year.");
        });
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
      const schoolId =
        s.schoolId || String(s.studentList[0]?.schoolId ?? "");
      setLoading(true);
      academicYears(schoolId)
        .then((ys) => {
          if (cancelled) return;
          setYears(ys);
          const open = ys.find((y) => y.academicYearStatus === "Open");
          const yid = open?.id ?? ys[0]?.id;
          if (!yid) {
            setStatus("No academic years found.");
            return;
          }
          setYearId(yid);
          fetchReports(sid, yid, schoolId);
        })
        .catch((e) => {
          if (cancelled) return;
          setStatus(`Failed to load: ${(e as Error).message}`);
          setLoading(false);
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
    if (yearId && session) {
      const schoolId =
        session.schoolId || String(session.studentList[0]?.schoolId ?? "");
      fetchReports(id, yearId, schoolId);
    }
  }

  function pickYear(yid: number) {
    setYearId(yid);
    if (studentId && session) {
      const schoolId =
        session.schoolId || String(session.studentList[0]?.schoolId ?? "");
      fetchReports(studentId, yid, schoolId);
    }
  }

  function downloadPdf(reportId: number) {
    if (!studentId || !yearId) return;
    setPdfBusy(reportId);
    setStatus("");
    generatePdfLink(reportId, studentId, yearId)
      .then((link) => {
        window.open(link, "_blank", "noopener");
        setStatus("PDF opened. Cleaning up in 10 seconds…");
        setTimeout(() => {
          deletePdf(link).catch(() => {});
          setStatus("");
          setPdfBusy(null);
        }, 10000);
      })
      .catch((e) => {
        setStatus(
          `PDF not available for this report: ${(e as Error).message}`
        );
        setPdfBusy(null);
      });
  }

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Marks Card</h1>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <StudentPicker
          students={session.studentList}
          value={studentId}
          onChange={pickStudent}
        />
        <label className="flex flex-col gap-1 text-sm">
          Academic year
          <select
            className="rounded border bg-white p-2"
            value={yearId ?? ""}
            onChange={(e) => e.target.value && pickYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {yearLabel(y)}
                {y.academicYearStatus === "Open" ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      {!feeBlocked &&
        reports.map((r, i) => {
          const scholastic = asTable(r.scholasticMark);
          const attend = asTable(r.attendance);
          return (
            <article
              key={r.reportId ?? i}
              className="flex flex-col gap-2 rounded-lg border bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{r.examName || "Report"}</h2>
                  {r.rptDate && (
                    <p className="text-xs text-zinc-500">Date: {r.rptDate}</p>
                  )}
                  {remarkText(r) && (
                    <p className="mt-1 text-sm text-zinc-600">{remarkText(r)}</p>
                  )}
                  {r.gradeScale && (
                    <p className="mt-1 text-xs text-zinc-500">{r.gradeScale}</p>
                  )}
                </div>
                {r.reportId ? (
                  <button
                    disabled={pdfBusy === r.reportId}
                    onClick={() => downloadPdf(r.reportId as number)}
                    className="shrink-0 rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    {pdfBusy === r.reportId ? "Preparing…" : "Download PDF"}
                  </button>
                ) : null}
              </div>
              {scholastic && <MarkTableView table={scholastic} />}
              {attend && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-zinc-500">
                    Attendance
                  </p>
                  <MarkTableView table={attend} />
                </div>
              )}
            </article>
          );
        })}

      <div className="pb-8" />
    </main>
  );
}
