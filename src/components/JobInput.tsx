"use client";

import { useState } from "react";
import { examplePostings } from "@/lib/examples";

export type ExtractMode = "url" | "text";

// Two input modes sharing one submit. The parent owns the extraction request
// (useObject) and passes `busy`; this component just collects the input.
export function JobInput({
    busy,
    onExtract,
}: {
    busy: boolean;
    onExtract: (mode: ExtractMode, value: string) => void;
}) {
    const [mode, setMode] = useState<ExtractMode>("text");
    const [url, setUrl] = useState("");
    const [text, setText] = useState("");

    const value = mode === "url" ? url : text;
    const canSubmit = value.trim().length > 0 && !busy;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        onExtract(mode, value.trim());
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {/* Mode toggle */}
            <div className="inline-flex rounded-lg border border-gray-700 p-1">
                {(["text", "url"] as const).map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                            mode === m
                                ? "bg-blue-500 text-white"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        {m === "text" ? "Paste text" : "From URL"}
                    </button>
                ))}
            </div>

            {mode === "url" ? (
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://company.com/careers/senior-engineer"
                    className="w-full rounded-lg border border-gray-700 bg-transparent px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
            ) : (
                <>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste the full job posting here..."
                        rows={10}
                        className="w-full resize-y rounded-lg border border-gray-700 bg-transparent px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-500">
                            Or try an example:
                        </span>
                        {examplePostings.map((ex) => (
                            <button
                                key={ex.id}
                                type="button"
                                onClick={() => setText(ex.text)}
                                disabled={busy}
                                className="rounded-full border border-gray-700 px-3 py-1 text-sm text-gray-300 hover:border-blue-500 hover:text-white disabled:opacity-50"
                            >
                                {ex.label}
                            </button>
                        ))}
                    </div>
                </>
            )}

            <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-blue-500 px-5 py-2 font-medium text-white disabled:opacity-50"
            >
                {busy ? "Extracting…" : "Extract details"}
            </button>
        </form>
    );
}
