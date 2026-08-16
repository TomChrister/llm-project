import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { JobPosting } from "@/lib/schema";

// Vercel's default function timeout (10s on Hobby) can be shorter than a
// full cover-letter generation, especially on longer revisions.
export const maxDuration = 60;

// The client sends `jobData` with every request (via the chat transport body),
// so the extracted posting stays in the system context for the whole
// conversation — not just the first turn.
export async function POST(req: Request) {
    const { messages, jobData }: { messages: UIMessage[]; jobData?: JobPosting } =
        await req.json();

    const system = jobData
        ? `You are a job application assistant. You help the user write and refine ` +
          `a cover letter and application for the specific job below.\n\n` +
          `Guidelines:\n` +
          `- Always write in Norwegian (bokmål), regardless of what language the ` +
          `job details or the user's messages are in.\n` +
          `- Base your writing on the job details and anything the user tells you ` +
          `about themselves. Do not invent specific experience the user hasn't ` +
          `mentioned — where you need a detail you don't have, use a clear ` +
          `placeholder like [ditt relevante prosjekt].\n` +
          `- When asked to draft, produce a complete, well-structured cover letter ` +
          `tailored to the role's required skills and responsibilities.\n` +
          `- When asked to adjust (e.g. more formal, shorter, highlight a skill), ` +
          `revise the most recent draft and return the full updated letter.\n\n` +
          `--- JOB DETAILS (JSON) ---\n${JSON.stringify(jobData, null, 2)}\n--- END ---`
        : "Du er en hjelpsom jobbsøknadsassistent. Svar alltid på norsk (bokmål).";

    const result = streamText({
        // Reads ANTHROPIC_API_KEY from .env. Swap to anthropic("claude-opus-5")
        // for Anthropic's most capable model at higher cost/latency.
        model: anthropic("claude-sonnet-5"),
        system,
        messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
}
