"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { JobPosting } from "@/lib/schema";

// Auto-sent on mount to trigger the first assistant message (a cover-letter
// draft). It's a real user turn so the draft lands in the model's history for
// follow-ups, but we hide this one bubble so the draft reads as message #1.
const KICKOFF =
    "Please draft a first-version cover letter for this role based on the job details.";

function messageText(message: UIMessage): string {
    return message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
}

export function ApplicationChat({ jobData }: { jobData: JobPosting }) {
    const [input, setInput] = useState("");

    const { messages, sendMessage, status, error } = useChat({
        transport: new DefaultChatTransport({
            api: "/api/chat",
            // Sent with every request → persists as system context server-side.
            body: { jobData },
        }),
    });

    const isStreaming = status === "submitted" || status === "streaming";

    // Fire the cover-letter draft exactly once, after mount.
    const kickedOff = useRef(false);
    useEffect(() => {
        if (kickedOff.current) return;
        kickedOff.current = true;
        sendMessage({ text: KICKOFF });
    }, [sendMessage]);

    // Predefined one-tap refinements. The skill-specific one only appears when
    // the posting gave us a skill to name.
    const quickActions = useMemo(() => {
        const actions = [
            { label: "Make more formal", text: "Make the cover letter more formal." },
            {
                label: "Make shorter",
                text: "Make the cover letter shorter and more concise.",
            },
        ];
        const skill = jobData.requiredSkills?.[0];
        if (skill) {
            actions.push({
                label: `Highlight ${skill}`,
                text: `Revise the letter to highlight my experience with ${skill}.`,
            });
        }
        return actions;
    }, [jobData.requiredSkills]);

    // Hide the kickoff turn; show everything else.
    const visible = messages.filter(
        (m) => !(m.role === "user" && messageText(m) === KICKOFF),
    );

    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [messages, status]);

    function send(text: string) {
        if (!text.trim() || isStreaming) return;
        sendMessage({ text });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        send(input);
        setInput("");
    }

    // Nothing visible yet = the draft is still being generated.
    const awaitingDraft = visible.length === 0;

    return (
        <div className="flex h-[70vh] flex-col">
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
                {awaitingDraft && (
                    <p className="text-gray-400">
                        <span className="streaming-cursor">
                            Drafting a cover letter from the job details…
                        </span>
                    </p>
                )}

                {visible.map((message, i) => {
                    const isLast = i === visible.length - 1;
                    const showCursor =
                        isStreaming && isLast && message.role === "assistant";
                    const isUser = message.role === "user";

                    return (
                        <div
                            key={message.id}
                            className={isUser ? "text-right" : "text-left"}
                        >
                            <span
                                className={`inline-block max-w-full whitespace-pre-wrap rounded-lg px-3 py-2 text-left ${
                                    isUser
                                        ? "bg-blue-500 text-white"
                                        : "bg-white/5 text-gray-100"
                                } ${showCursor ? "streaming-cursor" : ""}`}
                            >
                                {messageText(message)}
                            </span>
                        </div>
                    );
                })}

                {error && (
                    <p className="text-red-500">
                        Something went wrong. Please try again.
                    </p>
                )}
            </div>

            {/* Quick actions */}
            <div className="mt-3 flex flex-wrap gap-2">
                {quickActions.map((action) => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={() => send(action.text)}
                        disabled={isStreaming}
                        className="rounded-full border border-gray-700 px-3 py-1 text-sm text-gray-300 hover:border-blue-500 hover:text-white disabled:opacity-50"
                    >
                        {action.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask for changes, or tell it about your experience…"
                    className="flex-1 rounded-lg border border-gray-700 bg-transparent px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={isStreaming || !input.trim()}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
