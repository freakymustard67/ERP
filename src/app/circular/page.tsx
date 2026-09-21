"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { loadSession, pcPost, type Session } from "@/lib/session";

type CircularItem = {
  id?: number;
  messageType?: string;
  message?: string;
  messageCircular?: string;
  date?: string;
  sentAt?: string;
  messageData?: string;
};

type CircularGroup = {
  date: string;
  circularList: CircularItem[];
};

const PAGE = 10;

function mergeGroups(
  prev: CircularGroup[],
  incoming: CircularGroup[]
): CircularGroup[] {
  const out = [...prev];
  for (const g of incoming) {
    const idx = out.findIndex((x) => x.date === g.date);
    if (idx >= 0) {
      out[idx] = {
        ...out[idx],
        circularList: [...out[idx].circularList, ...g.circularList],
      };
    } else {
      out.push(g);
    }
  }
  return out;
}

function fmtTime(sentAt?: string): string {
  if (!sentAt) return "";
  const m = sentAt.match(/(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!m) return "";
  let h = Number(m[1]);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
}

export default function CircularPage() {
  const router = useRouter();
  // null on first render on BOTH server and client (hydration-safe);
  // session is loaded after mount.
  const [session, setSession] = useState<Session | null>(null);
  const [groups, setGroups] = useState<CircularGroup[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const loadMore = useCallback(
    async (sess: Session, off: number) => {
      setLoading(true);
      try {
        const data = await pcPost<CircularGroup[]>("/circulars/countwise", {
          phoneNumber: sess.parent.phoneNo,
          offset: off,
          count: PAGE,
          schoolId: sess.schoolId || sess.studentList[0]?.schoolId,
        });
        if (!Array.isArray(data) || data.length === 0) {
          setHasMore(false);
          if (off === 0) setStatus("No circulars found.");
          return;
        }
        setGroups((g) => mergeGroups(g, data));
        setOffset(off + PAGE);
        if (data.length < PAGE) setHasMore(false);
      } catch (e) {
        setStatus(`Failed to load circulars: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    // Deferred so all setState happens in callbacks, never sync in the effect.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const s = loadSession();
      if (!s) {
        router.replace("/login");
        return;
      }
      setSession(s);
      pcPost<CircularGroup[]>("/circulars/countwise", {
        phoneNumber: s.parent.phoneNo,
        offset: 0,
        count: PAGE,
        schoolId: s.schoolId || String(s.studentList[0]?.schoolId ?? ""),
      })
        .then((data) => {
          if (cancelled) return;
          if (!Array.isArray(data) || data.length === 0) {
            setHasMore(false);
            setStatus("No circulars found.");
            return;
          }
          setGroups(data);
          setOffset(PAGE);
          if (data.length < PAGE) setHasMore(false);
        })
        .catch((e) => {
          if (!cancelled)
            setStatus(`Failed to load circulars: ${(e as Error).message}`);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Circular</h1>
      </header>

      {groups.map((g, gi) => (
        <section key={`${g.date}-${gi}`} className="flex flex-col gap-2">
          <p className="text-sm text-zinc-500">{g.date}</p>
          {g.circularList.map((c, i) => (
            <article
              key={`${gi}-${i}`}
              className="flex justify-between gap-3 rounded-lg border bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <h2 className="font-semibold">{c.messageType || "Circular"}</h2>
                <p className="whitespace-pre-line text-sm text-zinc-600">
                  {c.messageCircular || c.message || ""}
                </p>
              </div>
              <span className="shrink-0 text-sm text-zinc-500">
                {fmtTime(c.sentAt)}
              </span>
            </article>
          ))}
        </section>
      ))}

      {status && <p className="text-sm text-zinc-700">{status}</p>}

      <div className="flex justify-center pb-8">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          hasMore && (
            <button
              className="rounded border px-4 py-2 text-sm"
              onClick={() => session && void loadMore(session, offset)}
            >
              Load more
            </button>
          )
        )}
      </div>
    </main>
  );
}
