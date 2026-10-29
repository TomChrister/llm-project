import { describe, expect, it } from "vitest";
import { app } from "./app.js";

// The routes are public and spend Anthropic credit, so the guards in front of
// the model call matter. None of these requests may reach the model.
function postChat(body: string) {
    return app.request("/api/chat", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
    });
}

describe("/api/chat", () => {
    it("rejects a body that is not JSON", async () => {
        expect((await postChat("{")).status).toBe(400);
    });

    it("rejects a request without messages", async () => {
        expect((await postChat("{}")).status).toBe(400);
    });

    it("rejects a request without the job it is about", async () => {
        const messages = [{ role: "user", parts: [{ type: "text", text: "Hei" }] }];
        expect((await postChat(JSON.stringify({ messages }))).status).toBe(400);
    });

    it("rejects a conversation over the message cap", async () => {
        const messages = Array(101).fill({ role: "user", parts: [] });
        expect((await postChat(JSON.stringify({ messages }))).status).toBe(413);
    });

    it("rejects a body over the size cap", async () => {
        const messages = [{ role: "user", parts: [{ type: "text", text: "x".repeat(300_000) }] }];
        expect((await postChat(JSON.stringify({ messages }))).status).toBe(413);
    });
});
