import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrapeError, fetchReadableText } from "./scrape.js";

// Long enough to clear MIN_TEXT_CHARS (200).
const BODY = (
    "Vi søker en dyktig utvikler til teamet vårt i Oslo. Du vil jobbe med " +
    "TypeScript, React og Node, og ha ansvar for videreutvikling av " +
    "plattformen vår. Vi tilbyr konkurransedyktige betingelser, fleksibel " +
    "arbeidstid og gode muligheter for faglig utvikling i et hyggelig " +
    "arbeidsmiljø med dyktige kolleger som bryr seg om kvalitet og god kode."
).repeat(2);

const JINA = "https://r.jina.ai/";

function htmlPage(body: string): string {
    return `<!doctype html><html><head><title>Test</title></head><body>${body}</body></html>`;
}

// What a JavaScript-only page hands a server-side fetch: an empty shell.
const APP_SHELL = htmlPage('<div id="root"></div><script src="app.js"></script>');
const ARTICLE = htmlPage(`<article><h1>Utvikler</h1><p>${BODY}</p></article>`);

function html(body: string): Response {
    return new Response(body, { headers: { "content-type": "text/html" } });
}

function text(body: string): Response {
    return new Response(body, { headers: { "content-type": "text/plain" } });
}

function stubFetch(handler: (url: string) => Response) {
    const spy = vi.fn<typeof fetch>((input) => Promise.resolve(handler(String(input))));
    vi.stubGlobal("fetch", spy);
    return spy;
}

const calledUrls = (spy: ReturnType<typeof stubFetch>) =>
    spy.mock.calls.map(([input]) => String(input));

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("fetchReadableText", () => {
    describe("SSRF guard", () => {
        it.each([
            "http://localhost/jobb",
            "localhost:3000/jobb",
            "http://192.168.1.1/",
            "http://[::1]/",
            "http://[::ffff:127.0.0.1]/",
            "http://[fd00::1]/",
        ])("rejects %s before fetching", async (url) => {
            const spy = stubFetch(() => html(ARTICLE));
            await expect(fetchReadableText(url)).rejects.toMatchObject({ status: 400 });
            expect(spy).not.toHaveBeenCalled();
        });

        it("refuses a redirect to a private address", async () => {
            const spy = stubFetch(
                () =>
                    new Response(null, {
                        status: 302,
                        headers: { location: "http://127.0.0.1:3001/" },
                    }),
            );
            await expect(fetchReadableText("https://example.com/jobb")).rejects.toMatchObject({
                status: 400,
            });
            // Neither the private address nor Jina is ever asked.
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    it("assumes https for an address pasted without a scheme", async () => {
        const spy = stubFetch(() => html(ARTICLE));
        await fetchReadableText("www.example.com/jobb");
        expect(calledUrls(spy)[0]).toBe("https://www.example.com/jobb");
    });

    it("reads a server-rendered page with Readability, without calling Jina", async () => {
        const spy = stubFetch(() => html(ARTICLE));

        const result = await fetchReadableText("https://example.com/jobb");

        expect(result).toContain("dyktig utvikler");
        expect(calledUrls(spy)).toEqual(["https://example.com/jobb"]);
    });

    it("follows a redirect to a public page", async () => {
        stubFetch((url) =>
            url === "https://example.com/jobb"
                ? new Response(null, { status: 301, headers: { location: "/ny-jobb" } })
                : html(ARTICLE),
        );
        expect(await fetchReadableText("https://example.com/jobb")).toContain("dyktig utvikler");
    });

    it("falls back to Jina for a JavaScript-only page", async () => {
        const spy = stubFetch((url) => (url.startsWith(JINA) ? text(BODY) : html(APP_SHELL)));

        const result = await fetchReadableText("https://example.com/jobb");

        expect(result).toContain("dyktig utvikler");
        expect(calledUrls(spy)[1]).toBe(`${JINA}https://example.com/jobb`);
    });

    it("falls back to Jina when the page blocks us", async () => {
        stubFetch((url) =>
            url.startsWith(JINA) ? text(BODY) : new Response("blocked", { status: 403 }),
        );
        expect(await fetchReadableText("https://example.com/jobb")).toContain("dyktig utvikler");
    });

    it("sends JINA_API_KEY to Jina only when it is set", async () => {
        const spy = stubFetch((url) => (url.startsWith(JINA) ? text(BODY) : html(APP_SHELL)));
        const jinaAuth = () => {
            const call = spy.mock.calls.find(([input]) => String(input).startsWith(JINA));
            return (call?.[1]?.headers as Record<string, string>)?.Authorization;
        };

        await fetchReadableText("https://example.com/jobb");
        expect(jinaAuth()).toBeUndefined();

        spy.mockClear();
        vi.stubEnv("JINA_API_KEY", "secret");
        await fetchReadableText("https://example.com/jobb");
        expect(jinaAuth()).toBe("Bearer secret");
    });

    it("asks for the text to be pasted when neither step finds a posting", async () => {
        stubFetch((url) =>
            url.startsWith(JINA) ? new Response("rate limited", { status: 429 }) : html(APP_SHELL),
        );
        vi.spyOn(console, "warn").mockImplementation(() => {});

        const error = await fetchReadableText("https://example.com/jobb").catch((e) => e);

        expect(error).toBeInstanceOf(ScrapeError);
        expect(error.status).toBe(422);
        expect(error.message).toContain("lim den inn");
    });

    it("keeps the page's own error when Jina fails too", async () => {
        stubFetch((url) =>
            url.startsWith(JINA)
                ? new Response("down", { status: 503 })
                : new Response("blocked", { status: 403 }),
        );
        vi.spyOn(console, "warn").mockImplementation(() => {});

        await expect(fetchReadableText("https://example.com/jobb")).rejects.toMatchObject({
            status: 502,
            message: expect.stringContaining("HTTP 403"),
        });
    });

    it("reports an expired ad (404) without calling Jina", async () => {
        const spy = stubFetch(() => new Response("gone", { status: 404 }));
        await expect(fetchReadableText("https://example.com/jobb")).rejects.toMatchObject({
            status: 422,
            message: expect.stringContaining("HTTP 404"),
        });
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("reports a timeout without calling Jina", async () => {
        const spy = vi.fn<typeof fetch>(() =>
            Promise.reject(Object.assign(new Error("timed out"), { name: "TimeoutError" })),
        );
        vi.stubGlobal("fetch", spy);
        await expect(fetchReadableText("https://example.com/jobb")).rejects.toMatchObject({
            status: 504,
        });
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("refuses a non-HTML file without calling Jina", async () => {
        const spy = stubFetch(
            () => new Response("%PDF", { headers: { "content-type": "application/pdf" } }),
        );
        await expect(fetchReadableText("https://example.com/a.pdf")).rejects.toMatchObject({
            status: 415,
        });
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("stops reading a page that passes the size cap", async () => {
        // No content-length and no end, so only the running byte count can stop it.
        let pulled = 0;
        const endless = new ReadableStream<Uint8Array>({
            pull(controller) {
                pulled++;
                controller.enqueue(new Uint8Array(1_000_000));
            },
        });
        stubFetch(() => new Response(endless, { headers: { "content-type": "text/html" } }));

        await expect(fetchReadableText("https://example.com/jobb")).rejects.toMatchObject({
            status: 413,
        });
        expect(pulled).toBeLessThan(10);
    });
});
