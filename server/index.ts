// Loads ANTHROPIC_API_KEY (and the optional SCRAPE_* settings) from .env.
// Next.js used to do this implicitly; a plain Node process does not.
import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { extractRoute } from "./routes/extract";
import { chatRoute } from "./routes/chat";

// Unlike the old Next route handlers, this is a long-running process, so the
// `runtime` / `maxDuration` exports they carried have no equivalent here —
// nothing kills a request at 10 or 60 seconds.
const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/extract", extractRoute);
app.route("/api/chat", chatRoute);

// The host injects PORT; 3001 is the local default that vite.config.ts
// proxies to. Binding 0.0.0.0 rather than loopback is what makes the
// process reachable from outside a container.
const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
    console.log(`API-server kjører på http://localhost:${info.port}`);
});
