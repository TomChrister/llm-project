/**
 * Normalize a URL the way a person typed it into the shape `new URL()` and
 * `fetch()` need.
 *
 * People paste job links the way the address bar shows them, which usually
 * means no scheme: `www.finn.no/job/...`, or just `finn.no/job/...`. Assume
 * https for those rather than rejecting them — every job board we can reach
 * speaks it, and a scheme is not something the user should have to think about.
 *
 * Anything that already carries a `scheme://` prefix is left untouched, so a
 * deliberate `http://` stays http and a non-http scheme still reaches the
 * caller's own validation instead of being silently rewritten.
 */
export function normalizeUrlInput(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
    // Protocol-relative (`//host/path`) is still a URL, just missing a scheme.
    return `https://${trimmed.replace(/^\/+/, "")}`;
}
