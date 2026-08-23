// Shared text helpers for the scraper. Kept separate from the extractors so
// the ATS adapters can reuse them without importing Readability.
import { parseHTML } from "linkedom";

/**
 * Minimum characters an extraction must yield before we accept it as a real
 * posting. A JS-only page still hands us a shell full of nav/cookie text, so
 * the old 50-char floor let empty pages through; a real posting clears 200
 * without trying.
 */
export const MIN_TEXT_CHARS = 200;

export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Walk a path of keys through parsed JSON, returning undefined on any miss. */
export function get(value: unknown, path: readonly string[]): unknown {
    let current = value;
    for (const key of path) {
        if (!isObject(current)) return undefined;
        current = current[key];
    }
    return current;
}

export function normalizeWhitespace(text: string): string {
    return text
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t\u00a0]+/g, " ")
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * True when a string is escaped markup (`&lt;p&gt;`) rather than markup.
 * Greenhouse's API returns descriptions this way, and stripping tags from it
 * without decoding first leaves the reader staring at literal angle brackets.
 */
function looksEntityEncoded(html: string): boolean {
    return /&lt;\/?[a-z]/i.test(html) && !/<[a-z]/i.test(html);
}

// linkedom only populates document.body when it parses a whole document, so
// every fragment gets wrapped before it is handed over.
function parseFragment(fragment: string) {
    const { document } = parseHTML(
        `<!doctype html><html><body>${fragment}</body></html>`,
    );
    return document.body?.textContent ?? "";
}

function decodeEntities(text: string): string {
    return parseFragment(text) || text;
}

/**
 * Flatten an HTML fragment to readable plain text. Block-level closing tags
 * become newlines first — without that, every bullet in a requirements list
 * runs into the next one and the LLM sees a single unreadable sentence.
 */
export function htmlToText(html: string): string {
    const source = looksEntityEncoded(html) ? decodeEntities(html) : html;
    const spaced = source
        .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
        .replace(/<\s*(br|hr)\s*\/?>/gi, "\n")
        .replace(
            /<\/\s*(p|div|li|tr|ul|ol|table|section|article|h[1-6])\s*>/gi,
            "\n",
        );
    return normalizeWhitespace(parseFragment(spaced));
}

/**
 * Reduce a JSON-LD-ish value to a display string. Handles the shapes these
 * feeds actually use: a bare string, a list, `{ name }`, or a nested
 * `{ address: { addressLocality, ... } }`.
 */
export function plainText(value: unknown, depth = 0): string | null {
    if (depth > 4) return null;
    if (typeof value === "string") return value.trim() || null;
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) {
        const parts = value
            .map((item) => plainText(item, depth + 1))
            .filter((part): part is string => Boolean(part));
        return parts.length ? [...new Set(parts)].join(", ") : null;
    }
    if (!isObject(value)) return null;

    const named = value["name"] ?? value["legalName"] ?? value["label"];
    if (typeof named === "string" && named.trim()) return named.trim();

    const address = isObject(value["address"]) ? value["address"] : value;
    const parts = ["addressLocality", "addressRegion", "addressCountry", "city", "state"]
        .map((key) => plainText(address[key], depth + 1))
        .filter((part): part is string => Boolean(part));
    return parts.length ? [...new Set(parts)].join(", ") : null;
}

/**
 * Assemble labelled metadata plus a description body into the plain text we
 * hand the model. The labels are prompt-internal and never shown to anyone, so
 * they stay English: the extraction prompt asks the model to answer in the
 * posting's own language, and Norwegian scaffolding around an English ad only
 * muddies that signal.
 */
export function joinFields(
    fields: ReadonlyArray<readonly [string, unknown]>,
    description?: unknown,
): string {
    const lines: string[] = [];
    for (const [label, value] of fields) {
        const text = plainText(value);
        if (text) lines.push(`${label}: ${text}`);
    }
    if (typeof description === "string" && description.trim()) {
        lines.push("", htmlToText(description));
    }
    return normalizeWhitespace(lines.join("\n"));
}
