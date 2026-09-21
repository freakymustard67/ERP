// Client-only session helpers (localStorage). Keep secrets out of the repo:
// credentials live only in the browser, never committed.
"use client";

export type Student = {
  id: number;
  name: string;
  standard?: string;
  division?: string;
  admissionNo?: string;
  schoolCode?: string;
  schoolName?: string;
  [k: string]: unknown;
};

export type Session = {
  parent: { id: number; name: string; phoneNo: string; [k: string]: unknown };
  studentList: Student[];
  selectedStudentId: number | null;
  schoolCode: string;
  schoolId: string;
  schoolName: string;
};

const KEY = "carmel.session.v1";

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export async function pcGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/pc/${path.replace(/^\//, "")}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function pcPost<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(`/api/pc/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}
