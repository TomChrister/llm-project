import { Wordmark } from "@/components/ui/Wordmark";

export function Hero() {
    return (
        <div className="flex flex-col items-center gap-4 px-4 pt-16 pb-10 text-center">
            <Wordmark size="lg" />
            <p className="m-0 max-w-[520px] text-base leading-relaxed text-[var(--text-secondary)]">
                Paste a job posting — or its URL — and get the role, skills, and
                responsibilities pulled out instantly, plus AI help drafting a cover
                letter tailored to it.
            </p>
        </div>
    );
}
