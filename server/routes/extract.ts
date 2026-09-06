import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { Hono } from "hono";
import { jobPostingSchema } from "../../shared/schema.js";
import { fetchReadableText, ScrapeError } from "../lib/scrape.js";

type ExtractBody = { mode?: "url" | "text"; value?: string };

// Keep the prompt (and token cost) bounded — job postings are short, so a
// generous cap still fits any real posting while ignoring page bloat.
const MAX_TEXT_CHARS = 30_000;

// The UI is Norwegian, but the postings people paste often aren't. The
// extracted values are quotes from the posting — a job title and a skill
// list read wrong once translated — so they follow the posting's own
// language rather than the app's.
const SYSTEM =
    "You extract structured data from a job posting. Use ONLY information " +
    "present in the posting — never invent a company, location, or skill. " +
    "Omit optional fields you can't determine rather than guessing. Split " +
    "skills and responsibilities into concise individual items. Write every " +
    "field's value in the language the posting itself is written in: an " +
    "English posting stays English, a Norwegian one stays Norwegian " +
    "(bokmål). Keep the posting's own wording for titles and skill names " +
    "rather than translating them. If the posting's language is unclear, " +
    "use Norwegian. If the text is clearly not a job posting, return the " +
    "title 'Ikke en stillingsannonse' with empty arrays.";

export const extractRoute = new Hono();

extractRoute.post("/", async (c) => {
    let body: ExtractBody;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Ugyldig forespørsel." }, 400);
    }

    const value = body.value?.trim();
    if (!value) {
        return c.json(
            { error: "Lim inn en stillingsannonse-URL eller teksten først." },
            400,
        );
    }

    // Resolve the posting text: fetch + strip a URL, or use the pasted text.
    let text: string;
    try {
        text = body.mode === "url" ? await fetchReadableText(value) : value;
    } catch (err) {
        if (err instanceof ScrapeError) {
            return c.json({ error: err.message }, err.status as 400);
        }
        console.error("Extraction fetch error", err);
        return c.json({ error: "Klarte ikke å lese den stillingsannonsen." }, 500);
    }

    if (body.mode === "text" && text.length < 50) {
        return c.json(
            { error: "Teksten er for kort til å ligne en stillingsannonse." },
            400,
        );
    }

    const result = streamObject({
        // Reads ANTHROPIC_API_KEY from .env. Swap to anthropic("claude-opus-5")
        // for Anthropic's most capable model at higher cost/latency.
        model: anthropic("claude-sonnet-5"),
        schema: jobPostingSchema,
        system: SYSTEM,
        prompt: `--- JOB POSTING ---\n${text.slice(0, MAX_TEXT_CHARS)}\n--- END ---`,
    });

    // toTextStreamResponse pairs with useObject on the client. Hono passes a
    // returned Response through untouched, so the stream is not buffered.
    return result.toTextStreamResponse();
});
