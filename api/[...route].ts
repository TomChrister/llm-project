// Vercel entrypoint. The catch-all filename lets Vercel's filesystem routing
// hand every /api/* request to this one function with its original path
// intact, which is what lets the Hono app route on /api/extract and friends
// exactly as it does under Node.
//
// Unlike the old Next route handlers, a function has a wall-clock limit —
// vercel.json raises it to 60s, because a slow page fetch plus a full
// generation does not fit in the 10s default.
import { handle } from "hono/vercel";
import { app } from "../server/app.js";

export default handle(app);
