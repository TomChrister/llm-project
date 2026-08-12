// Copies the pdf.js worker from the installed pdfjs-dist into public/, so the
// PDF viewer always serves a worker matching react-pdf's pdfjs-dist version.
// Runs automatically via the postinstall / predev / prebuild npm hooks.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

try {
    // Resolve the actual installed location (robust to hoisting/dedupe).
    const pkgJson = require.resolve("pdfjs-dist/package.json");
    const src = join(dirname(pkgJson), "build", "pdf.worker.min.mjs");
    const destDir = join(process.cwd(), "public");
    mkdirSync(destDir, { recursive: true });
    copyFileSync(src, join(destDir, "pdf.worker.min.mjs"));
    console.log("Copied pdf.js worker → public/pdf.worker.min.mjs");
} catch (err) {
    // Don't fail `npm install` over this — predev/prebuild will surface it.
    console.warn("Could not copy pdf.js worker:", err.message);
}
