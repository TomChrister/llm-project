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

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Vercel AI SDK](https://ai-sdk.dev) (`streamObject` for extraction,
  `streamText` for chat) with the Anthropic provider
- [Zod](https://zod.dev) for the extraction schema
- `@mozilla/readability` + `jsdom` for server-side URL scraping
- Tailwind CSS v4

## Getting started

Create a `.env` file with an Anthropic API key:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Then install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
  app/
    api/extract/route.ts   # URL fetch + Readability + streamObject extraction
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
    scrape.ts                # URL fetch + Readability, with SSRF guarding
    storage.ts                # localStorage-backed job history (useSyncExternalStore)
    examples.ts               # fictional example postings for the input screen
```

## Deploying

This is a standard Next.js app and deploys to [Vercel](https://vercel.com)
like any other. Add `ANTHROPIC_API_KEY` as an environment variable in your
Vercel project settings, it's only in your local `.env` (gitignored) and
won't otherwise reach the deployed app.

`main` is protected by a GitHub ruleset requiring the [CI workflow](.github/workflows/ci.yml)
to pass before merging, so Vercel only ever deploys a build that has passed
lint, type checks, and tests.
