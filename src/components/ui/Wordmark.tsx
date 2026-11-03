export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
    return (
        // A container, so the one-word headline can scale to the column's
        // width instead of overflowing it on narrow screens.
        <div className="w-full @container">
            <p className="mb-6 text-sm font-medium tracking-[var(--tracking-wide)] text-[var(--text-primary)]">
                AI-DREVET
            </p>
            {/* Expanded heavy display face, used once per view: huge in the
                hero, scaled down above an extracted job. */}
            <h1
                className={`m-0 font-display font-extrabold tracking-[-0.02em] text-[var(--text-primary)] uppercase [font-stretch:125%] ${
                    size === "lg"
                        ? "text-[min(5.6cqw,56px)] leading-[0.85]"
                        : "text-[min(5.6cqw,28px)] leading-[0.9]"
                }`}
            >
                Jobbsøknadsassistent
            </h1>
        </div>
    );
}
