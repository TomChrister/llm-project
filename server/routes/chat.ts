import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { Hono } from "hono";
import type { JobPosting } from "../../shared/schema.js";

type ChatBody = { messages?: UIMessage[]; jobData?: JobPosting };

// The route is public, so bound how much one request can make us spend.
// 100 turns is far past any real cover-letter conversation.
const MAX_MESSAGES = 100;

function systemPrompt(jobData: JobPosting): string {
    return (
        `You are a job application assistant. You help the user write and refine ` +
        `a cover letter and application for the specific job below.\n\n` +
        `Guidelines:\n` +
        `- Write the cover letter in the same language as the job details ` +
        `below: an English posting gets an English letter, a Norwegian one ` +
        `gets a Norwegian (bokmål) letter. The app's interface is Norwegian ` +
        `and the user will often write to you in Norwegian — that is never a ` +
        `reason to change the letter's language.\n` +
        `- Write your own remarks around the letter in whatever language the ` +
        `user is writing to you in.\n` +
        `- Base your writing on the job details and anything the user tells you ` +
        `about themselves. Do not invent specific experience the user hasn't ` +
        `mentioned — where you need a detail you don't have, use a clear ` +
        `bracketed placeholder in the letter's language, e.g. ` +
        `[ditt relevante prosjekt] or [your relevant project].\n` +
        `- When asked to draft, produce a complete, well-structured cover letter ` +
        `tailored to the role's required skills and responsibilities.\n` +
        `- When asked to adjust (e.g. more formal, shorter, highlight a skill), ` +
        `revise the most recent draft and return the full updated letter.\n\n` +
        `--- JOB DETAILS (JSON) ---\n${JSON.stringify(jobData, null, 2)}\n--- END ---`
    );
}

export const chatRoute = new Hono();

// The client sends `jobData` with every request (via the chat transport body),
// so the extracted posting stays in the system context for the whole
// conversation — not just the first turn.
chatRoute.post("/", async (c) => {
    let body: ChatBody;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Ugyldig forespørsel." }, 400);
    }
    const { messages, jobData } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
        return c.json({ error: "Ugyldig forespørsel." }, 400);
    }
    if (messages.length > MAX_MESSAGES) {
        return c.json({ error: "Samtalen er for lang. Start en ny." }, 413);
    }
    // The app always sends the job; a request without one isn't from it.
    if (!jobData) {
        return c.json({ error: "Ugyldig forespørsel." }, 400);
    }

    const result = streamText({
        // Reads ANTHROPIC_API_KEY from .env. Swap to anthropic("claude-opus-5")
        // for Anthropic's most capable model at higher cost/latency.
        model: anthropic("claude-sonnet-5"),
        system: systemPrompt(jobData),
        messages: await convertToModelMessages(messages),
        maxOutputTokens: 2_000,
    });

    return result.toUIMessageStreamResponse();
});
