import type { ReactNode } from "react";
import type { View } from "@/hooks/useView";

const items: { view: View; label: string }[] = [
    { view: "home", label: "Hjem" },
    { view: "letters", label: "Søknadsbrev" },
];

// Top bar with the two views centred. `leading` holds the mobile menu button
// on the letters view; the empty right column keeps the nav truly centred.
export function Header({
    view,
    onNavigate,
    leading,
}: {
    view: View;
    onNavigate: (view: View) => void;
    leading?: ReactNode;
}) {
    return (
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-6">
            <div className="flex">{leading}</div>
            <nav aria-label="Hovedmeny" className="flex gap-2">
                {items.map((item) => {
                    const active = item.view === view;
                    return (
                        <button
                            key={item.view}
                            type="button"
                            onClick={() => onNavigate(item.view)}
                            aria-current={active ? "page" : undefined}
                            className={`cursor-pointer rounded-lg px-4 py-2 text-sm leading-none font-medium ${
                                active
                                    ? "bg-[var(--bg-accent)] text-[var(--text-on-accent)]"
                                    : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                            }`}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </nav>
            <div />
        </header>
    );
}
