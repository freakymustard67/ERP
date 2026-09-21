import { resolveUpstream } from "@/lib/pc";

export const dynamic = "force-dynamic";

async function proxy(req: Request, ctx: RouteContext<"/api/pc/[...path]">) {
  const { path } = await ctx.params;
  const incoming = new URL(req.url);
  const rel = (path ?? []).join("/");
  const target = resolveUpstream(rel, incoming.search);

  // Don't forward browser-only headers; keep it minimal like the app.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.text();

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
    redirect: "follow",
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: Request, ctx: RouteContext<"/api/pc/[...path]">) {
  return proxy(req, ctx);
}

export async function POST(req: Request, ctx: RouteContext<"/api/pc/[...path]">) {
  return proxy(req, ctx);
}

export async function PUT(req: Request, ctx: RouteContext<"/api/pc/[...path]">) {
  return proxy(req, ctx);
}

export async function DELETE(
  req: Request,
  ctx: RouteContext<"/api/pc/[...path]">
) {
  return proxy(req, ctx);
}
