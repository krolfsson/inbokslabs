import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const nextConfig: NextConfig = {
  /* Trace files from repo root when dependencies live in the workspace root */
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
