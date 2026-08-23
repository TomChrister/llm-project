import { describe, expect, it } from "vitest";
import { fetchReadableText } from "@/lib/scrape";

// Smoke tests against the real boards, to catch an ATS quietly changing or
// retiring its public API. They need network access, so they are opt-in and
// stay out of CI:
//
//   SCRAPE_LIVE_TESTS=1 npm test -- scrape.live
//
// The Lever and NAV URLs are specific postings and will 404 once those are
// taken down; swap in current ones when that happens.
const cases: Array<[string, string, string]> = [
    ["bamboohr (JS-only)", "https://pexip.bamboohr.com/careers/635", "Pexip"],
    [
        "greenhouse",
        "https://job-boards.greenhouse.io/anthropic/jobs/4461450008",
        "Anthropic",
    ],
    [
        "lever",
        "https://jobs.lever.co/leverdemo/33538a2f-d27d-4a96-8f05-fa4b0e4d940e",
        "Lever",
    ],
    [
        "nav (server-rendered)",
        "https://arbeidsplassen.nav.no/stillinger/stilling/fcab3cc9-9f56-4011-a03c-3191557a08b5",
        "Tromsø",
    ],
];

describe.skipIf(!process.env.SCRAPE_LIVE_TESTS)("live extraction", () => {
    it.each(cases)("%s", async (_name, url, needle) => {
        const text = await fetchReadableText(url);
        console.log(`\n=== ${url}\n${text.slice(0, 400)}\n[${text.length} chars]`);
        expect(text).toContain(needle);
    }, 40_000);
});
