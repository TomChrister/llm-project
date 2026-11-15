// The routes are public and spend Anthropic credit, so cap what one request
// can send. 256 KB fits a long chat full of letter drafts, and the extract
// route only uses the first 30k characters anyway.
const MAX_BODY_BYTES = 256 * 1024;

function error(message: string, status: number): Response {
    return Response.json({ error: message }, { status });
}

/**
 * Reads a JSON request body, refusing one over the size cap. Returns the
 * parsed object, or the error Response the route should send back.
 */
export async function readJsonBody<T extends object>(
    request: Request,
): Promise<T | Response> {
    const tooLarge = () => error("Forespørselen er for stor.", 413);
    if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
        return tooLarge();
    }

    // Content-Length can be missing or wrong, so count the bytes as they
    // arrive and stop reading once past the cap.
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = request.body?.getReader();
    while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
            await reader.cancel();
            return tooLarge();
        }
        chunks.push(value);
    }

    try {
        const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (typeof body === "object" && body !== null) return body as T;
    } catch {
        // Not JSON — same answer as JSON of the wrong shape.
    }
    return error("Ugyldig forespørsel.", 400);
}
