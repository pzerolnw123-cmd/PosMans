import { backendUrl } from "@/lib/api";
import { buildBackendHeaders } from "@/lib/proxy";

export async function GET(request: Request, { params }: { params: Promise<{ displayId: string }> }) {
  const { displayId } = await params;
  const url = new URL(request.url);
  const abortController = new AbortController();
  request.signal.addEventListener("abort", () => abortController.abort(), { once: true });

  let response: Response;
  try {
    response = await fetch(`${backendUrl}/api/customer-displays/${encodeURIComponent(displayId)}/events${url.search}`, {
      method: "GET",
      headers: buildBackendHeaders(request, { refererPath: "/display" }),
      cache: "no-store",
      signal: abortController.signal,
    });
  } catch {
    return new Response("event stream backend unavailable", {
      status: 502,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  const stream = response.body ? createSafeEventStream(response.body) : null;

  return new Response(stream, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "text/event-stream",
      "cache-control": response.headers.get("cache-control") || "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

function createSafeEventStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        controller.enqueue(value);
      } catch {
        controller.close();
      }
    },
    cancel() {
      return reader.cancel().catch(() => undefined);
    },
  });
}
