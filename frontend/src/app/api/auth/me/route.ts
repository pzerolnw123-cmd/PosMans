import { backendResponse, proxyToBackend } from "@/lib/proxy";

export async function GET() {
  const response = await proxyToBackend("/api/auth/me");
  return backendResponse(response);
}
