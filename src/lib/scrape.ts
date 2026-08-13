// Server-side fetching of a job posting from a URL. We pull the raw HTML,
// then use Readability (the algorithm behind Firefox Reader View) to strip
// nav/footer/ads/scripts and keep just the main article text, so the LLM gets
// clean signal instead of page chrome.
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

// Thrown for every expected failure so the route can map it to a friendly
// message + HTTP status instead of a generic 500.
export class ScrapeError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = "ScrapeError";
    }
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 3_000_000; // don't try to parse enormous pages

// Basic SSRF guard: this endpoint fetches a user-supplied URL server-side, so
// refuse obvious internal/loopback targets. Not exhaustive (DNS can still point
// a public host at a private IP), but it blocks the easy cases for a demo.
function assertPublicHttpUrl(raw: string): URL {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new ScrapeError("That doesn't look like a valid URL.", 400);
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new ScrapeError("Only http:// and https:// URLs are supported.", 400);
    }

    const host = url.hostname.toLowerCase();
    const blocked =
        host === "localhost" ||
        host.endsWith(".local") ||
        host.endsWith(".internal") ||
        host === "0.0.0.0" ||
        host === "::1" ||
        /^127\./.test(host) ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^169\.254\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (blocked) {
        throw new ScrapeError("That URL points to a private address.", 400);
    }

    return url;
}

/**
 * Fetch a URL and return its main readable text content.
 * Throws ScrapeError with an appropriate status for every expected failure.
 */
export async function fetchReadableText(rawUrl: string): Promise<string> {
    const url = assertPublicHttpUrl(rawUrl);

    let res: Response;
    try {
        res = await fetch(url, {
            redirect: "follow",
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            headers: {
                // Some sites serve a stripped page (or block) without a UA.
                "User-Agent":
                    "Mozilla/5.0 (compatible; JobApplicationAssistant/1.0)",
                Accept: "text/html,application/xhtml+xml",
            },
        });
    } catch (err) {
        const timedOut = err instanceof Error && err.name === "TimeoutError";
        throw new ScrapeError(
            timedOut
                ? "That page took too long to respond."
                : "Couldn't reach that page.",
            502,
        );
    }

    if (!res.ok) {
        throw new ScrapeError(
            `That page returned an error (HTTP ${res.status}).`,
            502,
        );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
        throw new ScrapeError(
            "That URL isn't an HTML page — paste the text instead.",
            415,
        );
    }

    const html = await res.text();
    if (html.length > MAX_HTML_BYTES) {
        throw new ScrapeError("That page is too large to process.", 413);
    }

    // Readability needs a DOM. Pass the final URL so relative links resolve.
    const dom = new JSDOM(html, { url: res.url || url.href });
    const article = new Readability(dom.window.document).parse();
    const text = article?.textContent?.trim();

    if (!text || text.length < 50) {
        throw new ScrapeError(
            "Couldn't find readable job posting content on that page.",
            422,
        );
    }

    return text;
}
