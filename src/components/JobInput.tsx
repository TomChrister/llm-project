"use client";

import { useState } from "react";
import { examplePostings } from "@/lib/examples";
import { Button, QuickActionButton } from "@/components/ui/Button";
import { Input, SegmentedControl, Textarea } from "@/components/ui/Input";

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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <SegmentedControl
                options={[
                    { label: "Paste text", value: "text" },
                    { label: "From URL", value: "url" },
                ]}
                value={mode}
                onChange={setMode}
            />

            {mode === "url" ? (
                <Input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://company.com/careers/senior-engineer"
                />
            ) : (
                <>
                    <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste the full job posting here..."
                        rows={10}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-[var(--text-tertiary)]">
                            Or try an example:
                        </span>
                        {examplePostings.map((ex) => (
                            <QuickActionButton
                                key={ex.id}
                                onClick={() => setText(ex.text)}
                                disabled={busy}
                            >
                                {ex.label}
                            </QuickActionButton>
                        ))}
                        {text.length > 0 && (
                            <QuickActionButton onClick={() => setText("")} disabled={busy}>
                                Clear
                            </QuickActionButton>
                        )}
                    </div>
                </>
            )}

            <div>
                <Button type="submit" disabled={!canSubmit}>
                    {busy ? "Extracting…" : "Extract details"}
                </Button>
            </div>
        </form>
    );
}
