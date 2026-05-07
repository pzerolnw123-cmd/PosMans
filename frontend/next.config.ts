import type { NextConfig } from "next";
import path from "node:path";

const isDev = process.env.NODE_ENV !== "production";
const imageRemoteOrigins = [
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL,
  process.env.R2_PUBLIC_BASE_URL,
  process.env.NEXT_PUBLIC_IMAGE_REMOTE_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => String(value).split(","))
  .map((value) => value.trim())
  .filter(Boolean);

const imageRemotePatterns = imageRemoteOrigins.flatMap((origin) => {
  try {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol)) {
      return [];
    }

    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port,
        pathname: "/**",
      },
    ];
  } catch {
    return [];
  }
});

const cspSourceFromOrigin = (origin: string | null | undefined) => {
  if (!origin) {
    return null;
  }

  try {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
};

const uniqueSources = (sources: Array<string | null | undefined>) => Array.from(new Set(sources.filter(Boolean)));
const isLocalHttpUrl = (url: URL) => url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

const backendSource = cspSourceFromOrigin(process.env.BACKEND_URL || "http://localhost:4000");
const imageSources = uniqueSources(imageRemoteOrigins.map(cspSourceFromOrigin));
const uploadSources = uniqueSources([
  process.env.R2_ENDPOINT,
  process.env.NEXT_PUBLIC_R2_ENDPOINT,
  process.env.R2_PUBLIC_BASE_URL,
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL,
  isDev ? "https://*.r2.cloudflarestorage.com" : null,
].map(cspSourceFromOrigin));
const connectSources = uniqueSources(["'self'", backendSource, ...uploadSources, ...(isDev ? ["ws:", "wss:"] : [])]);

if (!isDev) {
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    const parsedBackendUrl = new URL(backendUrl);
    if (parsedBackendUrl.protocol !== "https:" && !isLocalHttpUrl(parsedBackendUrl)) {
      throw new Error("BACKEND_URL must use HTTPS in production");
    }
  }

  const insecureImageOrigin = imageRemoteOrigins.find((origin) => {
    try {
      const parsedOrigin = new URL(origin);
      return parsedOrigin.protocol !== "https:" && !isLocalHttpUrl(parsedOrigin);
    } catch {
      return true;
    }
  });
  if (insecureImageOrigin) {
    throw new Error("Image remote origins must use HTTPS in production");
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${uniqueSources(["'self'", "data:", "blob:", ...imageSources]).join(" ")}`,
  "font-src 'self' data:",
  `connect-src ${connectSources.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "media-src 'self' data: blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  distDir: isDev ? ".next" : ".next-build",
  images: {
    remotePatterns: imageRemotePatterns,
  },
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
