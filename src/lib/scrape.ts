// Server-side fetching of a job posting from a URL. We pull the raw HTML,
// then use Readability (the algorithm behind Firefox Reader View) to strip
// nav/footer/ads/scripts and keep just the main article text, so the LLM gets
// clean signal instead of page chrome.
//
// Uses linkedom rather than jsdom for the DOM Readability needs: jsdom's
// dependency tree (html-encoding-sniffer, whatwg-url) pulls in an ESM-only
// package that breaks when Next.js externalizes jsdom for the serverless
// bundle on Vercel (raw require() of an ESM file). linkedom has none of that
// and is small enough to just bundle normally.
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

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
        throw new ScrapeError("Det ser ikke ut som en gyldig URL.", 400);
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new ScrapeError("Bare http:// og https://-URL-er støttes.", 400);
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
        throw new ScrapeError("Den URL-en peker til en privat adresse.", 400);
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
                ? "Siden brukte for lang tid på å svare."
                : "Klarte ikke å nå den siden.",
            502,
        );
    }

    if (!res.ok) {
        throw new ScrapeError(
            `Siden returnerte en feil (HTTP ${res.status}).`,
            502,
        );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
        throw new ScrapeError(
            "Den URL-en er ikke en HTML-side — lim inn teksten i stedet.",
            415,
        );
    }

    const html = await res.text();
    if (html.length > MAX_HTML_BYTES) {
        throw new ScrapeError("Siden er for stor til å behandles.", 413);
    }

    // Readability needs a DOM. Pass the final URL so relative links resolve.
    const { document } = parseHTML(html, {
        location: { href: res.url || url.href },
    });
    const article = new Readability(document).parse();
    const text = article?.textContent?.trim();

    if (!text || text.length < 50) {
        throw new ScrapeError(
            "Fant ikke lesbart stillingsannonseinnhold på den siden.",
            422,
        );
    }

    return text;
}
