"use client";

import { Button } from "@/components/ui/Button";
import type { SavedJob } from "@/lib/storage";

export function Sidebar({
    jobs,
    currentId,
    onSelect,
    onNew,
    onDelete,
    open,
    onClose,
}: {
    jobs: SavedJob[];
    currentId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
    // Drawer visibility on mobile — ignored at the md breakpoint and up,
    // where the sidebar is always a static column.
    open: boolean;
    onClose: () => void;
}) {
    return (
        <>
            {/* Backdrop — mobile only, closes the drawer on tap-outside. */}
            <div
                onClick={onClose}
                aria-hidden="true"
                className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 md:hidden ${
                    open ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
            />

            <div
                className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-4 overflow-y-auto border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-xl transition-transform duration-200 md:static md:z-auto md:w-60 md:shrink-0 md:translate-x-0 md:overflow-visible md:bg-transparent md:py-6 md:pr-4 md:pl-0 md:shadow-none ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex items-center justify-between gap-2 md:hidden">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                        Meny
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Lukk meny"
                        className="cursor-pointer rounded-md px-2 py-1 text-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                        ×
                    </button>
                </div>

                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                        onNew();
                        onClose();
                    }}
                >
                    Ny uthenting
                </Button>
                <div className="flex flex-col gap-0.5">
                    <div className="mb-2 px-2 text-xs tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] uppercase">
                        Historikk
                    </div>
                    {jobs.length === 0 && (
                        <div className="px-2 text-sm text-[var(--text-tertiary)]">
                            Ingen lagrede stillinger ennå.
                        </div>
                    )}
                    {jobs
                        .slice()
                        .reverse()
                        .map((job) => (
                            <div
                                key={job.id}
                                onClick={() => {
                                    onSelect(job.id);
                                    onClose();
                                }}
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
                                    title="Fjern"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(job.id);
                                    }}
                                    className="shrink-0 cursor-pointer px-1 py-0.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-danger)]"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                </div>
            </div>
        </>
    );
}
