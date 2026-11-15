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

- [Next.js](https://nextjs.org) (App Router) + [React](https://react.dev) + TypeScript
- Route handlers on the Node.js runtime for the API
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

Then install dependencies and start the dev server. It needs Node 22.22 or
newer (the test environment, jsdom, will not start on older versions):

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The dev server binds to
loopback only, because the API spends your Anthropic key and has none of the
deployed rate limit.

`npm test` runs the tests, `npm run lint` the linter, and `npm run build` a
production build.

### Optional: Jina Reader API key

Job pages that build themselves with JavaScript are read through
[Jina Reader](https://jina.ai/reader/) (see [Reading a job URL](#reading-a-job-url)).
It works without a key, with a rate limit; a free key raises it:

```bash
JINA_API_KEY=...   # optional
```

## Project structure

```
src/
  app/                        # Next.js App Router entry points
    layout.tsx                # <html lang="no">, metadata, fonts, global CSS
    page.tsx                  # the one page; renders ClientApp
    ClientApp.tsx             # the only "use client" boundary; loads App without SSR
    globals.css               # Tailwind + design tokens
    api/
      extract/route.ts        # URL fetch + streamObject extraction
      chat/route.ts           # streamText chat, job data as persistent system context
      health/route.ts         # GET /api/health
  App.tsx                     # orchestrates input/extraction/chat + history state
  hooks/
    useJobExtraction.ts       # one streaming extraction (useObject) and its errors
    useView.ts                # Home / Letters view, mirrored in the URL hash
  components/
    job/                      # JobInput (URL/text + examples), JobDetails (the card)
    chat/ApplicationChat.tsx  # cover-letter chat with quick actions
    layout/                   # Header, Sidebar (history) and Hero
    ui/                       # design-system primitives (Button, Chip, Card, ...)
  lib/
    storage.ts                # localStorage-backed job history (useSyncExternalStore)
    examples.ts               # fictional example postings for the input screen
server/lib/                   # server-only code used by the route handlers
  scrape.ts                   # URL fetch (Readability, Jina fallback) + SSRF guarding
  body.ts                     # reads a JSON body, capped at 256 KB
shared/                       # imported by both sides as @shared/
  schema.ts                   # Zod schema for the extracted job posting
  url.ts                      # normalizes a pasted URL
```

### Server and client

`layout.tsx` and `page.tsx` are Server Components, but they only render the
shell. Everything the user sees is built from the URL hash and `localStorage`,
which the server never has, so `ClientApp.tsx` loads the app with
`ssr: false` rather than server-rendering an empty home page that would flash
before the real view replaced it. That file carries the only `"use client"`
directive in the project; everything it imports is client code already.

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

Everything deploys to [Vercel](https://vercel.com) as one Next.js project,
with no `vercel.json`: the page is prerendered as static HTML and each file
under `src/app/api/` becomes a function.

Because the page and the API are served from one origin, the client's
relative `/api` calls need no base URL and neither side needs CORS.

Set `ANTHROPIC_API_KEY` as an environment variable in the Vercel project. It
is read only inside the route handlers, never reaches the client bundle, and
is only in your local `.env` (gitignored) otherwise. Keep it that way by
leaving every Anthropic call in `src/app/api/`, and never give it a
`NEXT_PUBLIC_` prefix — that is what inlines a variable into browser code.

`export const maxDuration = 60` in the extract and chat routes is
load-bearing: a slow page fetch plus a full generation does not fit in a
short default limit, and the request would be cut off mid-stream.

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
