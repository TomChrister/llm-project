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
    const variantClasses =
        variant === "primary"
            ? "bg-[var(--bg-accent)] text-[var(--text-on-accent)] hover:bg-[var(--bg-accent-hover)]"
            : "border border-black text-black hover:bg-[var(--bg-surface-hover)]";

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
            className={`cursor-pointer rounded-full border border-black px-4 py-2 text-sm leading-none font-medium text-black hover:bg-[var(--bg-accent)] disabled:cursor-default disabled:opacity-50 ${className}`}
        />
    );
}
