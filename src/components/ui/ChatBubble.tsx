import type { ReactNode } from "react";

export function ChatBubble({
    role,
    streaming,
    children,
}: {
    role: "user" | "assistant" | (string & {});
    streaming?: boolean;
    children: ReactNode;
}) {
    const isUser = role === "user";
    return (
        <div className={isUser ? "text-right" : "text-left"}>
            <span
                className={`inline-block max-w-full rounded-lg px-3 py-2 text-left text-sm whitespace-pre-wrap ${
                    isUser
                        ? "bg-[var(--bubble-user-bg)] text-[var(--bubble-user-text)]"
                        : "bg-[var(--bubble-assistant-bg)] text-[var(--bubble-assistant-text)]"
                } ${streaming ? "streaming-cursor" : ""}`}
            >
                {children}
            </span>
        </div>
    );
}

export function StreamingLine({ children }: { children: ReactNode }) {
    return (
        <p className="text-sm text-[var(--text-secondary)]">
            <span className="streaming-cursor">{children}</span>
        </p>
    );
}
