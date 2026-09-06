import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrapeError, fetchReadableText } from "./scrape";
import { matchAdapter } from "./scrape-adapters";
import {
    fromEmbeddedJson,
    fromJsonLd,
    fromReadability,
    looksClientRendered,
} from "./scrape-extractors";
import { htmlToText } from "./scrape-text";

// Long enough to clear MIN_TEXT_CHARS (200) / MIN_EMBEDDED_CHARS (400).
const BODY = (
    "Vi søker en dyktig utvikler til teamet vårt i Oslo. Du vil jobbe med " +
    "TypeScript, React og Node, og ha ansvar for videreutvikling av " +
    "plattformen vår. Vi tilbyr konkurransedyktige betingelser, fleksibel " +
    "arbeidstid og gode muligheter for faglig utvikling i et hyggelig " +
    "arbeidsmiljø med dyktige kolleger som bryr seg om kvalitet og god kode."
).repeat(2);

function htmlPage(head: string, body = "<p>Hei</p>"): string {
    return `<!doctype html><html><head><title>Test</title>${head}</head><body>${body}</body></html>`;
}

function jsonLdScript(data: unknown): string {
    return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("htmlToText", () => {
    it("keeps list items on separate lines", () => {
        expect(htmlToText("<ul><li>Én</li><li>To</li></ul>")).toBe("Én\nTo");
    });

    it("decodes descriptions that arrive as escaped markup", () => {
        // Greenhouse's API returns its content field this way.
        expect(htmlToText("&lt;p&gt;Om oss&lt;/p&gt;&lt;p&gt;Vi søker&lt;/p&gt;")).toBe(
            "Om oss\nVi søker",
        );
    });

    it("drops script and style contents", () => {
        expect(htmlToText("<p>Tekst</p><script>var x = 1;</script>")).toBe("Tekst");
    });
});

describe("matchAdapter", () => {
    it.each([
        [
            "https://pexip.bamboohr.com/careers/635",
            "bamboohr",
            "https://pexip.bamboohr.com/careers/635/detail",
        ],
        [
            "https://job-boards.greenhouse.io/anthropic/jobs/4461450008",
            "greenhouse",
            "https://boards-api.greenhouse.io/v1/boards/anthropic/jobs/4461450008",
        ],
        [
            "https://jobs.lever.co/leverdemo/33538a2f-d27d-4a96-8f05-fa4b0e4d940e",
            "lever",
            "https://api.lever.co/v0/postings/leverdemo/33538a2f-d27d-4a96-8f05-fa4b0e4d940e",
        ],
    ])("maps %s to its API", (input, name, apiUrl) => {
        const match = matchAdapter(new URL(input));
        expect(match?.adapter.name).toBe(name);
        expect(match?.apiUrl).toBe(apiUrl);
    });

    it.each([
        "https://example.com/careers/635",
        "https://pexip.bamboohr.com/careers", // listing, not a posting
        "https://notbamboohr.com/careers/1",
    ])("ignores %s", (input) => {
        expect(matchAdapter(new URL(input))).toBeNull();
    });
});

describe("fromJsonLd", () => {
    it("finds a JobPosting nested inside @graph", () => {
        const html = htmlPage(
            jsonLdScript({
                "@context": "https://schema.org",
                "@graph": [
                    { "@type": "WebSite", name: "Karriere" },
                    {
                        "@type": "JobPosting",
                        title: "Frontendutvikler",
                        hiringOrganization: { "@type": "Organization", name: "Acme" },
                        jobLocation: {
                            "@type": "Place",
                            address: { addressLocality: "Oslo", addressCountry: "NO" },
                        },
                        description: `<p>${BODY}</p>`,
                    },
                ],
            }),
        );
        const text = fromJsonLd(html);
        expect(text).toContain("Title: Frontendutvikler");
        expect(text).toContain("Company: Acme");
        expect(text).toContain("Location: Oslo, NO");
        expect(text).toContain("dyktig utvikler");
    });

    it("skips malformed blocks instead of throwing", () => {
        const html = htmlPage(
            '<script type="application/ld+json">{ not json }</script>',
        );
        expect(fromJsonLd(html)).toBeNull();
    });

    it("returns null when the page has no JobPosting", () => {
        const html = htmlPage(jsonLdScript({ "@type": "Organization", name: "Acme" }));
        expect(fromJsonLd(html)).toBeNull();
    });
});

describe("fromReadability", () => {
    it("extracts the article body of a server-rendered page", () => {
        const html = htmlPage(
            "",
            `<nav>Meny Forside Kontakt</nav><article><h1>Utvikler</h1><p>${BODY}</p></article>`,
        );
        expect(fromReadability(html, "https://example.com/jobb")).toContain(
            "dyktig utvikler",
        );
    });

    it("returns null for a page with no readable body", () => {
        expect(fromReadability(htmlPage("", "<div id='root'></div>"), "https://x.test/"))
            .toBeNull();
    });
});

describe("fromEmbeddedJson", () => {
    it("digs the posting out of a hydration payload", () => {
        const html = htmlPage(
            "",
            `<div id="root"></div><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
                { props: { pageProps: { job: { title: "Backendutvikler", description: BODY } } } },
            )}</script>`,
        );
        const text = fromEmbeddedJson(html);
        expect(text).toContain("Title: Backendutvikler");
        expect(text).toContain("dyktig utvikler");
    });

    it("reads a global assignment with nested braces", () => {
        const html = htmlPage(
            "",
            `<script>window.__INITIAL_STATE__ = ${JSON.stringify({
                job: { nested: { a: "}" }, description: BODY },
            })};</script>`,
        );
        expect(fromEmbeddedJson(html)).toContain("dyktig utvikler");
    });

    it("ignores short description-like strings", () => {
        const html = htmlPage(
            "",
            `<script type="application/json">${JSON.stringify({
                cookieBanner: { description: "Vi bruker informasjonskapsler." },
            })}</script>`,
        );
        expect(fromEmbeddedJson(html)).toBeNull();
    });
});

describe("looksClientRendered", () => {
    it("recognises an app shell", () => {
        const shell = htmlPage(
            "",
            '<div id="root"></div><script src="a.js"></script><script src="b.js"></script><script src="c.js"></script>',
        );
        expect(looksClientRendered(shell)).toBe(true);
    });

    it("does not flag a page that has real text", () => {
        const page = htmlPage(
            "",
            `<article><p>${BODY.repeat(2)}</p></article><script src="a.js"></script><script src="b.js"></script><script src="c.js"></script>`,
        );
        expect(looksClientRendered(page)).toBe(false);
    });
});

describe("fetchReadableText", () => {
    function stubFetch(handler: (url: string) => Response) {
        const spy = vi.fn((input: RequestInfo | URL) =>
            Promise.resolve(handler(String(input))),
        );
        vi.stubGlobal("fetch", spy);
        return spy;
    }

    function json(body: unknown): Response {
        return new Response(JSON.stringify(body), {
            headers: { "content-type": "application/json" },
        });
    }

    function html(body: string): Response {
        return new Response(body, { headers: { "content-type": "text/html" } });
    }

    it("rejects private addresses before fetching", async () => {
        const spy = stubFetch(() => html("<p>nope</p>"));
        await expect(fetchReadableText("http://localhost/jobb")).rejects.toMatchObject({
            status: 400,
        });
        expect(spy).not.toHaveBeenCalled();
    });

    it("assumes https for an address pasted without a scheme", async () => {
        const spy = stubFetch(() => html("<p>nope</p>"));

        // Only the fetched URL matters here — extraction is covered elsewhere.
        await fetchReadableText("www.example.com/jobb").catch(() => {});

        expect(String(spy.mock.calls[0][0])).toBe("https://www.example.com/jobb");
    });

    it("still rejects a private address pasted without a scheme", async () => {
        const spy = stubFetch(() => html("<p>nope</p>"));
        await expect(fetchReadableText("localhost:3000/jobb")).rejects.toMatchObject({
            status: 400,
        });
        expect(spy).not.toHaveBeenCalled();
    });

    it("uses the BambooHR API instead of the JavaScript-only page", async () => {
        const spy = stubFetch(() =>
            json({
                result: {
                    jobOpening: {
                        jobOpeningName: "Software Engineer",
                        departmentLabel: "Eng",
                        location: { city: "Oslo", addressCountry: "Norway" },
                        description: `<p>${BODY}</p>`,
                    },
                },
            }),
        );

        const text = await fetchReadableText("https://pexip.bamboohr.com/careers/635");

        expect(spy).toHaveBeenCalledTimes(1);
        expect(String(spy.mock.calls[0][0])).toBe(
            "https://pexip.bamboohr.com/careers/635/detail",
        );
        expect(text).toContain("Title: Software Engineer");
        expect(text).toContain("dyktig utvikler");
    });

    it("falls back to scraping the page when the adapter API fails", async () => {
        const spy = stubFetch((url) =>
            url.endsWith("/detail")
                ? new Response("gone", { status: 404 })
                : html(htmlPage("", `<article><p>${BODY}</p></article>`)),
        );
        vi.spyOn(console, "warn").mockImplementation(() => {});

        const text = await fetchReadableText("https://pexip.bamboohr.com/careers/635");

        expect(spy).toHaveBeenCalledTimes(2);
        expect(text).toContain("dyktig utvikler");
    });

    it("explains that the page needs JavaScript when nothing can be extracted", async () => {
        stubFetch(() =>
            html(
                htmlPage(
                    "",
                    '<div id="root"></div><script src="a.js"></script><script src="b.js"></script><script src="c.js"></script>',
                ),
            ),
        );

        const error = await fetchReadableText("https://example.com/jobb").catch((e) => e);
        expect(error).toBeInstanceOf(ScrapeError);
        expect(error.status).toBe(422);
        expect(error.message).toContain("JavaScript");
    });

    it("uses the render endpoint as a last resort when configured", async () => {
        vi.stubEnv("SCRAPE_RENDER_ENDPOINT", "https://render.test/?url={url}");
        const spy = stubFetch((url) =>
            url.startsWith("https://render.test/")
                ? new Response(BODY, { headers: { "content-type": "text/plain" } })
                : html(
                      htmlPage(
                          "",
                          '<div id="root"></div><script src="a.js"></script><script src="b.js"></script><script src="c.js"></script>',
                      ),
                  ),
        );

        const text = await fetchReadableText("https://example.com/jobb");

        expect(text).toContain("dyktig utvikler");
        expect(String(spy.mock.calls[1][0])).toBe(
            `https://render.test/?url=${encodeURIComponent("https://example.com/jobb")}`,
        );
    });
});
