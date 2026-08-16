export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
    return (
        <h1
            className={`m-0 font-display font-medium text-[var(--text-primary)] italic ${
                size === "lg" ? "text-[36px]" : "text-[28px]"
            }`}
        >
            Job Application Assistant
        </h1>
    );
}
