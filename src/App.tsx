import { useCallback, useState } from "react";
import type { UIMessage } from "ai";
import { JobInput } from "@/components/job/JobInput";
import { JobDetails } from "@/components/job/JobDetails";
import { ApplicationChat } from "@/components/chat/ApplicationChat";
import { Sidebar } from "@/components/layout/Sidebar";
import { Hero } from "@/components/layout/Hero";
import { Header } from "@/components/layout/Header";
import { useJobExtraction } from "@/hooks/useJobExtraction";
import { useView, type View } from "@/hooks/useView";
import { useSavedJobs, type SavedJob } from "@/lib/storage";
import type { JobPosting } from "@shared/schema";

export function App() {
    // Every finished extraction is saved here (with its chat thread) and
    // listed on the letters page. Backed by localStorage via
    // useSyncExternalStore.
    const [savedJobs, setSavedJobs] = useSavedJobs();
    const [view, navigate] = useView();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Bumped when returning home to remount JobInput with a clean slate.
    const [resetKey, setResetKey] = useState(0);
    // The letters list renders as a slide-in drawer below the md breakpoint.
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // A finished extraction becomes a new letter: save it and open it.
    const handleExtracted = useCallback(
        (jobData: JobPosting, sourceUrl?: string) => {
            const entry: SavedJob = {
                id: crypto.randomUUID(),
                jobData,
                sourceUrl,
                messages: [],
                createdAt: Date.now(),
            };
            setSavedJobs((prev) => [...prev, entry]);
            setSelectedId(entry.id);
            navigate("letters");
        },
        [setSavedJobs, navigate],
    );

    const extraction = useJobExtraction(handleExtracted);

    // Falls back to the most recent letter, so the page is never blank while
    // there is something to show.
    const currentJob =
        savedJobs.find((j) => j.id === selectedId) ?? savedJobs.at(-1) ?? null;
    const currentId = currentJob?.id ?? null;

    function goTo(next: View) {
        // Home always opens on an empty form, unless an extraction is still
        // running, which keeps streaming in where it was left.
        if (next === "home" && !extraction.isLoading) {
            extraction.reset();
            setResetKey((k) => k + 1);
        }
        setSidebarOpen(false);
        navigate(next);
    }

    function deleteJob(id: string) {
        setSavedJobs((prev) => prev.filter((j) => j.id !== id));
        if (id === selectedId) setSelectedId(null);
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

    const menuButton = (
        <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Åpne meny"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] md:hidden"
        >
            <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-4 w-4"
            >
                <path strokeLinecap="round" d="M3 5h14M3 10h14M3 15h14" />
            </svg>
        </button>
    );

    return (
        <div className="mx-auto w-full max-w-[1248px]">
            <Header
                view={view}
                onNavigate={goTo}
                leading={view === "letters" ? menuButton : undefined}
            />

            {view === "home" ? (
                <main className="mx-auto w-full max-w-[768px] px-4 pb-16">
                    <Hero />

                    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
                        <JobInput
                            key={resetKey}
                            busy={extraction.isLoading}
                            onExtract={extraction.start}
                        />
                        {extraction.message && (
                            <p className="mt-4 text-[var(--text-danger)]">
                                {extraction.message}
                            </p>
                        )}
                    </div>

                    {/* Live-streaming details during extraction. */}
                    {extraction.object && (
                        <div className="mt-10">
                            <JobDetails
                                job={extraction.object}
                                sourceUrl={extraction.pendingUrl ?? undefined}
                            />
                        </div>
                    )}
                </main>
            ) : (
                <div className="flex">
                    <Sidebar
                        jobs={savedJobs}
                        currentId={currentId}
                        onSelect={setSelectedId}
                        onDelete={deleteJob}
                        open={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                    />

                    <main className="mx-auto w-full max-w-[768px] min-w-0 flex-1 px-4 pb-16">
                        {currentJob ? (
                            <div className="space-y-10">
                                <JobDetails
                                    job={currentJob.jobData}
                                    sourceUrl={currentJob.sourceUrl}
                                />
                                <ApplicationChat
                                    key={currentJob.id}
                                    jobId={currentJob.id}
                                    jobData={currentJob.jobData}
                                    initialMessages={currentJob.messages}
                                    onMessagesChange={handleMessagesChange}
                                />
                            </div>
                        ) : (
                            <p className="pt-10 text-center text-[var(--text-secondary)]">
                                Ingen påbegynte søknadsbrev ennå. Hent ut en
                                stilling fra Hjem for å starte et.
                            </p>
                        )}
                    </main>

                    {/* Mirrors the sidebar's width so `main` is centred on the
                        page itself rather than on the space left over beside
                        the sidebar. Hidden below md, where the sidebar is a
                        fixed drawer and out of flow anyway. */}
                    <div aria-hidden="true" className="hidden w-60 shrink-0 md:block" />
                </div>
            )}
        </div>
    );
}
