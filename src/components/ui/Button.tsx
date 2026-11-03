import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary";
    size?: "sm" | "md";
};

export function Button({
    variant = "primary",
    size = "md",
    className = "",
    ...props
}: ButtonProps) {
    const sizeClasses =
        size === "sm" ? "px-4 py-2 text-sm" : "px-4 py-3 text-base";
    // A half-transparent lime turns olive on the dark canvas, so a disabled
    // primary drops to the neutral surface instead of fading.
    const variantClasses =
        variant === "primary"
            ? "bg-[var(--bg-accent)] text-[var(--text-on-accent)] hover:bg-[var(--bg-accent-hover)] disabled:bg-[var(--bg-surface-hover)] disabled:text-[var(--text-tertiary)] disabled:opacity-100"
            : "border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]";

    return (
        <button
            {...props}
            className={`shrink-0 cursor-pointer rounded-lg leading-none font-medium whitespace-nowrap disabled:cursor-default disabled:opacity-50 ${sizeClasses} ${variantClasses} ${className}`}
        />
    );
}

export function QuickActionButton({
    className = "",
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            {...props}
            className={`cursor-pointer rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm leading-none font-medium text-[var(--text-primary)] hover:border-[var(--bg-accent)] hover:bg-[var(--bg-accent)] hover:text-[var(--text-on-accent)] disabled:cursor-default disabled:opacity-50 ${className}`}
        />
    );
}
