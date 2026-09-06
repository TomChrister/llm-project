// Runs the API as a standalone Node process — local development, and the
// Dockerfile for anyone self-hosting. On Vercel the same app is served by
// api/[...route].ts instead, and this file is never loaded.
//
// Loads ANTHROPIC_API_KEY (and the optional SCRAPE_* settings) from .env.
// Next.js used to do this implicitly; a plain Node process does not. Vercel
// injects its own environment, so the function entrypoint skips this.
import "dotenv/config";

import { serve } from "@hono/node-server";
import { app } from "./app.js";

// The host injects PORT; 3001 is the local default that vite.config.ts
// proxies to. Binding 0.0.0.0 rather than loopback is what makes the
// process reachable from outside a container.
const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
    console.log(`API-server kjører på http://localhost:${info.port}`);
});
