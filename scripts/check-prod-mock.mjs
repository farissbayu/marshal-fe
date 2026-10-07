#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [".env.production", ".env.production.local"];
let failed = false;

for (const file of files) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  if (/^\s*VITE_MOCK_MODE\s*=\s*true\s*$/im.test(text)) {
    console.error(`✖ ${file}: VITE_MOCK_MODE=true tidak diizinkan untuk production build.`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("✓ Production env: mock mode dinonaktifkan.");
