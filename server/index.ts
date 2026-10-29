// Runs the API as a standalone Node process, which is what `npm run dev`
// starts. On Vercel the same app is served by api/[...route].ts instead, and
// this file is never loaded.
//
// Loads ANTHROPIC_API_KEY (and the optional SCRAPE_* settings) from .env.
// Vercel injects its own environment, so the function entrypoint skips this.
import "dotenv/config";

import { serve } from "@hono/node-server";
import { app } from "./app.js";

// PORT is honoured if the environment sets one; 3001 is the local default
// that vite.config.ts proxies to. Loopback only by default: this process
// spends your ANTHROPIC_API_KEY and has none of the deployed rate limit, so
// it must not be reachable from other machines on the network. Set
// HOST=0.0.0.0 where that is wanted, e.g. inside a container.
const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "127.0.0.1";

serve({ fetch: app.fetch, port, hostname }, (info) => {
    console.log(`API-server kjører på http://localhost:${info.port}`);
});
