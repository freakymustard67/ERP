"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePortalSession } from "@/components/usePortalSession";
import { galleryFolders, type GalleryFolder } from "@/lib/more";

const SPACE_BASE = "https://appscook.ams3.digitaloceanspaces.com";

function parseS3Keys(xml: string): string[] {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const keys: string[] = [];
    doc.querySelectorAll("Contents > Key").forEach((n) => {
      const k = n.textContent || "";
      if (k && !k.endsWith("/")) keys.push(`${SPACE_BASE}/${k}`);
    });
    return keys;
  } catch {
    return [];
  }
}

export default function GalleryPage() {
  const { session } = usePortalSession();
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFolder, setLoadingFolder] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      galleryFolders(session.schoolCode)
        .then((d) => {
          if (cancelled) return;
          const list = d.galleryFolderList ?? [];
          setFolders(list);
          if (list.length === 0) setStatus("No gallery folders found.");
        })
        .catch((e) => {
          if (!cancelled) setStatus(`Failed to load: ${(e as Error).message}`);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  function openFolder(f: GalleryFolder) {
    const name = f.folderName || "";
    setOpen(name);
    const thumbs = f.thumbNailImages ?? [];
    setImages(thumbs);
    if (f.gallerylUrl) {
      setLoadingFolder(true);
      fetch(f.gallerylUrl)
        .then((r) => {
          if (!r.ok) throw new Error(`listing failed: ${r.status}`);
          return r.text();
        })
        .then((xml) => {
          const keys = parseS3Keys(xml).filter((u) =>
            /\.(jpe?g|png|gif|webp)$/i.test(u)
          );
          if (keys.length > 0) setImages(keys);
        })
        .catch(() => {})
        .finally(() => setLoadingFolder(false));
    }
  }

  if (!session) return <main className="p-6 text-sm">Loading…</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-1 text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Gallery</h1>
      </header>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      {!open && (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {folders.map((f, i) => (
            <button
              key={`${f.folderName}-${i}`}
              onClick={() => openFolder(f)}
              className="overflow-hidden rounded-lg border bg-white text-left shadow-sm"
            >
              {f.thumbNailImages?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.thumbNailImages[0]}
                  alt={f.folderName || "folder"}
                  className="h-32 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-32 w-full bg-zinc-100" />
              )}
              <p className="p-2 text-sm font-medium">{f.folderName}</p>
            </button>
          ))}
        </section>
      )}

      {open && (
        <section className="flex flex-col gap-2">
          <button
            className="self-start rounded border px-3 py-1 text-sm"
            onClick={() => {
              setOpen(null);
              setImages([]);
            }}
          >
            ← All folders ({open})
          </button>
          {loadingFolder && (
            <p className="text-sm text-zinc-500">Loading full album…</p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u}
                  alt=""
                  className="h-40 w-full rounded-lg border object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </section>
      )}
      <div className="pb-8" />
    </main>
  );
}
