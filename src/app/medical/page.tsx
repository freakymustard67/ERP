"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudentPicker from "@/components/StudentPicker";
import { usePortalSession } from "@/components/usePortalSession";
import {
  medicalDeactivate,
  medicalList,
  medicalSave,
  type MedicalCondition,
} from "@/lib/more";
import { loadSession, saveSession } from "@/lib/session";

const EMPTY = {
  emergencyPhNo: "",
  allergies: "",
  precaution: "",
  currentMedication: "",
  emergencyAction: "",
  symptomNature: "",
  hospital: "",
  physician: "",
  physicianPhNo: "",
  description: "",
  lastOccurred: "",
  tetanusDate: "",
};

function toList(d: unknown): MedicalCondition[] {
  if (Array.isArray(d)) return d as MedicalCondition[];
  if (d && typeof d === "object") {
    for (const v of Object.values(d as Record<string, unknown>)) {
      if (Array.isArray(v)) return v as MedicalCondition[];
    }
  }
  return [];
}

export default function MedicalPage() {
  const { session } = usePortalSession();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [conds, setConds] = useState<MedicalCondition[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  function fetchList(sid: number) {
    const s = loadSession();
    if (!s) return;
    setLoading(true);
    medicalList(s.schoolId, sid, s.parent.id)
      .then((d) => setConds(toList(d)))
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
      fetchList(sid);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  function pickStudent(id: number) {
    setStudentId(id);
    const s = loadSession();
    if (s) saveSession({ ...s, selectedStudentId: id });
    setForm({ ...EMPTY });
    setEditingId(0);
    setStatus("");
    fetchList(id);
  }

  function edit(c: MedicalCondition) {
    setEditingId(Number(c.medicalConditionId ?? 0));
    setForm({
      emergencyPhNo: String(c.emergencyPhNo ?? ""),
      allergies: String(c.allergies ?? ""),
      precaution: String(c.precautions ?? c.precaution ?? ""),
      currentMedication: String(c.currentMedication ?? ""),
      emergencyAction: String(c.emergencyAction ?? ""),
      symptomNature: String(c.symptomNature ?? ""),
      hospital: String(c.hospitalName ?? c.hospital ?? ""),
      physician: String(c.physicianName ?? c.physician ?? ""),
      physicianPhNo: String(c.physicianPhNo ?? ""),
      description: String(c.description ?? ""),
      lastOccurred: String(c.lastOccurred ?? ""),
      tetanusDate: String(c.tetanusDate ?? c.tetanusdate ?? ""),
    });
    setStatus("");
  }

  function save() {
    const s = loadSession();
    if (!s || !studentId) return;
    if (!form.emergencyPhNo.trim()) {
      setStatus("Emergency phone number is required.");
      return;
    }
    const st = s.studentList.find((x) => x.id === studentId);
    setBusy(true);
    medicalSave({
      schoolId: s.schoolId,
      standardId: st?.standardId ?? "",
      divisionId: st?.divisionId ?? "",
      standard: st?.standard ?? "",
      division: st?.division ?? "",
      parentId: s.parent.id,
      studentId,
      medicalConditionId: editingId,
      lastOccurred: form.lastOccurred,
      tetanusDate: form.tetanusDate,
      emergencyPhNo: form.emergencyPhNo,
      allergies: form.allergies,
      precautions: form.precaution,
      currentMedication: form.currentMedication,
      emergencyAction: form.emergencyAction,
      symptomNature: form.symptomNature,
      hospitalName: form.hospital,
      physicianName: form.physician,
      physicianPhNo: form.physicianPhNo,
      description: form.description,
    })
      .then((r) => {
        setStatus(
          r?.success ? "Medical condition saved successfully." : "Not updated. Some error occurred."
        );
        setForm({ ...EMPTY });
        setEditingId(0);
        fetchList(studentId);
      })
      .catch((e) => setStatus(`Failed: ${(e as Error).message}`))
      .finally(() => setBusy(false));
  }

  function deactivate(id: number) {
    const s = loadSession();
    if (!s || !studentId) return;
    setBusy(true);
    medicalDeactivate(s.schoolId, studentId, id)
      .then(() => {
        setStatus("Deactivated.");
        fetchList(studentId);
      })
      .catch((e) => setStatus(`Failed: ${(e as Error).message}`))
      .finally(() => setBusy(false));
  }

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  const fields: [keyof typeof EMPTY, string, string][] = [
    ["emergencyPhNo", "Emergency phone *", "tel"],
    ["allergies", "Allergies", "text"],
    ["precaution", "Precautions", "text"],
    ["currentMedication", "Current medication", "text"],
    ["emergencyAction", "Emergency action", "text"],
    ["symptomNature", "Symptom nature", "text"],
    ["hospital", "Hospital", "text"],
    ["physician", "Physician", "text"],
    ["physicianPhNo", "Physician phone", "tel"],
    ["description", "Description", "text"],
    ["lastOccurred", "Last occurred", "date"],
    ["tetanusDate", "Tetanus date", "date"],
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Medical Consent</h1>
      </header>

      <StudentPicker
        students={session.studentList}
        value={studentId}
        onChange={pickStudent}
      />

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-600">
          {conds.length === 0 && !loading ? "No conditions on file." : "Conditions"}
        </h2>
        {conds.map((c, i) => (
          <article
            key={Number(c.medicalConditionId ?? i)}
            className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3 text-sm shadow-sm"
          >
            <div>
              <p className="font-medium">
                {[c.allergies, c.symptomNature].filter(Boolean).join(" · ") || "Condition"}
              </p>
              <p className="text-zinc-600">
                {[c.physicianName ?? c.physician, c.hospitalName ?? c.hospital]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="rounded border px-3 py-1"
                onClick={() => edit(c)}
              >
                Edit
              </button>
              <button
                className="rounded border px-3 py-1"
                disabled={busy}
                onClick={() => deactivate(Number(c.medicalConditionId ?? 0))}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-2 rounded-lg border bg-white p-3">
        <h2 className="text-sm font-semibold text-zinc-600">
          {editingId ? "Edit condition" : "Add condition"}
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {fields.map(([k, label, type]) => (
            <label key={k} className="flex flex-col gap-1 text-sm">
              {label}
              <input
                type={type}
                className="rounded border p-2"
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="flex gap-2 text-sm">
          <button
            className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
            disabled={busy}
            onClick={save}
          >
            Save
          </button>
          {editingId !== 0 && (
            <button
              className="rounded border px-4 py-2"
              onClick={() => {
                setEditingId(0);
                setForm({ ...EMPTY });
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </section>
      <div className="pb-8" />
    </main>
  );
}
