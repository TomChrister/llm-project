// Generic content extractors. Each one takes the raw HTML of a page and
// returns readable posting text, or null if it found nothing usable, so the
// orchestrator in ./scrape.ts can just try them in order.
//
// Each extractor re-parses the HTML instead of sharing one document, because
// Readability mutates the DOM it is handed — a shared document would be
// stripped bare before the next extractor got to look at it.
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import {
    MIN_TEXT_CHARS,
    isObject,
    joinFields,
    normalizeWhitespace,
} from "@/lib/scrape-text";

function sufficient(text: string | null | undefined): string | null {
    const trimmed = text?.trim();
    return trimmed && trimmed.length >= MIN_TEXT_CHARS ? trimmed : null;
}

// --- 1. schema.org JobPosting in JSON-LD -----------------------------------
//
// Anything that wants to appear in Google Jobs has to publish this, so it
// covers a large slice of the market and gives us clean structured fields.

function typeIncludes(value: unknown, wanted: string): boolean {
    if (typeof value === "string") return value.toLowerCase() === wanted;
    if (Array.isArray(value)) {
        return value.some(
            (item) => typeof item === "string" && item.toLowerCase() === wanted,
        );
    }
    return false;
}

/** Depth-first search for a JobPosting node — it is often nested in @graph. */
function findJobPosting(
    node: unknown,
    depth = 0,
): Record<string, unknown> | null {
    if (depth > 6) return null;
    if (Array.isArray(node)) {
        for (const item of node) {
            const hit = findJobPosting(item, depth + 1);
            if (hit) return hit;
        }
        return null;
    }
    if (!isObject(node)) return null;
    if (typeIncludes(node["@type"], "jobposting")) return node;
    for (const value of Object.values(node)) {
        const hit = findJobPosting(value, depth + 1);
        if (hit) return hit;
    }
    return null;
}

export function fromJsonLd(html: string): string | null {
    const { document } = parseHTML(html);
    const blocks = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
    );
    for (const block of blocks) {
        let data: unknown;
        try {
            data = JSON.parse(block.textContent ?? "");
        } catch {
            continue; // malformed JSON-LD is common; skip rather than fail
        }
        const job = findJobPosting(data);
        if (!job) continue;
        const text = joinFields(
            [
                ["Title", job["title"]],
                ["Company", job["hiringOrganization"]],
                ["Location", job["jobLocation"] ?? job["applicantLocationRequirements"]],
                ["Employment type", job["employmentType"]],
                ["Posted", job["datePosted"]],
                ["Application deadline", job["validThrough"]],
            ],
            job["description"],
        );
        const usable = sufficient(text);
        if (usable) return usable;
    }
    return null;
}

// --- 2. Readability --------------------------------------------------------
//
// The general case for any server-rendered page.

export function fromReadability(html: string, baseUrl: string): string | null {
    const { document } = parseHTML(html, { location: { href: baseUrl } });
    const article = new Readability(document).parse();
    return sufficient(normalizeWhitespace(article?.textContent ?? ""));
}

// --- 3. Hydration payloads -------------------------------------------------
//
// Client-rendered pages usually still ship their data in the HTML, as a JSON
// blob the framework hydrates from (__NEXT_DATA__, __NUXT__, an
// application/json script). This digs the description out of one.
//
// It is a heuristic, so it runs last and holds out for a long string under a
// description-ish key — short matches are far more likely to be a cookie
// banner than a posting.

const DESCRIPTION_KEY =
    /^(description|descriptionHtml|descriptionPlain|jobDescription|jobDescriptionText|content|body|text)$/i;
const TITLE_KEY = /^(title|jobTitle|jobOpeningName|name|headline)$/i;
const MIN_EMBEDDED_CHARS = 400;

/**
 * Read one balanced {...} or [...] starting at `start`, skipping over braces
 * that appear inside string literals.
 */
function readBalanced(source: string, start: number): string | null {
    const open = source[start];
    const close = open === "{" ? "}" : open === "[" ? "]" : null;
    if (!close) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < source.length; i++) {
        const char = source[i];
        if (inString) {
            if (escaped) escaped = false;
            else if (char === "\\") escaped = true;
            else if (char === '"') inString = false;
            continue;
        }
        if (char === '"') inString = true;
        else if (char === open) depth++;
        else if (char === close && --depth === 0) {
            return source.slice(start, i + 1);
        }
    }
    return null;
}

function collectJsonBlobs(html: string): unknown[] {
    const { document } = parseHTML(html);
    const blobs: unknown[] = [];

    for (const script of Array.from(document.querySelectorAll("script"))) {
        const type = (script.getAttribute("type") ?? "").toLowerCase();
        const source = script.textContent ?? "";
        if (!source.trim()) continue;

        const candidates: string[] = [];
        if (type.includes("json")) {
            candidates.push(source);
        } else {
            // window.__NUXT__ = {...} / __INITIAL_STATE__ = {...}
            const assignment = /(?:window\.)?(__[A-Z0-9_]+__)\s*=\s*(?=[{[])/g;
            for (const match of source.matchAll(assignment)) {
                const start = (match.index ?? 0) + match[0].length;
                const balanced = readBalanced(source, start);
                if (balanced) candidates.push(balanced);
            }
        }

        for (const candidate of candidates) {
            try {
                blobs.push(JSON.parse(candidate));
            } catch {
                // not JSON after all — ignore
            }
        }
    }
    return blobs;
}

type Candidate = { title: string | null; description: string };

function collectCandidates(node: unknown, found: Candidate[], depth = 0): void {
    if (depth > 8) return;
    if (Array.isArray(node)) {
        for (const item of node) collectCandidates(item, found, depth + 1);
        return;
    }
    if (!isObject(node)) return;

    for (const [childKey, value] of Object.entries(node)) {
        if (
            typeof value === "string" &&
            DESCRIPTION_KEY.test(childKey) &&
            value.length >= MIN_EMBEDDED_CHARS
        ) {
            // A sibling title on the same object is almost always the job's.
            const sibling = Object.entries(node).find(
                ([k, v]) => TITLE_KEY.test(k) && typeof v === "string" && v.length < 200,
            );
            found.push({
                title: sibling ? (sibling[1] as string) : null,
                description: value,
            });
        }
        collectCandidates(value, found, depth + 1);
    }
}

export function fromEmbeddedJson(html: string): string | null {
    const found: Candidate[] = [];
    for (const blob of collectJsonBlobs(html)) {
        collectCandidates(blob, found);
    }
    if (!found.length) return null;

    // Longest wins: on a job page the posting body is the biggest block of
    // prose the payload carries.
    const best = found.reduce((a, b) =>
        b.description.length > a.description.length ? b : a,
    );
    return sufficient(joinFields([["Title", best.title]], best.description));
}

// --- Chain -----------------------------------------------------------------

/** Run every generic extractor against one page, best-quality first. */
export function extractFromHtml(html: string, baseUrl: string): string | null {
    return (
        fromJsonLd(html) ??
        fromReadability(html, baseUrl) ??
        fromEmbeddedJson(html)
    );
}

/**
 * Heuristic: did we get a JavaScript app shell rather than a page? Used only
 * to pick a more honest error message — "we can't run JS" beats "no content
 * found" when the user can plainly see text in their browser.
 */
export function looksClientRendered(html: string): boolean {
    const scripts = (html.match(/<script\b/gi) ?? []).length;
    const visible = normalizeWhitespace(
        html
            .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
            .replace(/<[^>]*>/g, " "),
    );
    return scripts >= 3 && visible.length < 1000;
}
