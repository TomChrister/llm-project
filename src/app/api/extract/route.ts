import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { jobPostingSchema } from "@/lib/schema";
import { fetchReadableText, ScrapeError } from "@/lib/scrape";

// Node.js runtime (the App Router default) — declaring it here makes that
// requirement explicit rather than implicit.
export const runtime = "nodejs";
// Vercel's default function timeout (10s on Hobby) can be shorter than a
// slow page fetch + full streamObject generation combined.
export const maxDuration = 60;

type ExtractBody = { mode?: "url" | "text"; value?: string };

// Keep the prompt (and token cost) bounded — job postings are short, so a
// generous cap still fits any real posting while ignoring page bloat.
const MAX_TEXT_CHARS = 30_000;

export async function POST(req: Request) {
    let body: ExtractBody;
    try {
        body = await req.json();
    } catch {
        return Response.json({ error: "Ugyldig forespørsel." }, { status: 400 });
    }

    const value = body.value?.trim();
    if (!value) {
        return Response.json(
            { error: "Lim inn en stillingsannonse-URL eller teksten først." },
            { status: 400 },
        );
    }

    // Resolve the posting text: fetch + strip a URL, or use the pasted text.
    let text: string;
    try {
        text = body.mode === "url" ? await fetchReadableText(value) : value;
    } catch (err) {
        if (err instanceof ScrapeError) {
            return Response.json({ error: err.message }, { status: err.status });
        }
        console.error("Extraction fetch error", err);
        return Response.json(
            { error: "Klarte ikke å lese den stillingsannonsen." },
            { status: 500 },
        );
    }

    if (body.mode === "text" && text.length < 50) {
        return Response.json(
            { error: "Teksten er for kort til å ligne en stillingsannonse." },
            { status: 400 },
        );
    }

    const posting = text.slice(0, MAX_TEXT_CHARS);

    const system =
        "You extract structured data from a job posting. Use ONLY information " +
        "present in the posting — never invent a company, location, or skill. " +
        "Omit optional fields you can't determine rather than guessing. Split " +
        "skills and responsibilities into concise individual items. Always write " +
        "every field's value in Norwegian (bokmål), translating from the " +
        "posting's original language if needed — never leave values in English " +
        "or another language. If the text is clearly not a job posting, return " +
        "the title 'Ikke en stillingsannonse' with empty arrays.";

    const result = streamObject({
        // Reads ANTHROPIC_API_KEY from .env. Swap to anthropic("claude-opus-5")
        // for Anthropic's most capable model at higher cost/latency.
        model: anthropic("claude-sonnet-5"),
        schema: jobPostingSchema,
        system,
        prompt: `--- JOB POSTING ---\n${posting}\n--- END ---`,
    });

    // toTextStreamResponse pairs with useObject on the client.
    return result.toTextStreamResponse();
}
