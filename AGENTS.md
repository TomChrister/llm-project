# Architecture

A Next.js App Router project. Code belongs to exactly one of these areas:

- `src/app/` — the Next.js entry points. `layout.tsx` and `page.tsx` are Server
  Components and only render the shell. `ClientApp.tsx` is the single
  `"use client"` boundary; it loads `src/App.tsx` with `ssr: false`, because
  the UI is built from the URL hash and `localStorage`, which the server never
  sees. Don't add `"use client"` anywhere else — everything below that
  boundary is already client code.
- `src/app/api/` — the route handlers (`extract`, `chat`, `health`). They own
  the Anthropic calls. Each one reads its body through
  `server/lib/body.ts`, which enforces the request size cap.
- `src/` otherwise — the React client. Components live in domain folders
  (`components/layout`, `components/job`, `components/chat`, `components/ui`),
  stateful logic in `hooks/`. Reached by the `@/` alias.
- `server/lib/` — server-only code the route handlers call: the URL scraping
  stack with its SSRF guard (`scrape.ts`) and the body reader (`body.ts`).
  Never import it from a component.
- `shared/` — the few modules both sides import (`schema.ts`, `url.ts`).
  Reached by the `@shared/` alias.

Anything holding `ANTHROPIC_API_KEY`, or fetching a third-party URL, belongs in
a route handler or `server/lib/`. Never give a secret a `NEXT_PUBLIC_` prefix:
that inlines it into the browser bundle.

Navigation between the two views is the URL hash (`src/hooks/useView.ts`), not
Next.js routes — there is one page, `/`.

`npm run dev` starts Next.js on http://127.0.0.1:3000, bound to loopback on
purpose: the API spends the Anthropic key and has no rate limit locally.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
