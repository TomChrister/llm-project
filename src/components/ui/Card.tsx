import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
    return (
        <section className="flex flex-col gap-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            {children}
        </section>
    );
}
