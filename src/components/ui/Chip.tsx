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
            className={`inline-block rounded-md border px-3.5 py-1 text-[13px] ${toneClasses}`}
        >
            {children}
        </span>
    );
}

export function MetaField({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
        <div>
            <div className="text-[11px] tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] uppercase">
                {label}
            </div>
            <div className="mt-0.5 text-sm text-[var(--text-primary)]">{value}</div>
        </div>
    );
}
