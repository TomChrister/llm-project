import type { SavedJob } from "@/lib/storage";

export function Sidebar({
    jobs,
    currentId,
    onSelect,
    onDelete,
    open,
    onClose,
}: {
    jobs: SavedJob[];
    currentId: string | null;
    onSelect: (id: string) => void;
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
                className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-200 md:hidden ${
                    open ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
            />

            <div
                className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-4 overflow-y-auto border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 transition-transform duration-200 md:static md:z-auto md:w-60 md:shrink-0 md:translate-x-0 md:overflow-visible md:bg-transparent md:pt-0 md:pb-6 md:pr-4 md:pl-0 md:shadow-none ${
                    open ? "translate-x-0 shadow-xl" : "-translate-x-full"
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

                <div className="flex flex-col gap-0.5">
                    <div className="mb-2 px-3 text-xs font-medium tracking-[var(--tracking-wide)] text-[var(--text-secondary)] uppercase">
                        Påbegynte søknadsbrev
                    </div>
                    {jobs.length === 0 && (
                        <div className="px-3 text-sm text-[var(--text-secondary)]">
                            Ingen påbegynte søknadsbrev ennå.
                        </div>
                    )}
                    {jobs
                        .slice()
                        .reverse()
                        .map((job) => (
                            <div
                                key={job.id}
                                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${
                                    job.id === currentId
                                        ? "bg-[var(--bg-surface-hover)]"
                                        : "hover:bg-[var(--bg-surface-hover)]"
                                }`}
                            >
                                {/* A real button, so the letter can be opened
                                    with Tab + Enter, not only with a mouse. */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSelect(job.id);
                                        onClose();
                                    }}
                                    aria-current={job.id === currentId ? "true" : undefined}
                                    className="min-w-0 flex-1 cursor-pointer text-left"
                                >
                                    <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
                                        {job.jobData.title}
                                    </span>
                                    {job.jobData.company && (
                                        <span className="block truncate text-xs text-[var(--text-secondary)]">
                                            {job.jobData.company}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    title="Fjern"
                                    onClick={() => onDelete(job.id)}
                                    className="shrink-0 cursor-pointer px-1 py-0.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-danger)]"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
                                </button>
                            </div>
                        ))}
                </div>
            </div>
        </>
    );
}
