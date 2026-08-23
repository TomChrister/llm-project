// Adapters for applicant tracking systems that expose the posting as public
// JSON. Two reasons to prefer these over scraping the page:
//
//   1. Some boards (BambooHR, Workday) render everything client-side, so the
//      HTML we can fetch is an empty shell — the API is the only way in.
//   2. Even where the page works, the API gives us the posting without the
//      surrounding application form, cookie banner and nav.
//
// Adding a board is deliberately a small, local change: write a resolve() that
// maps the public URL to the API URL, a parse() that turns the response into
// text, and append it to ADAPTERS.
import { get, htmlToText, isObject, joinFields, plainText } from "@/lib/scrape-text";

export type AtsAdapter = {
    /** Identifies the adapter in logs. */
    name: string;
    /** The JSON API URL for this posting, or null if the URL isn't ours. */
    resolve(url: URL): string | null;
    /** Posting text from the API response, or null if the shape surprised us. */
    parse(payload: unknown): string | null;
};

const bamboohr: AtsAdapter = {
    name: "bamboohr",
    resolve(url) {
        if (!/(^|\.)bamboohr\.com$/.test(url.hostname)) return null;
        const id = /^\/careers\/(\d+)/.exec(url.pathname)?.[1];
        return id ? `https://${url.hostname}/careers/${id}/detail` : null;
    },
    parse(payload) {
        const job = get(payload, ["result", "jobOpening"]);
        if (!isObject(job)) return null;
        return joinFields(
            [
                ["Title", job["jobOpeningName"]],
                ["Department", job["departmentLabel"]],
                ["Location", job["location"]],
                ["Employment type", job["employmentStatusLabel"]],
                ["Posted", job["datePosted"]],
            ],
            job["description"],
        );
    },
};

const greenhouse: AtsAdapter = {
    name: "greenhouse",
    resolve(url) {
        if (!/(^|\.)greenhouse\.io$/.test(url.hostname)) return null;
        // boards.greenhouse.io/acme/jobs/123 and the newer job-boards host.
        const match = /^\/(?:embed\/job_app\?token=)?([^/]+)\/jobs\/(\d+)/.exec(
            url.pathname,
        );
        if (!match) return null;
        const [, board, id] = match;
        return `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}`;
    },
    parse(payload) {
        if (!isObject(payload)) return null;
        return joinFields(
            [
                ["Title", payload["title"]],
                ["Company", payload["company_name"]],
                ["Location", payload["location"]],
                ["Posted", payload["first_published"]],
            ],
            // Greenhouse returns entity-escaped markup; htmlToText decodes it.
            payload["content"],
        );
    },
};

const lever: AtsAdapter = {
    name: "lever",
    resolve(url) {
        if (!/(^|\.)lever\.co$/.test(url.hostname)) return null;
        const match = /^\/([^/]+)\/([0-9a-f-]{36})/.exec(url.pathname);
        if (!match) return null;
        const [, company, id] = match;
        return `https://api.lever.co/v0/postings/${company}/${id}`;
    },
    parse(payload) {
        if (!isObject(payload)) return null;
        // Lever splits the posting into an intro, a set of titled lists
        // (requirements, benefits...) and a closing block. Stitch them back
        // together in reading order.
        const sections: string[] = [];
        const intro = payload["descriptionPlain"] ?? payload["description"];
        if (typeof intro === "string") sections.push(htmlToText(intro));

        const lists = payload["lists"];
        if (Array.isArray(lists)) {
            for (const list of lists) {
                if (!isObject(list)) continue;
                const heading = plainText(list["text"]);
                const body = typeof list["content"] === "string" ? htmlToText(list["content"]) : "";
                if (heading || body) sections.push([heading, body].filter(Boolean).join("\n"));
            }
        }

        const outro = payload["additionalPlain"] ?? payload["additional"];
        if (typeof outro === "string") sections.push(htmlToText(outro));

        return joinFields(
            [
                ["Title", payload["text"]],
                ["Location", get(payload, ["categories", "location"])],
                ["Department", get(payload, ["categories", "team"])],
                ["Employment type", get(payload, ["categories", "commitment"])],
            ],
            sections.filter(Boolean).join("\n\n"),
        );
    },
};

export const ADAPTERS: readonly AtsAdapter[] = [bamboohr, greenhouse, lever];

/** The first adapter that recognises this URL, with its resolved API URL. */
export function matchAdapter(
    url: URL,
): { adapter: AtsAdapter; apiUrl: string } | null {
    for (const adapter of ADAPTERS) {
        const apiUrl = adapter.resolve(url);
        if (apiUrl) return { adapter, apiUrl };
    }
    return null;
}
