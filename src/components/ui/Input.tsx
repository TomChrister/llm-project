import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldClasses =
    "w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] outline-none focus:border-[var(--border-hover)]";

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
        <div className="inline-flex gap-0.5 rounded-lg border border-[var(--border-default)] p-1">
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`rounded-md px-4 py-1.5 text-[13px] font-medium ${
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
