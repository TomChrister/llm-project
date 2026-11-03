import type { ReactNode } from "react";

export function Chip({
    tone = "nice",
    children,
}: {
    tone?: "required" | "nice";
    children: ReactNode;
}) {
    const toneClasses =
        tone === "required"
            ? "bg-[var(--chip-required-bg)] text-[var(--chip-required-text)] border-[var(--chip-required-border)]"
            : "bg-[var(--chip-nice-bg)] text-[var(--chip-nice-text)] border-[var(--chip-nice-border)]";

    return (
        <span
            className={`inline-block rounded-full border px-4 py-2 text-sm leading-none ${toneClasses}`}
        >
            {children}
        </span>
    );
}

export function MetaField({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
        <div>
            <div className="text-xs tracking-normal text-[var(--text-secondary)]">
                {label}
            </div>
            <div className="mt-1 text-base font-medium text-[var(--text-primary)]">{value}</div>
        </div>
    );
}
