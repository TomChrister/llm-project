// Direct calls to Voyage AI's embeddings API (Anthropic's recommended
// embeddings partner). Kept dependency-free — just fetch.

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-4-lite";
const BATCH = 128; // well under Voyage's 1000-input / 1M-token-per-request limit

type VoyageResponse = {
    data: { embedding: number[]; index: number }[];
};

/**
 * Embed a list of texts. Use inputType "document" for stored chunks and
 * "query" for a user's question — Voyage tunes the vector for each role.
 */
export async function embedTexts(
    texts: string[],
    inputType: "document" | "query",
): Promise<number[][]> {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) {
        throw new Error("VOYAGE_API_KEY is not set in .env");
    }

    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH) {
        const batch = texts.slice(i, i + BATCH);
        const res = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                input: batch,
                model: MODEL,
                input_type: inputType,
            }),
        });

        if (!res.ok) {
            throw new Error(
                `Voyage embeddings failed (${res.status}): ${await res.text()}`,
            );
        }

        const json = (await res.json()) as VoyageResponse;
        // The API may not preserve input order — sort by index to be safe.
        json.data
            .sort((a, b) => a.index - b.index)
            .forEach((d) => out.push(d.embedding));
    }
    return out;
}
