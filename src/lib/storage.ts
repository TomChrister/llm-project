// Client-side persistence for job extraction history. Each saved job pairs
// the extracted data with its application chat thread, so switching between
// history entries restores the whole conversation, not just the job card.
//
// Exposed as a useSyncExternalStore-backed hook (not plain useState +
// useEffect) so the initial read is hydration-safe: SSR has no localStorage,
// so the server snapshot is always `[]`, and React reconciles the real
// client snapshot after mount without a hydration mismatch.
import { useCallback, useSyncExternalStore } from "react";
import type { UIMessage } from "ai";
import type { JobPosting } from "@/lib/schema";

export type SavedJob = {
    id: string;
    jobData: JobPosting;
    messages: UIMessage[];
    createdAt: number;
};

const STORAGE_KEY = "jaa-saved-jobs-v1";

let cache: SavedJob[] = [];
let cachedRaw: string | null | undefined = undefined;
const listeners = new Set<() => void>();

function readStorage(): SavedJob[] {
    if (typeof window === "undefined") return [];
    let raw: string | null;
    try {
        raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
        raw = null;
    }
    if (raw === cachedRaw) return cache; // stable reference when unchanged
    cachedRaw = raw;
    try {
        cache = raw ? (JSON.parse(raw) as SavedJob[]) : [];
    } catch {
        cache = [];
    }
    return cache;
}

function writeStorage(jobs: SavedJob[]) {
    cache = jobs;
    cachedRaw = JSON.stringify(jobs);
    try {
        window.localStorage.setItem(STORAGE_KEY, cachedRaw);
    } catch {
        // Private browsing / quota errors: history just won't persist this run.
    }
    listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

const EMPTY_JOBS: SavedJob[] = [];

function getServerSnapshot(): SavedJob[] {
    return EMPTY_JOBS;
}

export function useSavedJobs(): [
    SavedJob[],
    (updater: SavedJob[] | ((prev: SavedJob[]) => SavedJob[])) => void,
] {
    const jobs = useSyncExternalStore(subscribe, readStorage, getServerSnapshot);

    const setJobs = useCallback(
        (updater: SavedJob[] | ((prev: SavedJob[]) => SavedJob[])) => {
            const next =
                typeof updater === "function"
                    ? (updater as (prev: SavedJob[]) => SavedJob[])(readStorage())
                    : updater;
            writeStorage(next);
        },
        [],
    );

    return [jobs, setJobs];
}
