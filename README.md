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

### Optional: Jina Reader API key

Job pages that build themselves with JavaScript are read through
[Jina Reader](https://jina.ai/reader/) (see [Reading a job URL](#reading-a-job-url)).
It works without a key, with a rate limit; a free key raises it:

```bash
JINA_API_KEY=...   # optional
```

## Project structure

```
src/                          # React client (Vite), imported as @/
  App.tsx                     # orchestrates input/extraction/chat + history state
  hooks/useJobExtraction.ts   # one streaming extraction (useObject) and its errors
  components/
    job/                      # JobInput (URL/text + examples), JobDetails (the card)
    chat/ApplicationChat.tsx  # cover-letter chat with quick actions
    layout/                   # Sidebar (history) and Hero
    ui/                       # design-system primitives (Button, Chip, Card, ...)
  lib/
    storage.ts                # localStorage-backed job history (useSyncExternalStore)
    examples.ts               # fictional example postings for the input screen
server/                       # Hono API: owns the API key and all outside fetches
  app.ts                      # the app: body limit + routes
  index.ts                    # Node entrypoint for `npm run dev`
  routes/extract.ts           # URL fetch + streamObject extraction
  routes/chat.ts              # streamText chat, job data as persistent system context
  lib/scrape.ts               # URL fetch (Readability, Jina fallback) + SSRF guarding
shared/                       # imported by both sides as @shared/
  schema.ts                   # Zod schema for the extracted job posting
  url.ts                      # normalizes a pasted URL
api/[...route].ts             # Vercel function wrapping server/app.ts
```

## Reading a job URL

`fetchReadableText` in `server/lib/scrape.ts` tries two steps and takes the
first that yields a real posting:

| # | Step | Catches |
|---|------|---------|
| 1 | **Readability** — fetch the page, extract its main text (Firefox Reader View's algorithm) | ordinary server-rendered pages |
| 2 | **Jina Reader** — `r.jina.ai` runs the page in a browser and returns its text | JavaScript-only pages, and pages that block a plain fetch |

Step 2 sends the URL to a third party. When both come up empty the user is
pointed at the paste-the-text input, which always works. Live smoke tests
against real boards run with `SCRAPE_LIVE_TESTS=1 npm test -- scrape.live`.

## Deploying

Everything deploys to [Vercel](https://vercel.com) as one project. The client
is a static Vite build; the API is the same Hono app served as a function.

`server/app.ts` builds the app and mounts the routes; nothing in it knows
where it runs. Two entrypoints pick that up:

- `api/[...route].ts` — the Vercel function. The catch-all filename means
  Vercel's filesystem routing hands it every `/api/*` request with the path
  intact, so the app routes exactly as it does under Node.
- `server/index.ts` — a standalone Node process, used by `npm run dev`.
  Vercel never loads it.

Because both halves are served from one origin, the client's relative `/api`
calls need no base URL and neither side needs CORS.

Set `ANTHROPIC_API_KEY` as an environment variable in the Vercel project. It
is read only inside `server/`, never reaches the client bundle, and is only
in your local `.env` (gitignored) otherwise. Keep it that way by leaving
every Anthropic call in `server/`.

Two settings in `vercel.json` are load-bearing. `functions.maxDuration` is
60s because a slow page fetch plus a full generation does not fit in the 10s
default — the request would be cut off mid-stream. The rewrite sends every
path *except* `/api/` to `index.html`, without which a hard reload on a deep
link 404s.

The API also needs a **Vercel Firewall rate-limit rule**, which lives in the
project dashboard, not in this repo: request path starts with `/api/`, fixed
window of 60 s, 30 requests per IP, answered with 429 (Too Many Requests).
Every API call spends Claude credit, and nothing in the code limits how many
requests arrive, so a new Vercel project deployed without this rule is an open
proxy to your key. Set a monthly spend limit on the Anthropic key as well —
the only cap against someone rotating IP addresses.

`main` is protected by a GitHub ruleset requiring the [CI workflow](.github/workflows/ci.yml)
to pass before merging, so only a build that has passed lint, type checks,
and tests can reach `main`.
