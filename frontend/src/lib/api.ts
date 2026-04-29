const rawBackendUrl = process.env.BACKEND_URL;

if (process.env.NODE_ENV === "production" && !rawBackendUrl) {
  throw new Error("BACKEND_URL must be configured in production");
}

const resolvedBackendUrl = rawBackendUrl || "http://localhost:4000";
const parsedBackendUrl = new URL(resolvedBackendUrl);
const isLocalBackendUrl =
  parsedBackendUrl.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsedBackendUrl.hostname);

if (process.env.NODE_ENV === "production" && parsedBackendUrl.protocol !== "https:" && !isLocalBackendUrl) {
  throw new Error("BACKEND_URL must use HTTPS in production");
}

export const backendUrl = parsedBackendUrl.origin;
