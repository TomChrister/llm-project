import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldClasses =
    "w-full rounded-3xl border border-[var(--border-default)] bg-[var(--bg-input)] px-6 py-4 text-base text-[var(--text-input)] placeholder-[var(--text-input-placeholder)] outline-none focus:border-[var(--border-hover)]";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={fieldClasses} />;
}

export function Textarea({
    rows = 10,
    ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea {...props} rows={rows} className={`${fieldClasses} resize-y`} />
    );
}

export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { label: string; value: T }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <div className="inline-flex gap-1 rounded-xl border border-[var(--border-default)] p-1">
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`cursor-pointer rounded-lg px-4 py-2 text-sm leading-none font-medium ${
                            active
                                ? "bg-[var(--bg-accent)] text-[var(--text-on-accent)]"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
