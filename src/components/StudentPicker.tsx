"use client";

import type { Student } from "@/lib/session";

export default function StudentPicker({
  students,
  value,
  onChange,
}: {
  students: Student[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      Student
      <select
        className="rounded border bg-white p-2"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} · {String(s.standard ?? "")}
          </option>
        ))}
      </select>
    </label>
  );
}
