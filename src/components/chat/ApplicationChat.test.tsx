import { render, screen, waitFor } from "@testing-library/react";
import {
    createUIMessageStream,
    createUIMessageStreamResponse,
    type UIMessage,
} from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobPosting } from "@shared/schema";
import { ApplicationChat } from "./ApplicationChat";

const JOB: JobPosting = {
    title: "Frontend-utvikler",
    requiredSkills: ["React"],
    niceToHaveSkills: [],
    responsibilities: [],
};

/**
 * Stub /api/chat with a reply streamed in two parts. The second part waits
 * for `release()`, so a test can look at the component mid-stream.
 */
function stubChat(first: string, second: string) {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    const fetchSpy = vi.fn<typeof fetch>(() =>
        Promise.resolve(
            createUIMessageStreamResponse({
                stream: createUIMessageStream({
                    async execute({ writer }) {
                        writer.write({ type: "text-start", id: "t" });
                        writer.write({ type: "text-delta", id: "t", delta: first });
                        await released;
                        writer.write({ type: "text-delta", id: "t", delta: second });
                        writer.write({ type: "text-end", id: "t" });
                    },
                }),
            }),
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);
    return { fetchSpy, release };
}

function hasAssistantText(messages: UIMessage[], text: string): boolean {
    return messages.some(
        (m) =>
            m.role === "assistant" &&
            m.parts.some((p) => p.type === "text" && p.text === text),
    );
}

function renderChat(initialMessages: UIMessage[] = []) {
    const onMessagesChange = vi.fn<(messages: UIMessage[]) => void>();
    render(
        <ApplicationChat
            jobId="job-1"
            jobData={JOB}
            initialMessages={initialMessages}
            onMessagesChange={onMessagesChange}
        />,
    );
    return onMessagesChange;
}

beforeEach(() => {
    // jsdom has no layout, so no scrollTo on elements.
    Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("ApplicationChat", () => {
    it("saves the thread once the reply is finished, not while it streams", async () => {
        const { release } = stubChat("Kjære ", "Acme");
        const onMessagesChange = renderChat();

        // Mid-stream: the first part is on screen but nothing has been saved
        // with an assistant reply in it.
        await screen.findByText(/Kjære/);
        for (const [messages] of onMessagesChange.mock.calls) {
            expect(messages.some((m) => m.role === "assistant")).toBe(false);
        }

        release();

        await waitFor(() => {
            const last = onMessagesChange.mock.calls.at(-1)?.[0] ?? [];
            expect(hasAssistantText(last, "Kjære Acme")).toBe(true);
        });
    });

    it("requests the draft again for a saved thread that never got one", async () => {
        const { fetchSpy, release } = stubChat("Utkast", "");
        release();

        // What a thread looks like after the draft request failed, or the user
        // left before it arrived: only the hidden kickoff turn.
        renderChat([
            { id: "u1", role: "user", parts: [{ type: "text", text: "gammel kickoff" }] },
        ]);

        expect(await screen.findByText("Utkast")).toBeInTheDocument();
        expect(screen.queryByText(/Utarbeider søknadsbrev/)).not.toBeInTheDocument();

        // Started over: one fresh kickoff, not the stale turn plus another.
        const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
        expect(body.messages).toHaveLength(1);
        expect(body.messages[0].parts[0].text).not.toBe("gammel kickoff");
    });

    it("keeps a saved thread that already has a draft", () => {
        const { fetchSpy } = stubChat("", "");

        renderChat([
            { id: "u1", role: "user", parts: [{ type: "text", text: "Hei" }] },
            { id: "a1", role: "assistant", parts: [{ type: "text", text: "Eksisterende brev" }] },
        ]);

        expect(screen.getByText("Eksisterende brev")).toBeInTheDocument();
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
