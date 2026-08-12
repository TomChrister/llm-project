"use client";

import { useObject } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { answerSchema, type AnswerObject } from "@/lib/schema";

type Entry = { question: string } & AnswerObject;

type CiteHandler = (quote: string, page: number | null) => void;

// Parse a pageHint like "p. 2" into a page number (null for "unknown").
function pageFromHint(hint?: string): number | null {
    const m = hint?.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
}

// A single citation rendered as a clickable box. Clicking jumps to and
// highlights the quote in the PDF viewer, and also expands the full quote here.
function Citation({
    quote,
    pageHint,
    onCite,
}: {
    quote?: string;
    pageHint?: string;
    onCite?: CiteHandler;
}) {
    const [open, setOpen] = useState(false);
    const text = quote ?? "";
    const preview = text.length > 90 ? text.slice(0, 90) + "…" : text;

    return (
        <button
            type="button"
            onClick={() => {
                setOpen((o) => !o);
                if (text) onCite?.(text, pageFromHint(pageHint));
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
        >
            <span className="font-medium text-blue-600">{pageHint || "source"}</span>
            <span className="mt-1 block whitespace-pre-wrap text-gray-700">
                “{open ? text : preview}”
            </span>
        </button>
    );
}

function AnswerBlock({
    answer,
    citations,
    streaming,
    onCite,
}: {
    answer?: string;
    citations?: AnswerObject["citations"];
    streaming?: boolean;
    onCite?: CiteHandler;
}) {
    return (
        <div className="space-y-2">
            <p
                className={`whitespace-pre-wrap text-white ${
                    streaming ? "streaming-cursor" : ""
                }`}
            >
                {answer}
            </p>
            {citations && citations.length > 0 && (
                <div className="space-y-1">
                    {citations.map((c, i) => (
                        <Citation
                            key={i}
                            quote={c?.quote}
                            pageHint={c?.pageHint}
                            onCite={onCite}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function DocumentQA({
    docId,
    onCite,
}: {
    docId: string;
    onCite?: CiteHandler;
}) {
    const [question, setQuestion] = useState("");
    const [pending, setPending] = useState<string | null>(null);
    const [history, setHistory] = useState<Entry[]>([]);
    const pendingRef = useRef("");

    const { submit, object, isLoading, error, clear } = useObject({
        api: "/api/ask",
        schema: answerSchema,
        onFinish({ object }) {
            if (object) {
                setHistory((h) => [...h, { question: pendingRef.current, ...object }]);
            }
            setPending(null);
            clear();
        },
    });

    // Auto-scroll to the newest content as the answer streams in.
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [history, object, pending]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const q = question.trim();
        if (!q || isLoading) return;
        pendingRef.current = q;
        setPending(q);
        submit({ question: q, docId });
        setQuestion("");
    }

    return (
        <div className="flex flex-col h-[70vh]">
            <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto pr-1">
                {history.length === 0 && !pending && (
                    <p className="text-gray-500">Ask a question about the document.</p>
                )}

                {history.map((entry, i) => (
                    <div key={i} className="space-y-2">
                        <p className="font-bold text-white">{entry.question}</p>
                        <AnswerBlock
                            answer={entry.answer}
                            citations={entry.citations}
                            onCite={onCite}
                        />
                    </div>
                ))}

                {/* The in-flight question and its streaming answer. */}
                {pending && (
                    <div className="space-y-2">
                        <p className="font-medium text-white">{pending}</p>
                        <AnswerBlock
                            answer={object?.answer}
                            citations={object?.citations as AnswerObject["citations"]}
                            streaming={isLoading}
                            onCite={onCite}
                        />
                    </div>
                )}

                {error && (
                    <p className="text-red-600">Something went wrong. Please try again.</p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about the document..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                />
                <button
                    type="submit"
                    disabled={isLoading || !question.trim()}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
                >
                    Ask
                </button>
            </form>
        </div>
    );
}
