import { Wordmark } from "@/components/ui/Wordmark";

// The cyan-to-lime aurora sits behind the existing hero copy only; it is the
// one place the gradient is used.
export function Hero() {
    return (
        <div className="relative isolate flex flex-col items-center gap-4 px-4 pt-16 pb-16 text-center">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-[-25%] inset-y-[-10%] -z-10 bg-[image:var(--gradient-hero)] opacity-70 blur-2xl"
            />
            <Wordmark size="lg" />
            <p className="m-0 max-w-[600px] text-xl leading-snug text-[var(--text-primary)]">
                Lim inn en stillingsannonse, eller en URL, og få rollen, ferdighetene og ansvarsområdene
                hentet ut umiddelbart, pluss AI-hjelp
                til å skrive et søknadsbrev tilpasset stillingen.
            </p>
            <p className="m-0 max-w-[600px] text-sm text-[var(--text-primary)]/70">
                Annonser på engelsk fungerer også, da kommer både detaljene og
                søknadsbrevet tilbake på engelsk.
            </p>
        </div>
    );
}
