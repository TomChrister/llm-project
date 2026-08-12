"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";

// Pull the plain text out of a UIMessage's parts (we only stream text parts).
function messageText(message: UIMessage): string {
    return message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
}

export function Chat({ documentText }: { documentText: string }) {
    const [input, setInput] = useState("");

    const { messages, sendMessage, status, error } = useChat({
        transport: new DefaultChatTransport({
            api: "/api/chat",
            // Sent with every request — becomes the system context server-side.
            body: { document: documentText },
        }),
    });

    const isStreaming = status === "submitted" || status === "streaming";

    // Auto-scroll to the newest content as it streams in.
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [messages, status]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const text = input.trim();
        if (!text || isStreaming) return;
        sendMessage({ text });
        setInput("");
    }

    return (
        <div className="flex flex-col h-[70vh]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
                {messages.length === 0 && (
                    <p className="text-white">Ask a question about the document.</p>
                )}

                {messages.map((message, i) => {
                    const isLast = i === messages.length - 1;
                    const showCursor =
                        isStreaming && isLast && message.role === "assistant";

                    return (
                        <div
                            key={message.id}
                            className={
                                message.role === "user" ? "text-right" : "text-left"
                            }
                        >
                            <span
                                className={`inline-block whitespace-pre-wrap rounded-lg px-3 py-2 ${
                                    message.role === "user"
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-100 text-red-600"
                                } ${showCursor ? "streaming-cursor" : ""}`}
                            >
                                {messageText(message)}
                            </span>
                        </div>
                    );
                })}

                {/* Caret before the first token of the assistant reply arrives. */}
                {status === "submitted" && (
                    <div className="text-left">
                        <span className="streaming-cursor inline-block rounded-lg bg-gray-100 px-3 py-2 text-red-600" />
                    </div>
                )}

                {error && (
                    <p className="text-red-600">Something went wrong. Please try again.</p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
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
