// Server-side fetching of a job posting from a URL.
//
// A single strategy never covers the web: server-rendered pages need
// Readability, SEO-conscious boards publish JSON-LD, and the ones built as
// pure JavaScript apps hand a crawler nothing but an empty <div>. So this is a
// chain of strategies, tried cheapest-and-cleanest first, where each one is
// allowed to come up empty:
//
//   1. ATS adapter    — a known board's public JSON API (see scrape-adapters)
//   2. JSON-LD        — schema.org JobPosting embedded in the page
//   3. Readability    — the algorithm behind Firefox Reader View
//   4. Hydration JSON — the payload a client-rendered page hydrates from
//   5. Renderer       — an external service that executes the page's JS,
//                       only if SCRAPE_RENDER_ENDPOINT is configured
//
// Steps 1-4 are free and cover the large majority of postings. Step 5 is the
// only universal answer to a JavaScript-only page, and it costs money or a
// dependency, so it is opt-in. When everything fails we say plainly that the
// page needs JavaScript and point the user at the paste-the-text path, which
// always works.
//
// Uses linkedom rather than jsdom for the DOM Readability needs: it is a
// fraction of jsdom's size and dependency tree, which matters for a
// serverless function that is bundled and cold-started on demand.
import { matchAdapter } from "./scrape-adapters.js";
import { extractFromHtml, looksClientRendered } from "./scrape-extractors.js";
import { normalizeWhitespace, sufficient } from "./scrape-text.js";
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
// A renderer has to load and run the page, so it needs a lot longer than a
// plain fetch. Still well inside the route's maxDuration of 60s.
const RENDER_TIMEOUT_MS = 25_000;
const MAX_HTML_BYTES = 3_000_000; // don't try to parse enormous pages
const MAX_REDIRECTS = 5;

// A plausible browser UA. Several ATS platforms sit behind a WAF that serves a
// challenge page to anything self-identifying as a bot, which we would then
// dutifully fail to extract a posting from.
const USER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Basic SSRF guard: this endpoint fetches a user-supplied URL server-side, so
// refuse obvious internal/loopback targets, on the first URL and on every
// redirect. Not exhaustive (DNS can still point a public host at a private
// IP), but it blocks the easy cases for a demo.
function assertPublicHttpUrl(raw: string): URL {
    let url: URL;
    try {
        // A pasted address usually has no scheme; assume https rather than
        // rejecting it. The client normalizes too, but this route is also
        // reachable directly.
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

type FetchedBody = { body: string; contentType: string; url: string };

async function fetchBody(
    target: string,
    accept: string,
    timeoutMs: number,
    headers: Record<string, string> = {},
): Promise<FetchedBody> {
    // Redirects are followed by hand so every hop goes through the SSRF
    // guard — with redirect: "follow", a public page could 302 us to
    // 127.0.0.1 after the first check had already passed.
    const signal = AbortSignal.timeout(timeoutMs);
    const origin = new URL(target).origin;
    let current = target;
    let res: Response;
    for (let hop = 0; ; hop++) {
        // The caller's headers (the renderer's bearer token) are only for the
        // site they were meant for — fetch's own redirect handling drops them
        // on a cross-origin hop, so this loop must too.
        const sameOrigin = new URL(current).origin === origin;
        try {
            res = await fetch(current, {
                redirect: "manual",
                signal,
                headers: {
                    "User-Agent": USER_AGENT,
                    Accept: accept,
                    ...(sameOrigin ? headers : {}),
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
        const location = res.headers.get("location");
        if (res.status < 300 || res.status >= 400 || !location) break;
        if (hop >= MAX_REDIRECTS) {
            throw new ScrapeError("Siden videresendte for mange ganger.", 502);
        }
        current = assertPublicHttpUrl(new URL(location, current).href).href;
    }

    if (!res.ok) {
        throw new ScrapeError(
            `Siden returnerte en feil (HTTP ${res.status}).`,
            502,
        );
    }

    return {
        body: await readCapped(res),
        contentType: res.headers.get("content-type") ?? "",
        url: current,
    };
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

/** Step 1: a known ATS board's JSON API. Never fatal — we can still scrape. */
async function tryAdapter(url: URL): Promise<string | null> {
    const match = matchAdapter(url);
    if (!match) return null;

    try {
        const { body } = await fetchBody(
            match.apiUrl,
            "application/json",
            FETCH_TIMEOUT_MS,
        );
        return sufficient(match.adapter.parse(JSON.parse(body)));
    } catch (err) {
        // A moved/renamed API shouldn't break the URL entirely — fall through
        // to the generic extractors against the page itself.
        console.warn(`Scrape adapter ${match.adapter.name} failed`, err);
        return null;
    }
}

/**
 * Step 5: hand the URL to a service that runs the page's JavaScript and gives
 * us back the result. Opt-in via env so the app has no such dependency by
 * default:
 *
 *   SCRAPE_RENDER_ENDPOINT  URL template containing {url}, which is replaced
 *                           with the URL-encoded target. If the placeholder is
 *                           missing the target is appended instead, which is
 *                           the shape reader proxies use.
 *   SCRAPE_RENDER_TOKEN     optional bearer token for that service.
 *
 * The response may be HTML (headless-browser services) or already-extracted
 * text/markdown (reader proxies); both are handled.
 */
async function tryRenderer(url: URL): Promise<string | null> {
    const template = process.env.SCRAPE_RENDER_ENDPOINT;
    if (!template) return null;

    const endpoint = template.includes("{url}")
        ? template.replace("{url}", encodeURIComponent(url.href))
        : `${template}${url.href}`;
    const token = process.env.SCRAPE_RENDER_TOKEN;

    try {
        const rendered = await fetchBody(
            endpoint,
            "text/html,text/plain",
            RENDER_TIMEOUT_MS,
            token ? { Authorization: `Bearer ${token}` } : {},
        );
        if (rendered.contentType.includes("html")) {
            return sufficient(extractFromHtml(rendered.body, url.href));
        }
        return sufficient(normalizeWhitespace(rendered.body));
    } catch (err) {
        console.warn("Scrape renderer failed", err);
        return null;
    }
}

function noContentError(html: string): ScrapeError {
    if (looksClientRendered(html)) {
        return new ScrapeError(
            "Denne siden bygger innholdet med JavaScript i nettleseren, så " +
                "serveren vår ser en tom side. Kopier teksten fra annonsen og " +
                "lim den inn i stedet.",
            422,
        );
    }
    return new ScrapeError(
        "Fant ikke lesbart stillingsannonseinnhold på den siden.",
        422,
    );
}

/**
 * Fetch a URL and return its main readable text content.
 * Throws ScrapeError with an appropriate status for every expected failure.
 */
export async function fetchReadableText(rawUrl: string): Promise<string> {
    const url = assertPublicHttpUrl(rawUrl);

    const viaAdapter = await tryAdapter(url);
    if (viaAdapter) return viaAdapter;

    const page = await fetchBody(
        url.href,
        "text/html,application/xhtml+xml",
        FETCH_TIMEOUT_MS,
    );
    if (!page.contentType.includes("html")) {
        throw new ScrapeError(
            "Den URL-en er ikke en HTML-side — lim inn teksten i stedet.",
            415,
        );
    }

    const viaHtml = sufficient(extractFromHtml(page.body, page.url));
    if (viaHtml) return viaHtml;

    const viaRenderer = await tryRenderer(url);
    if (viaRenderer) return viaRenderer;

    throw noContentError(page.body);
}
