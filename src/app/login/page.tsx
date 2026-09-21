"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgotPassword, sendSchoolCode, verifyOtp } from "@/lib/more";
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
  const [mode, setMode] = useState<"password" | "otp" | "forgot">("password");
  const [otp, setOtp] = useState("");

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

  async function sendOtp() {
    setBusy(true);
    setStatus("Sending OTP…");
    try {
      await sendSchoolCode(mobile, schoolCode);
      setStatus("OTP sent by SMS. Enter it below.");
    } catch (e) {
      setStatus(`Send failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function doOtpLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("Verifying…");
    try {
      const data = (await verifyOtp(mobile, otp, schoolCode, mobile)) as {
        success?: boolean;
        message?: string;
        parent?: { id: number; name: string; phoneNo: string };
        studentList?: {
          id: number;
          schoolId?: number;
          schoolName?: string;
        }[];
      };
      if (data?.parent && data?.studentList) {
        const first = data.studentList[0];
        saveSession({
          parent: data.parent as { id: number; name: string; phoneNo: string },
          studentList: data.studentList as never[],
          selectedStudentId: first?.id ?? null,
          schoolCode,
          schoolId: String(
            first?.schoolId ??
              schools.find((s) => s.schoolCode === schoolCode)?.id ??
              ""
          ),
          schoolName: first?.schoolName ?? "",
        });
        router.push("/dashboard");
      } else {
        setStatus(data?.message || "Verified. Continue in the app to finish setup.");
      }
    } catch (err) {
      setStatus(`Verify failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function doForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("Requesting…");
    try {
      const data = await forgotPassword(mobile, schoolCode);
      setStatus(data?.message || "Request sent. Check your phone.");
    } catch (err) {
      setStatus(`Failed: ${(err as Error).message}`);
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

      <div className="flex gap-2 text-sm">
        {(["password", "otp", "forgot"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setStatus("");
            }}
            className={`rounded border px-3 py-1 ${
              mode === m ? "bg-zinc-900 text-white" : "bg-white"
            }`}
          >
            {m === "password" ? "Password" : m === "otp" ? "OTP" : "Forgot?"}
          </button>
        ))}
      </div>

      {mode === "password" && (
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
      )}

      {mode === "otp" && (
        <form onSubmit={doOtpLogin} className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            School code
            <input
              className="rounded border p-2"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded border p-2 disabled:opacity-50"
            onClick={sendOtp}
            disabled={busy || !mobile}
          >
            Send OTP by SMS
          </button>
          <label className="flex flex-col gap-1 text-sm">
            OTP
            <input
              className="rounded border p-2"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <button
            className="rounded bg-zinc-900 p-2 text-white disabled:opacity-50"
            disabled={busy || !otp}
          >
            Verify & login
          </button>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={doForgot} className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            School code
            <input
              className="rounded border p-2"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
            />
          </label>
          <button
            className="rounded bg-zinc-900 p-2 text-white disabled:opacity-50"
            disabled={busy || !mobile}
          >
            Reset password by SMS
          </button>
        </form>
      )}

      {status && <p className="text-sm text-zinc-700">{status}</p>}
    </main>
  );
}
