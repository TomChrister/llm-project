import path from "node:path";
import { fileURLToPath } from "node:url";
// `vitest/config` re-exports Vite's defineConfig with the `test` block typed,
// so the app build and the test run share one config file.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(rootDir, "./src"),
            "@shared": path.resolve(rootDir, "./shared"),
        },
    },
    server: {
        // The Hono backend owns /api. Proxying it here means the browser only
        // ever talks to one origin, so no CORS handling is needed on either
        // side — in production the same is achieved by serving both from the
        // same host.
        proxy: {
            // 127.0.0.1, not localhost: the API binds 0.0.0.0 (IPv4 only, for
            // containers), while Node resolves "localhost" to ::1 first on
            // Windows. That mismatch makes every proxied call a 502.
            "/api": "http://127.0.0.1:3001",
        },
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./src/setupTests.ts",
    },
});
