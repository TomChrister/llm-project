"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { JobPosting } from "@/lib/schema";
import { Button, QuickActionButton } from "@/components/ui/Button";
import { ChatBubble, StreamingLine } from "@/components/ui/ChatBubble";
import { Input } from "@/components/ui/Input";

// Auto-sent on mount to trigger the first assistant message (a cover-letter
// draft). It's a real user turn so the draft lands in the model's history for
// follow-ups, but we hide this one bubble so the draft reads as message #1.
const KICKOFF =
    "Skriv et førsteutkast til søknadsbrev for denne stillingen basert på stillingsdetaljene.";

function messageText(message: UIMessage): string {
    return message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
}

// Remounted with `key={jobId}` by the parent whenever the active job changes,
// so each job gets its own useChat instance seeded from its saved thread.
export function ApplicationChat({
    jobId,
    jobData,
    initialMessages,
    onMessagesChange,
}: {
    jobId: string;
    jobData: JobPosting;
    initialMessages: UIMessage[];
    onMessagesChange: (messages: UIMessage[]) => void;
}) {
    const [input, setInput] = useState("");

    const { messages, sendMessage, status, error } = useChat({
        id: jobId,
        messages: initialMessages,
        // Sent with every request → persists as system context for the whole
        // conversation, not just the first turn.
        transport: new DefaultChatTransport({
            api: "/api/chat",
            body: { jobData },
        }),
    });

    const isStreaming = status === "submitted" || status === "streaming";

    // Persist the thread on every change so picking this job again from the
    // sidebar restores the full conversation, not just the extracted card.
    useEffect(() => {
        onMessagesChange(messages);
    }, [messages, onMessagesChange]);

    // Fire the cover-letter draft exactly once for a brand-new job. Jobs
    // restored from history already have messages, so this is skipped.
    const kickedOff = useRef(false);
    useEffect(() => {
        if (kickedOff.current || messages.length > 0) return;
        kickedOff.current = true;
        sendMessage({ text: KICKOFF });
    }, [messages.length, sendMessage]);

    // Predefined one-tap refinements. The skill-specific one only appears when
    // the posting gave us a skill to name.
    const quickActions = useMemo(() => {
        const actions = [
            { label: "Gjør mer formelt", text: "Gjør søknadsbrevet mer formelt." },
            {
                label: "Gjør kortere",
                text: "Gjør søknadsbrevet kortere og mer konsist.",
            },
        ];
        const skill = jobData.requiredSkills?.[0];
        if (skill) {
            actions.push({
                label: `Fremhev ${skill}`,
                text: `Revider brevet for å fremheve min erfaring med ${skill}.`,
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
                {awaitingDraft && !error && (
                    <StreamingLine>
                        Utarbeider søknadsbrev basert på stillingsdetaljene…
                    </StreamingLine>
                )}

                {visible.map((message, i) => {
                    const isLast = i === visible.length - 1;
                    const showCursor =
                        isStreaming && isLast && message.role === "assistant";

                    return (
                        <ChatBubble
                            key={message.id}
                            role={message.role}
                            streaming={showCursor}
                        >
                            {messageText(message)}
                        </ChatBubble>
                    );
                })}

                {error && (
                    <p className="text-sm text-[var(--text-danger)]">
                        Noe gikk galt. Prøv igjen.
                    </p>
                )}
            </div>

            {/* Quick actions */}
            <div className="mt-3 flex flex-wrap gap-2">
                {quickActions.map((action) => (
                    <QuickActionButton
                        key={action.label}
                        onClick={() => send(action.text)}
                        disabled={isStreaming}
                    >
                        {action.label}
                    </QuickActionButton>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
                <div className="flex-1">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Be om endringer, eller fortell om din erfaring…"
                    />
                </div>
                <Button type="submit" disabled={isStreaming || !input.trim()}>
                    Send
                </Button>
            </form>
        </div>
    );
}
