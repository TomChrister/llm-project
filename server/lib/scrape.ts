// Server-side fetching of a job posting from a URL, in two steps:
//
//   1. Readability — fetch the page and pull out its main text with the
//      algorithm behind Firefox Reader View. Free, and covers ordinary
//      server-rendered pages.
//   2. Jina Reader — if that finds nothing (typically a page that builds itself
//      with JavaScript in the browser), ask r.jina.ai, which runs the page in a
//      real browser and returns its text. Free with a rate limit; set
//      JINA_API_KEY for a higher one. Note that this sends the URL to Jina.
//
// When both come up empty the user is told to paste the text instead, which
// always works.
//
// Uses linkedom rather than jsdom for the DOM Readability needs: a fraction of
// jsdom's size, which matters for a serverless function that cold-starts.
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { normalizeUrlInput } from "../../shared/url.js";

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
// Jina loads and runs the page, so it needs longer than a plain fetch. Still
// well inside the route's maxDuration of 60s.
const JINA_TIMEOUT_MS = 25_000;
const MAX_HTML_BYTES = 3_000_000; // don't try to parse enormous pages
const MAX_REDIRECTS = 5;
// A JS-only page still yields some nav/cookie text, so demand enough text to
// be a real posting before accepting a result.
const MIN_TEXT_CHARS = 200;

// A plausible browser UA. Several job boards sit behind a WAF that serves a
// challenge page to anything self-identifying as a bot.
const USER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Basic SSRF guard: this endpoint fetches a user-supplied URL server-side, so
// refuse obvious internal/loopback targets, on the first URL and on every
// redirect. Not exhaustive (DNS can still point a public host at a private
// IP), but it blocks the easy cases.
function assertPublicHttpUrl(raw: string): URL {
    let url: URL;
    try {
        // A pasted address usually has no scheme; assume https.
        url = new URL(normalizeUrlInput(raw));
    } catch {
        throw new ScrapeError("Det ser ikke ut som en gyldig URL.", 400);
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new ScrapeError("Bare http:// og https://-URL-er støttes.", 400);
    }

    // IPv6 hostnames keep their brackets (`[::1]`); strip them to compare.
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const blocked =
        host === "localhost" ||
        host.endsWith(".local") ||
        host.endsWith(".internal") ||
        /^0\./.test(host) ||
        // IPv6 loopback/unspecified, unique-local (fc00::/7), link-local
        // (fe80::/10), and IPv4-mapped (::ffff:7f00:1 is 127.0.0.1).
        host === "::1" ||
        host === "::" ||
        /^f[cd][0-9a-f]{0,2}:/.test(host) ||
        /^fe[89ab][0-9a-f]?:/.test(host) ||
        host.startsWith("::ffff:") ||
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

/** Collapse runs of spaces and blank lines left over from the markup. */
function normalizeWhitespace(text: string): string {
    return text
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t\u00a0]+/g, " ")
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/** The cleaned text if it is long enough to be a real posting, else null. */
function sufficient(text: string | null | undefined): string | null {
    const cleaned = normalizeWhitespace(text ?? "");
    return cleaned.length >= MIN_TEXT_CHARS ? cleaned : null;
}

/**
 * Fetch a page's HTML. Redirects are followed by hand so every hop goes
 * through the SSRF guard — with redirect: "follow", a public page could 302
 * us to 127.0.0.1 after the first check had already passed.
 */
async function fetchPage(url: URL): Promise<{ html: string; url: string }> {
    const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    let current = url.href;
    let res: Response;
    for (let hop = 0; ; hop++) {
        try {
            res = await fetch(current, {
                redirect: "manual",
                signal,
                headers: {
                    "User-Agent": USER_AGENT,
                    Accept: "text/html,application/xhtml+xml",
                },
            });
        } catch (err) {
            const timedOut = err instanceof Error && err.name === "TimeoutError";
            throw new ScrapeError(
                timedOut
                    ? "Siden brukte for lang tid på å svare."
                    : "Klarte ikke å nå den siden.",
                timedOut ? 504 : 502,
            );
        }
        const location = res.headers.get("location");
        if (res.status < 300 || res.status >= 400 || !location) break;
        if (hop >= MAX_REDIRECTS) {
            throw new ScrapeError("Siden videresendte for mange ganger.", 502);
        }
        current = assertPublicHttpUrl(new URL(location, current).href).href;
    }

    if (!res.ok) {
        const gone = res.status === 404 || res.status === 410;
        throw new ScrapeError(`Siden returnerte en feil (HTTP ${res.status}).`, gone ? 422 : 502);
    }
    if (!(res.headers.get("content-type") ?? "").includes("html")) {
        await res.body?.cancel();
        throw new ScrapeError(
            "Den URL-en er ikke en HTML-side — lim inn teksten i stedet.",
            415,
        );
    }
    return { html: await readCapped(res), url: current };
}

/**
 * The body as text, refusing it once it passes MAX_HTML_BYTES. Read in chunks
 * and stopped early, because res.text() would buffer a never-ending response
 * whole before we got to look at its size.
 */
async function readCapped(res: Response): Promise<string> {
    const tooBig = () => new ScrapeError("Siden er for stor til å behandles.", 413);
    if (Number(res.headers.get("content-length")) > MAX_HTML_BYTES) {
        await res.body?.cancel();
        throw tooBig();
    }
    if (!res.body) return "";

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    let text = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_HTML_BYTES) {
            await reader.cancel();
            throw tooBig();
        }
        text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
}

/** Step 1: the page's main text via Readability, or null if too little. */
function fromReadability(html: string, baseUrl: string): string | null {
    const { document } = parseHTML(html, { location: { href: baseUrl } });
    return sufficient(new Readability(document).parse()?.textContent);
}

/**
 * Step 2: Jina Reader renders the page and returns its text. Jina is a fixed,
 * trusted host doing the fetch on its own servers, so the SSRF guard above
 * has already done its job on the user's URL. Never fatal: a rate limit or
 * outage just means we fall through to "paste the text".
 */
async function fromJina(url: URL): Promise<string | null> {
    const key = process.env.JINA_API_KEY;
    try {
        const res = await fetch(`https://r.jina.ai/${url.href}`, {
            signal: AbortSignal.timeout(JINA_TIMEOUT_MS),
            headers: {
                Accept: "text/plain",
                ...(key ? { Authorization: `Bearer ${key}` } : {}),
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return sufficient(await res.text());
    } catch (err) {
        console.warn("Jina Reader failed", err);
        return null;
    }
}

/**
 * Fetch a URL and return its main readable text content.
 * Throws ScrapeError with an appropriate status for every expected failure.
 */
export async function fetchReadableText(rawUrl: string): Promise<string> {
    const url = assertPublicHttpUrl(rawUrl);

    // A page that blocks us or errors (502) may still work through Jina, which
    // fetches from a real browser. Other failures are final: a 404/410 (the ad
    // is gone), a timeout (Jina would only add 25s to a 60s budget), a redirect
    // to a private address, a non-HTML file, a huge page.
    let pageError: ScrapeError | null = null;
    let text: string | null = null;
    try {
        const page = await fetchPage(url);
        text = fromReadability(page.html, page.url);
    } catch (err) {
        if (!(err instanceof ScrapeError && err.status === 502)) throw err;
        pageError = err;
    }

    text ??= await fromJina(url);
    if (text) return text;
    if (pageError) throw pageError;

    throw new ScrapeError(
        "Fant ikke lesbart stillingsannonseinnhold på den siden. Kopier " +
            "teksten fra annonsen og lim den inn i stedet.",
        422,
    );
}
