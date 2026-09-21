"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession } from "@/lib/session";

type School = { id?: number; schoolCode: string; name: string; logoURL?: string };

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [schoolCode, setSchoolCode] = useState("0875");
  const [schools, setSchools] = useState<School[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookupSchools() {
    setBusy(true);
    setStatus("Looking up school…");
    try {
      const res = await fetch(
        `/api/pc/getSchoolByMobile?mobileNo=${encodeURIComponent(mobile)}`
      );
      const data = await res.json();
      const list =
        data?.listPASchoolDetails?.map((s: Record<string, string | number>) => ({
          id: typeof s.id === "number" ? s.id : Number(s.id),
          schoolCode: String(s.schoolCode),
          name: String(s.name),
          logoURL: String(s.logoURL ?? ""),
        })) ?? [];
      setSchools(list);
      if (list[0]?.schoolCode) setSchoolCode(list[0].schoolCode);
      setStatus(list.length ? `Found ${list.length} school(s).` : "No school found.");
    } catch (e) {
      setStatus(`Lookup failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("Logging in…");
    try {
      const res = await fetch(
        `/api/pc/login.html?userName=${encodeURIComponent(
          mobile
        )}&password=${encodeURIComponent(password)}&schoolCode=${encodeURIComponent(
          schoolCode
        )}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
      );
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Login failed");
      const firstStudent = data.studentList?.[0];
      saveSession({
        parent: data.parent,
        studentList: data.studentList ?? [],
        selectedStudentId: firstStudent?.id ?? null,
        schoolCode,
        schoolId: String(firstStudent?.schoolId ?? schools.find((s) => s.schoolCode === schoolCode)?.id ?? ""),
        schoolName: firstStudent?.schoolName ?? "",
      });
      router.push("/dashboard");
    } catch (err) {
      setStatus(`Login failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Carmel Portal — Login</h1>
      <p className="text-sm text-zinc-600">
        Same backend as the app (schoolCode 0875). Credentials stay in your
        browser only.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Mobile number
        <input
          className="rounded border p-2"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          inputMode="numeric"
        />
      </label>
      <button
        className="rounded bg-zinc-900 p-2 text-white disabled:opacity-50"
        onClick={lookupSchools}
        disabled={busy || !mobile}
      >
        Find my school
      </button>

      {schools.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {schools.map((s) => (
            <li key={s.schoolCode} className="rounded border p-2">
              {s.name} — {s.schoolCode}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={doLogin} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm">
          School code
          <input
            className="rounded border p-2"
            value={schoolCode}
            onChange={(e) => setSchoolCode(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            className="rounded border p-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          className="rounded bg-zinc-900 p-2 text-white disabled:opacity-50"
          disabled={busy || !password}
        >
          Login
        </button>
      </form>

      {status && <p className="text-sm text-zinc-700">{status}</p>}
    </main>
  );
}
