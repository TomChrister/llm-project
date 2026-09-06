# Job Application Assistant

[![CI](https://github.com/TomChrister/llm-document/actions/workflows/ci.yml/badge.svg)](https://github.com/TomChrister/llm-document/actions/workflows/ci.yml)

Paste a job posting, as a URL or as plain text, and get its details pulled
out into a structured card (role, company, skills, responsibilities), then
chat with an AI assistant that drafts and refines a cover letter tailored to
it.

## How it works

1. **Input** — paste a job posting URL or its raw text (or click one of the
   built-in fictional examples to try it without hunting down a real
   posting).
2. **Extraction** — for a URL, the server fetches the page and runs it
   through [Readability](https://github.com/mozilla/readability) to strip
   nav/footer/ad noise down to the article text. That text (or the pasted
   text) is sent to Claude with a Zod schema, and the structured result
   streams into the UI field by field.
3. **Details card** — title, company, location, employment type, seniority,
   required/nice-to-have skills, and responsibilities render as a card with
   skill tags.
4. **Chat** — the extracted job data is sent as system context with every
   chat request, so it stays available for the whole conversation. The
   assistant opens with a draft cover letter and offers quick-action buttons
   ("Make more formal", "Make shorter", "Highlight \<skill\>") alongside free-form
   chat.
5. **History** — every extraction is saved to `localStorage` (job data + its
   full chat thread) and listed in the sidebar, so you can switch back to a
   past job or start a new extraction without losing earlier work.

## Tech stack

- [React](https://react.dev) + [Vite](https://vite.dev) + TypeScript
- [Hono](https://hono.dev) on Node for the API
- [Vercel AI SDK](https://ai-sdk.dev) (`streamObject` for extraction,
  `streamText` for chat) with the Anthropic provider
- [Zod](https://zod.dev) for the extraction schema
- `@mozilla/readability` + `linkedom` for server-side URL scraping
- Tailwind CSS v4

## Getting started

Create a `.env` file with an Anthropic API key:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Then install dependencies and start both halves (Vite on 5173, the API on
3001; Vite proxies `/api` to it):

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Optional: rendering JavaScript-only job pages

Most job pages can be read from their HTML (see [Reading a job URL](#reading-a-job-url)),
but a page that builds itself entirely in the browser gives a server-side
fetch nothing to read. To cover those too, point the app at a service that
executes the page's JavaScript:

```bash
SCRAPE_RENDER_ENDPOINT=https://r.jina.ai/{url}   # {url} is replaced, URL-encoded
SCRAPE_RENDER_TOKEN=...                          # optional bearer token
```

Anything that takes a URL and returns rendered HTML or plain text works —
[Jina Reader](https://jina.ai/reader/), Browserless, ScrapingBee. Without it
the app simply asks the user to paste the text instead. Note that this sends
the URL to a third party.

## Project structure

```
src/
  app/
    api/extract/route.ts   # URL fetch + streamObject extraction
    api/chat/route.ts      # streamText chat, job data as persistent system context
    page.tsx                # orchestrates input/extraction/chat + history state
  components/
    JobInput.tsx             # URL/text mode toggle + example postings
    JobDetails.tsx           # extracted job data as a card with skill tags
    ApplicationChat.tsx      # cover-letter chat with quick actions
    Sidebar.tsx / Hero.tsx   # job history sidebar + landing hero
    ui/                      # design-system primitives (Button, Chip, Card, ...)
  lib/
    schema.ts                # shared Zod schema for the extracted job posting
    scrape.ts                 # URL fetch orchestration + SSRF guarding
    scrape-adapters.ts        # public JSON APIs of known ATS platforms
    scrape-extractors.ts      # JSON-LD / Readability / hydration-payload extractors
    scrape-text.ts            # HTML-to-text and field-formatting helpers
    storage.ts                # localStorage-backed job history (useSyncExternalStore)
    examples.ts               # fictional example postings for the input screen
```

## Reading a job URL

No single technique reads every job board, so `fetchReadableText` runs a chain
of strategies and takes the first that yields a real posting:

| # | Strategy | Catches |
|---|----------|---------|
| 1 | **ATS adapter** — the board's public JSON API | BambooHR, Greenhouse, Lever |
| 2 | **JSON-LD** — a schema.org `JobPosting` in the page | anything indexed by Google Jobs |
| 3 | **Readability** — Firefox Reader View's algorithm | ordinary server-rendered pages |
| 4 | **Hydration payload** — `__NEXT_DATA__`, `__NUXT__`, `application/json` | client-rendered pages that still ship their data |
| 5 | **Renderer** — an external service that runs the page's JS | everything else, if configured |

Steps 1–4 need nothing but a fetch. Step 5 is opt-in (see
[above](#optional-rendering-javascript-only-job-pages)). When all of them come
up empty the user is told the page needs JavaScript and pointed at the
paste-the-text input, which always works.

Supporting another board is a local change in `scrape-adapters.ts`: a
`resolve()` mapping the public URL to the API URL, a `parse()` turning the
response into text, and one entry in `ADAPTERS`. Live smoke tests for the
existing adapters live in `scrape.live.test.ts` and run with
`SCRAPE_LIVE_TESTS=1 npm test -- scrape.live`.

## Deploying

The app is two deployables: the static client and the API. The client stays
on [Vercel](https://vercel.com); the API is a long-running Node process, so
it runs anywhere that hosts a container.

**1. Deploy the API.** The `Dockerfile` builds only `server/` and `shared/`,
and works unchanged on Fly, Render, Railway, Cloud Run or a VPS:

```bash
docker build -t jobbsoknad-api .
docker run -p 3001:3001 -e ANTHROPIC_API_KEY=... jobbsoknad-api
```

The host supplies `PORT`; the server binds `0.0.0.0` so it is reachable from
outside the container. `GET /api/health` is there for health checks.

**2. Point Vercel at it.** Replace the placeholder host in `vercel.json`
with the API's real URL. That rewrite is what keeps the whole thing on one
origin: the browser only ever calls `/api/...` on the Vercel domain, and
Vercel proxies it onward server-side — so neither side needs CORS, and the
client needs no base URL.

**3. Set the Vercel project's framework preset to Vite** (`vercel.json`
declares it too). The second rewrite sends every non-API path to
`index.html`, without which a hard reload on any deep link 404s.

`ANTHROPIC_API_KEY` belongs in the API host's environment and nowhere else —
not in Vercel, which never runs a line of server code. It is only in your
local `.env` (gitignored) and never reaches the client bundle. Keep it that
way by leaving every Anthropic call in `server/`.

`main` is protected by a GitHub ruleset requiring the [CI workflow](.github/workflows/ci.yml)
to pass before merging, so only a build that has passed lint, type checks,
and tests can reach `main`.
