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
        size === "sm" ? "px-3.5 py-1.5 text-[13px]" : "px-5 py-2 text-sm";
    const variantClasses =
        variant === "primary"
            ? "bg-[var(--bg-accent)] text-[var(--text-on-accent)] hover:bg-[var(--bg-accent-hover)]"
            : "border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]";

    return (
        <button
            {...props}
            className={`rounded-lg font-medium disabled:cursor-default disabled:opacity-50 ${sizeClasses} ${variantClasses} ${className}`}
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
            className={`rounded-full border border-[var(--border-default)] px-3.5 py-1 text-[13px] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-50 ${className}`}
        />
    );
}
