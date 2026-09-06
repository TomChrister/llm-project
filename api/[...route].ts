// Vercel entrypoint. The catch-all filename lets Vercel's filesystem routing
// hand every /api/* request to this one function with its original path
// intact, which is what lets the Hono app route on /api/extract and friends
// exactly as it does under Node.
//
// The export is an object with a `fetch` method, not a bare function: Vercel
// calls a bare default export with the Node `(req, res)` signature and throws
// away anything it returns, so a Response handed back that way is silently
// dropped and the request hangs until it times out. This shape is the Web
// Standard one Vercel documents for Hono and friends.
//
// Relative imports need their .js extension — the project is "type": "module",
// so the compiled function runs as strict ESM with no extension guessing.
//
// Unlike the old Next route handlers, a function has a wall-clock limit —
// vercel.json raises it to 60s, because a slow page fetch plus a full
// generation does not fit in the 10s default.
import { app } from "../server/app.js";

export default {
    fetch(request: Request) {
        return app.fetch(request);
    },
};
