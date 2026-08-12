// Chunking + an in-memory vector index for retrieval-augmented generation.
//
// NOTE: the index lives in the Node process (a globalThis singleton so it
// survives dev hot-reloads). It is per-process and lost on restart — fine for
// a demo. Production would use a persistent vector store (pgvector, Pinecone…).

export type Chunk = { text: string; pageHint: string };
type StoredChunk = Chunk & { embedding: number[] };
type StoredDoc = { filename: string; chunks: StoredChunk[] };

const globalForRag = globalThis as unknown as {
    __ragStore?: Map<string, StoredDoc>;
};
const store: Map<string, StoredDoc> = (globalForRag.__ragStore ??= new Map());

// pdf-parse emits a "-- N of M --" marker AFTER each page's text, so the text
// preceding a marker belongs to that page.
const PAGE_MARKER = /-- (\d+) of \d+ --/g;
const TARGET = 1000; // chars per chunk
const OVERLAP = 150; // chars shared between adjacent chunks

export function chunkDocument(fullText: string): Chunk[] {
    const segments: { page: number | null; text: string }[] = [];
    const re = new RegExp(PAGE_MARKER);
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(fullText)) !== null) {
        const seg = fullText.slice(lastIndex, m.index);
        if (seg.trim()) segments.push({ page: parseInt(m[1], 10), text: seg });
        lastIndex = re.lastIndex;
    }
    const tail = fullText.slice(lastIndex);
    if (tail.trim()) segments.push({ page: null, text: tail });
    // No page markers at all — treat the whole document as one segment.
    if (segments.length === 0 && fullText.trim()) {
        segments.push({ page: null, text: fullText });
    }

    const chunks: Chunk[] = [];
    for (const seg of segments) {
        const pageHint = seg.page ? `p. ${seg.page}` : "unknown";
        const text = seg.text.trim();
        if (text.length <= TARGET) {
            chunks.push({ text, pageHint });
            continue;
        }
        // Chunk within a page (never across) so pageHint stays accurate.
        let start = 0;
        while (start < text.length) {
            const end = Math.min(start + TARGET, text.length);
            const slice = text.slice(start, end).trim();
            if (slice) chunks.push({ text: slice, pageHint });
            if (end === text.length) break;
            start = end - OVERLAP;
        }
    }
    return chunks.filter((c) => c.text.length > 0);
}

export function putDocument(
    docId: string,
    filename: string,
    chunks: StoredChunk[],
): void {
    store.set(docId, { filename, chunks });
}

export function hasDocument(docId: string): boolean {
    return store.has(docId);
}

function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Return the k chunks most similar to the query embedding. */
export function retrieve(
    docId: string,
    queryEmbedding: number[],
    k = 5,
): Chunk[] {
    const doc = store.get(docId);
    if (!doc) return [];
    return doc.chunks
        .map((c) => ({ c, score: cosineSimilarity(c.embedding, queryEmbedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map(({ c }) => ({ text: c.text, pageHint: c.pageHint }));
}
