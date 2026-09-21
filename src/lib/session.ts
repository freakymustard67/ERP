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

/** Lenient POST: some endpoints return 200 with an empty body when
 *  there is no data. Returns null instead of throwing on bad JSON. */
export async function pcPostLoose<T>(path: string, body: unknown = {}): Promise<T | null> {
  const res = await fetch(`/api/pc/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** For endpoints that return plain text (e.g. "success"). */
export async function pcPostText(path: string, body: unknown = {}): Promise<string> {
  const res = await fetch(`/api/pc/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.text();
}

/** For multipart uploads (answer papers, activity files). */
export async function pcPostForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`/api/pc/${path.replace(/^\//, "")}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
