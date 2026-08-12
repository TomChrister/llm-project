import { z } from "zod";

// Shared between the /api/ask route (streamObject) and the DocumentQA component
// (useObject) so the streamed shape stays in sync on both ends.
export const answerSchema = z.object({
    answer: z
        .string()
        .describe("A concise answer to the question, based only on the document."),
    citations: z
        .array(
            z.object({
                quote: z
                    .string()
                    .describe("An exact quote copied verbatim from the document."),
                pageHint: z
                    .string()
                    .describe(
                        'Where the quote appears, e.g. "p. 2", derived from the ' +
                            '"-- N of M --" page markers in the document. Use "unknown" if unclear.',
                    ),
            }),
        )
        .describe(
            "Supporting quotes from the document. Empty if the answer is not found in the document.",
        ),
});

export type AnswerObject = z.infer<typeof answerSchema>;
