"use client";

import type { JobPosting } from "@/lib/schema";

// streamObject fills fields progressively, so every field here is optional and
// arrays may briefly contain undefined items mid-stream — hence the guards.
type PartialJob = {
    [K in keyof JobPosting]?: JobPosting[K] extends (infer T)[]
        ? (T | undefined)[]
        : JobPosting[K];
};

function TagList({
    label,
    items,
    tone,
}: {
    label: string;
    items?: (string | undefined)[];
    tone: "required" | "nice";
}) {
    const values = items?.filter((v): v is string => Boolean(v)) ?? [];
    if (values.length === 0) return null;
    const chip =
        tone === "required"
            ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
            : "bg-gray-500/15 text-gray-300 border-gray-500/30";
    return (
        <div>
            <h3 className="mb-2 text-sm font-medium text-gray-400">{label}</h3>
            <ul className="flex flex-wrap gap-2">
                {values.map((v, i) => (
                    <li
                        key={i}
                        className={`rounded-full border px-3 py-1 text-sm ${chip}`}
                    >
                        {v}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Meta({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
        <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
                {label}
            </dt>
            <dd className="mt-0.5 text-white">{value}</dd>
        </div>
    );
}

export function JobDetails({ job }: { job: PartialJob }) {
    const responsibilities =
        job.responsibilities?.filter((v): v is string => Boolean(v)) ?? [];

    return (
        <section className="space-y-6 rounded-xl border border-gray-700 bg-white/[0.02] p-6">
            <header>
                <h2 className="text-2xl font-semibold text-white">
                    {job.title ?? "…"}
                </h2>
                {job.company && (
                    <p className="mt-1 text-gray-400">{job.company}</p>
                )}
            </header>

            {(job.location || job.employmentType || job.seniority) && (
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Meta label="Location" value={job.location} />
                    <Meta label="Type" value={job.employmentType} />
                    <Meta label="Seniority" value={job.seniority} />
                </dl>
            )}

            <TagList
                label="Required skills"
                items={job.requiredSkills}
                tone="required"
            />
            <TagList
                label="Nice to have"
                items={job.niceToHaveSkills}
                tone="nice"
            />

            {responsibilities.length > 0 && (
                <div>
                    <h3 className="mb-2 text-sm font-medium text-gray-400">
                        Responsibilities
                    </h3>
                    <ul className="space-y-1.5 text-gray-200">
                        {responsibilities.map((r, i) => (
                            <li key={i} className="flex gap-2">
                                <span className="mt-1 text-blue-400">•</span>
                                <span>{r}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
