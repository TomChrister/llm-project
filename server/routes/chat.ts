import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { Hono } from "hono";
import type { JobPosting } from "../../shared/schema";

type ChatBody = { messages: UIMessage[]; jobData?: JobPosting };

function systemPrompt(jobData: JobPosting | undefined): string {
    if (!jobData) {
        return "Du er en hjelpsom jobbsøknadsassistent. Svar alltid på norsk (bokmål).";
    }
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
    const { messages, jobData }: ChatBody = await c.req.json();

    const result = streamText({
        // Reads ANTHROPIC_API_KEY from .env. Swap to anthropic("claude-opus-5")
        // for Anthropic's most capable model at higher cost/latency.
        model: anthropic("claude-sonnet-5"),
        system: systemPrompt(jobData),
        messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
});
