import { backendUrl } from "@/lib/api";
import { buildBackendHeaders } from "@/lib/proxy";

export async function GET(request: Request, { params }: { params: Promise<{ displayId: string }> }) {
  const { displayId } = await params;
  const url = new URL(request.url);
  const response = await fetch(`${backendUrl}/api/customer-displays/${encodeURIComponent(displayId)}/events${url.search}`, {
    method: "GET",
    headers: buildBackendHeaders(request, { refererPath: "/display" }),
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "text/event-stream",
      "cache-control": response.headers.get("cache-control") || "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
