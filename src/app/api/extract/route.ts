import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { jobPostingSchema, NOT_A_JOB_TITLE } from "@shared/schema";
import { readJsonBody } from "@server/lib/body";
import { fetchReadableText, ScrapeError } from "@server/lib/scrape";

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
    `title '${NOT_A_JOB_TITLE}' with empty arrays.`;

// A slow page fetch plus a full generation does not fit in the platform's
// default time limit — the request would be cut off mid-stream.
export const maxDuration = 60;

const error = (message: string, status: number) =>
    Response.json({ error: message }, { status });

export async function POST(request: Request) {
    const body = await readJsonBody<ExtractBody>(request);
    if (body instanceof Response) return body;

    // The body comes from anyone, so check the type before calling .trim().
    const value = typeof body.value === "string" ? body.value.trim() : "";
    if (!value) {
        return error("Lim inn en stillingsannonse-URL eller teksten først.", 400);
    }

    // Resolve the posting text: fetch + strip a URL, or use the pasted text.
    let text: string;
    try {
        text = body.mode === "url" ? await fetchReadableText(value) : value;
    } catch (err) {
        if (err instanceof ScrapeError) {
            return error(err.message, err.status);
        }
        console.error("Extraction fetch error", err);
        return error("Klarte ikke å lese den stillingsannonsen.", 500);
    }

    if (body.mode === "text" && text.length < 50) {
        return error("Teksten er for kort til å ligne en stillingsannonse.", 400);
    }

    const result = streamObject({
        // Reads ANTHROPIC_API_KEY from .env. Swap to anthropic("claude-opus-5")
        // for Anthropic's most capable model at higher cost/latency.
        model: anthropic("claude-sonnet-5"),
        schema: jobPostingSchema,
        system: SYSTEM,
        prompt: `--- JOB POSTING ---\n${text.slice(0, MAX_TEXT_CHARS)}\n--- END ---`,
        maxOutputTokens: 2_000,
    });

    // toTextStreamResponse pairs with useObject on the client. A route handler
    // passes a returned Response through untouched, so the stream is not
    // buffered.
    return result.toTextStreamResponse();
}
