export type ClientErrorReport = {
  source: "app-error-boundary" | "network-error-recovery";
  message: string;
  digest?: string;
  recoverable?: boolean;
};

export function buildClientErrorReport(
  source: ClientErrorReport["source"],
  error: unknown,
  options: Pick<ClientErrorReport, "recoverable"> = {},
): ClientErrorReport {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown client error";
  const digest = error && typeof error === "object" && "digest" in error && typeof error.digest === "string" ? error.digest : undefined;

  return {
    source,
    message,
    digest,
    ...options,
  };
}

export function reportClientError(report: ClientErrorReport) {
  const endpoint = process.env.NEXT_PUBLIC_CLIENT_ERROR_ENDPOINT;
  if (!endpoint) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[client-error]", report);
    }
    return;
  }

  const body = JSON.stringify(report);
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
