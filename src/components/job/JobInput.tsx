import { useState } from "react";
import { examplePostings } from "@/lib/examples";
import { normalizeUrlInput } from "@shared/url";
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
    // URL is the default mode: a link is how a posting is usually at hand,
    // and pasting the whole advert is the fallback for the ones we cannot
    // fetch.
    const [mode, setMode] = useState<ExtractMode>("url");
    const [url, setUrl] = useState("");
    const [text, setText] = useState("");

    const value = mode === "url" ? url : text;
    const canSubmit = value.trim().length > 0 && !busy;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        // URLs get a scheme added here rather than server-side only, so the
        // value the parent keeps for the "source" link is a usable absolute URL.
        onExtract(
            mode,
            mode === "url" ? normalizeUrlInput(value) : value.trim(),
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <SegmentedControl
                options={[
                    { label: "Fra URL", value: "url" },
                    { label: "Lim inn tekst", value: "text" },
                ]}
                value={mode}
                onChange={setMode}
            />

            {mode === "url" ? (
                // Deliberately not type="url": that hands the browser native
                // constraint validation, which silently refuses to submit the
                // form for anything without a scheme ("www.finn.no/...") — no
                // submit event, no request, no error, nothing. inputMode keeps
                // the URL keyboard on mobile without that behaviour.
                <Input
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://company.com/careers/senior-engineer"
                />
            ) : (
                <>
                    <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Lim inn hele stillingsannonsen her..."
                        rows={10}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-[var(--text-tertiary)]">
                            Eller prøv et eksempel:
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
                                Fjern
                            </QuickActionButton>
                        )}
                    </div>
                </>
            )}

            <div>
                <Button type="submit" disabled={!canSubmit}>
                    {busy ? "Henter ut…" : "Hent ut detaljer"}
                </Button>
            </div>
        </form>
    );
}
