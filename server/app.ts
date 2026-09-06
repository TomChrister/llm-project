import { Hono } from "hono";
import { extractRoute } from "./routes/extract.js";
import { chatRoute } from "./routes/chat.js";

// The routes carry their full /api prefix rather than being mounted under a
// basePath, so this same app serves both ways round without knowing which it
// is: behind the Node server in server/index.ts, and as a Vercel function in
// api/[...route].ts, which receives the original /api/... path.
export const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/extract", extractRoute);
app.route("/api/chat", chatRoute);
