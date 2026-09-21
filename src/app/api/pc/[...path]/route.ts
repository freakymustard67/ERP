import { resolveUpstream } from "@/lib/pc";

export const dynamic = "force-dynamic";

async function proxy(req: Request, ctx: RouteContext<"/api/pc/[...path]">) {
  const { path } = await ctx.params;
  const incoming = new URL(req.url);
  const rel = (path ?? []).join("/");
  const target = resolveUpstream(rel, incoming.search);

  // Forward the incoming content type (JSON or multipart for file uploads).
  const headers: Record<string, string> = {};
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
    redirect: "follow",
  });

  const buf = await upstream.arrayBuffer();
  const upstreamType =
    upstream.headers.get("content-type") || "application/json";
  return new Response(buf, {
    status: upstream.status,
    headers: { "Content-Type": upstreamType },
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
