"use client";

import { Button } from "@/components/ui/Button";
import type { SavedJob } from "@/lib/storage";

export function Sidebar({
    jobs,
    currentId,
    onSelect,
    onNew,
    onDelete,
}: {
    jobs: SavedJob[];
    currentId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
}) {
    return (
        <div className="flex w-60 shrink-0 flex-col gap-4 border-r border-[var(--border-subtle)] py-6 pr-4">
            <Button variant="secondary" size="sm" onClick={onNew}>
                New extraction
            </Button>
            <div className="flex flex-col gap-0.5">
                <div className="mb-2 px-2 text-xs tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] uppercase">
                    History
                </div>
                {jobs.length === 0 && (
                    <div className="px-2 text-sm text-[var(--text-tertiary)]">
                        No saved jobs yet.
                    </div>
                )}
                {jobs
                    .slice()
                    .reverse()
                    .map((job) => (
                        <div
                            key={job.id}
                            onClick={() => onSelect(job.id)}
                            className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg p-2 ${
                                job.id === currentId
                                    ? "bg-[var(--bg-surface-hover)]"
                                    : "hover:bg-[var(--bg-surface-hover)]"
                            }`}
                        >
                            <div className="min-w-0">
                                <div className="truncate text-sm text-[var(--text-primary)]">
                                    {job.jobData.title}
                                </div>
                                {job.jobData.company && (
                                    <div className="truncate text-xs text-[var(--text-tertiary)]">
                                        {job.jobData.company}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                title="Remove"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(job.id);
                                }}
                                className="shrink-0 px-1 py-0.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-danger)]"
                            >
                                ×
                            </button>
                        </div>
                    ))}
            </div>
        </div>
    );
}
