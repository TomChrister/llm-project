# Architecture

Three top-level areas, and code belongs to exactly one of them:

- `src/` — the React client, built by Vite. Components live in domain folders
  (`components/layout`, `components/job`, `components/chat`, `components/ui`),
  stateful logic in `hooks/`. Reached by the `@/` alias.
- `server/` — the Hono API on Node. Owns the Anthropic calls and the URL
  scraping stack (`server/lib/`). Uses relative imports only, so it runs under
  plain `tsx` with no path resolution.
- `shared/` — the few modules both sides import (`schema.ts`, `url.ts`).
  Reached by the `@shared/` alias.

Anything holding `ANTHROPIC_API_KEY`, or fetching a third-party URL, belongs in
`server/`. Putting it in `src/` ships the key to the browser and runs the fetch
against CORS.

`npm run dev` starts both halves: Vite on 5173 and the API on 3001, with Vite
proxying `/api` to it so the browser sees one origin.
