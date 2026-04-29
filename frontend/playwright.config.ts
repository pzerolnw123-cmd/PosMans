import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) {
      continue;
    }

    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const backendURL = process.env.PLAYWRIGHT_BACKEND_URL || "http://127.0.0.1:4000";
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1";
const smokeOnly = process.env.PLAYWRIGHT_SMOKE_ONLY === "1";
const hasOwnerCredentials =
  Boolean(process.env.E2E_OWNER_USERNAME) && Boolean(process.env.E2E_OWNER_PASSWORD) && Boolean(process.env.E2E_OWNER_PIN);
const frontendUrl = new URL(baseURL);
const frontendHost = ["127.0.0.1", "localhost"].includes(frontendUrl.hostname) ? frontendUrl.hostname : "127.0.0.1";
const frontendPort = /^\d+$/.test(frontendUrl.port) ? frontendUrl.port : "3000";
const backendUrl = new URL(backendURL);
const backendPort = /^\d+$/.test(backendUrl.port) ? backendUrl.port : "4000";
const frontendCommand =
  process.env.PLAYWRIGHT_FRONTEND_MODE === "start"
    ? `npm run start -- --hostname ${frontendHost} --port ${frontendPort}`
    : `npm run dev -- --hostname ${frontendHost} --port ${frontendPort}`;
const backendServer = {
  command: "npm --prefix ../backend run start",
  url: `${backendURL}/health`,
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || "test",
    PORT: backendPort,
    FRONTEND_URL: baseURL,
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://e2e:e2e@localhost:5432/posmans_e2e",
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL || "postgresql://e2e:e2e@localhost:5432/posmans_e2e",
    SESSION_SECRET: process.env.SESSION_SECRET || "e2e-smoke-session-secret-at-least-32-chars",
  },
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
};
const frontendServer = {
  command: frontendCommand,
  url: baseURL,
  env: {
    ...process.env,
    BACKEND_URL: backendURL,
  },
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: skipWebServer || (!hasOwnerCredentials && !smokeOnly)
    ? undefined
    : [backendServer, frontendServer],
});
