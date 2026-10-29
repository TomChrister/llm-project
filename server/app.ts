import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { extractRoute } from "./routes/extract.js";
import { chatRoute } from "./routes/chat.js";

// The routes carry their full /api prefix rather than being mounted under a
// basePath, so this same app serves both ways round without knowing which it
// is: behind the Node server in server/index.ts, and as a Vercel function in
// api/[...route].ts, which receives the original /api/... path.
export const app = new Hono();

// The routes are public and spend Anthropic credit, so cap what one request
// can send. 256 KB fits a long chat full of letter drafts, and the extract
// route only uses the first 30k characters anyway.
app.use(
    "/api/*",
    bodyLimit({
        maxSize: 256 * 1024,
        onError: (c) => c.json({ error: "Forespørselen er for stor." }, 413),
    }),
);

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/extract", extractRoute);
app.route("/api/chat", chatRoute);
