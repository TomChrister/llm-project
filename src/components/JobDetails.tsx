"use client";

import type { JobPosting } from "@/lib/schema";
import { Card } from "@/components/ui/Card";
import { Chip, MetaField } from "@/components/ui/Chip";

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
    return (
        <div>
            <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                {label}
            </h3>
            <div className="flex flex-wrap gap-2">
                {values.map((v, i) => (
                    <Chip key={i} tone={tone}>
                        {v}
                    </Chip>
                ))}
            </div>
        </div>
    );
}

export function JobDetails({ job }: { job: PartialJob }) {
    const responsibilities =
        job.responsibilities?.filter((v): v is string => Boolean(v)) ?? [];

    return (
        <Card>
            <header>
                <h2 className="m-0 font-display text-xl font-medium text-[var(--text-primary)] italic">
                    {job.title ?? "…"}
                </h2>
                {job.company && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {job.company}
                    </p>
                )}
            </header>

            {(job.location || job.employmentType || job.seniority) && (
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <MetaField label="Sted" value={job.location} />
                    <MetaField label="Type" value={job.employmentType} />
                    <MetaField label="Erfaringsnivå" value={job.seniority} />
                </dl>
            )}

            <TagList
                label="Nødvendige ferdigheter"
                items={job.requiredSkills}
                tone="required"
            />
            <TagList
                label="Fint å ha"
                items={job.niceToHaveSkills}
                tone="nice"
            />

            {responsibilities.length > 0 && (
                <div>
                    <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                        Ansvarsområder
                    </h3>
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {responsibilities.map((r, i) => (
                            <li
                                key={i}
                                className="flex gap-2 text-sm text-[var(--text-primary)]"
                            >
                                <span className="mt-0.5 text-[var(--accent-500)]">•</span>
                                <span>{r}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    );
}
