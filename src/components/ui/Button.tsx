import type { ButtonHTMLAttributes } from "react";

export function Button({
    className = "",
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        // A half-transparent lime turns olive on the dark canvas, so a
        // disabled button drops to the neutral surface instead of fading.
        <button
            {...props}
            className={`shrink-0 cursor-pointer rounded-lg bg-[var(--bg-accent)] px-4 py-3 text-base leading-none font-medium whitespace-nowrap text-[var(--text-on-accent)] hover:bg-[var(--bg-accent-hover)] disabled:cursor-default disabled:bg-[var(--bg-surface-hover)] disabled:text-[var(--text-tertiary)] ${className}`}
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
