"use client";

import { useCallback, useState } from "react";
import { useObject } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { JobInput } from "@/components/JobInput";
import { JobDetails } from "@/components/JobDetails";
import { ApplicationChat } from "@/components/ApplicationChat";
import { Sidebar } from "@/components/Sidebar";
import { Hero } from "@/components/Hero";
import { Wordmark } from "@/components/ui/Wordmark";
import { Button } from "@/components/ui/Button";
import { jobPostingSchema } from "@/lib/schema";
import { useSavedJobs, type SavedJob } from "@/lib/storage";

// The route returns errors as JSON ({ error }); useObject surfaces a non-2xx
// response as an Error whose message is the raw body, so parse it back out.
function errorMessage(error: Error | undefined): string | null {
    if (!error) return null;
    try {
        const parsed = JSON.parse(error.message);
        if (parsed && typeof parsed.error === "string") return parsed.error;
    } catch {
        // Not JSON — fall through to a generic message.
    }
    return "Couldn't extract the job details. Please try again.";
}

export default function Home() {
    // Every finished extraction is saved here (with its chat thread) so the
    // sidebar can list history and switch between past jobs. Backed by
    // localStorage via useSyncExternalStore, so the server snapshot is always
    // `[]` (no localStorage during SSR) and React reconciles the real client
    // snapshot after mount without a hydration mismatch.
    const [savedJobs, setSavedJobs] = useSavedJobs();
    const [currentId, setCurrentId] = useState<string | null>(null);
    // Bumped on "New extraction" to remount JobInput with a clean slate.
    const [resetKey, setResetKey] = useState(0);

    const { submit, object, isLoading, error, clear } = useObject({
        api: "/api/extract",
        schema: jobPostingSchema,
        onFinish({ object }) {
            if (!object) return;
            const entry: SavedJob = {
                id: crypto.randomUUID(),
                jobData: object,
                messages: [],
                createdAt: Date.now(),
            };
            setSavedJobs((prev) => [...prev, entry]);
            setCurrentId(entry.id);
        },
    });

    const message = errorMessage(error);
    const currentJob = savedJobs.find((j) => j.id === currentId) ?? null;

    function startOver() {
        setCurrentId(null);
        clear();
        setResetKey((k) => k + 1);
    }

    function selectJob(id: string) {
        setCurrentId(id);
        clear();
    }

    function deleteJob(id: string) {
        setSavedJobs((prev) => prev.filter((j) => j.id !== id));
        if (id === currentId) startOver();
    }

    // Stable across re-renders (as long as currentId itself hasn't changed) so
    // ApplicationChat's persistence effect doesn't re-fire on every unrelated
    // parent render and loop.
    const handleMessagesChange = useCallback(
        (messages: UIMessage[]) => {
            if (!currentId) return;
            setSavedJobs((prev) =>
                prev.map((j) => (j.id === currentId ? { ...j, messages } : j)),
            );
        },
        [currentId, setSavedJobs],
    );

    return (
        <div className="mx-auto flex w-full max-w-[1200px]">
            <Sidebar
                jobs={savedJobs}
                currentId={currentId}
                onSelect={selectJob}
                onNew={startOver}
                onDelete={deleteJob}
            />

            <main
                className={`mx-auto w-full max-w-[768px] flex-1 px-4 pb-16 ${currentJob ? "pt-12" : "pt-0"}`}
            >
                {!currentJob ? (
                    <Hero />
                ) : (
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <Wordmark />
                            <p className="mt-2 text-[var(--text-secondary)]">
                                Paste a job posting URL or its text to extract the
                                details and draft an application.
                            </p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={startOver}>
                            Start over
                        </Button>
                    </div>
                )}

                {/* Input phase — hidden once a job has been extracted. */}
                {!currentJob && (
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[0_1px_3px_rgba(20,24,31,0.06),0_1px_2px_rgba(20,24,31,0.04)]">
                        <JobInput
                            key={resetKey}
                            busy={isLoading}
                            onExtract={(mode, value) => submit({ mode, value })}
                        />
                        {message && (
                            <p className="mt-4 text-[var(--text-danger)]">{message}</p>
                        )}
                    </div>
                )}

                {/* Live-streaming details during extraction. */}
                {!currentJob && object && (
                    <div className="mt-8">
                        <JobDetails job={object} />
                    </div>
                )}

                {/* Chat phase — final details plus the application assistant. */}
                {currentJob && (
                    <div className="mt-8 space-y-8">
                        <JobDetails job={currentJob.jobData} />
                        <ApplicationChat
                            key={currentJob.id}
                            jobId={currentJob.id}
                            jobData={currentJob.jobData}
                            initialMessages={currentJob.messages}
                            onMessagesChange={handleMessagesChange}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
