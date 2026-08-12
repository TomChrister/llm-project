import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { answerSchema } from "@/lib/schema";
import { hasDocument, retrieve } from "@/lib/rag";
import { embedTexts } from "@/lib/voyage";

export async function POST(req: Request) {
    const { docId, question }: { docId: string; question: string } =
        await req.json();

    if (!hasDocument(docId)) {
        // Index is in-memory and per-process, so it's lost on server restart.
        return Response.json(
            { error: "Document not found. Please re-upload the PDF." },
            { status: 404 },
        );
    }

    // Retrieve the passages most relevant to the question (RAG).
    const [queryEmbedding] = await embedTexts([question], "query");
    const chunks = retrieve(docId, queryEmbedding, 5);

    const context = chunks
        .map((c) => `--- EXCERPT (${c.pageHint}) ---\n${c.text}`)
        .join("\n\n");

    const system =
        `You answer questions about a document using ONLY the excerpts below, ` +
        `and you cite your sources. Each excerpt is labelled with its page. ` +
        `If the excerpts do not contain the answer, say so in "answer" and return ` +
        `an empty "citations" array. Every citation "quote" must be copied ` +
        `verbatim from an excerpt, and "pageHint" must be that excerpt's page label.` +
        `\n\n${context}`;

    const result = streamObject({
        // Reads ANTHROPIC_API_KEY from .env. Swap to anthropic("claude-opus-5")
        // for Anthropic's most capable model at higher cost/latency.
        model: anthropic("claude-sonnet-5"),
        schema: answerSchema,
        system,
        prompt: question,
    });

    return result.toTextStreamResponse();
}
