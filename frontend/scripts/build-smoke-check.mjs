import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const requiredFiles = [
  ".next/BUILD_ID",
  ".next/app-path-routes-manifest.json",
  ".next/routes-manifest.json",
  ".next/required-server-files.json",
];
const requiredRoutes = [
  "/login",
  "/owner/[section]",
  "/api/auth/me/route",
  "/api/products/route",
  "/api/products/[productId]/route",
  "/api/sales/route",
  "/api/customer-displays/[displayId]/events/route",
];

const missingFiles = requiredFiles.filter((file) => !existsSync(path.join(root, file)));
if (missingFiles.length > 0) {
  console.error(`Build smoke failed. Missing build artifacts: ${missingFiles.join(", ")}`);
  process.exit(1);
}

const manifestPath = path.join(root, ".next", "app-path-routes-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const manifestValues = new Set(Object.values(manifest));
const missingRoutes = requiredRoutes.filter(
  (route) => !Object.prototype.hasOwnProperty.call(manifest, route) && !manifestValues.has(route.replace(/\/route$/, "")),
);
if (missingRoutes.length > 0) {
  console.error(`Build smoke failed. Missing routes: ${missingRoutes.join(", ")}`);
  process.exit(1);
}

console.log("Build smoke passed. Required artifacts and routes are present.");
