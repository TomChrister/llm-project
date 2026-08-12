import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export async function POST(req: Request) {
    const { messages, document }: { messages: UIMessage[]; document?: string } =
        await req.json();

    const system = document
        ? `You are an assistant that answers questions about an uploaded document. ` +
          `Answer only from the content of the document below. If the answer is not ` +
          `found in the document, say so clearly.\n\n--- DOCUMENT ---\n${document}\n--- END ---`
        : "You are a helpful assistant.";

    const result = streamText({
        // Reads ANTHROPIC_API_KEY from .env. Swap to anthropic("claude-opus-5")
        // for Anthropic's most capable model at higher cost/latency.
        model: anthropic("claude-sonnet-5"),
        system,
        messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
}
