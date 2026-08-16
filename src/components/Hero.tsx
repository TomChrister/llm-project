import { Wordmark } from "@/components/ui/Wordmark";

export function Hero() {
    return (
        <div className="flex flex-col items-center gap-4 px-4 pt-16 pb-10 text-center">
            <Wordmark size="lg" />
            <p className="m-0 max-w-[520px] text-base leading-relaxed text-[var(--text-secondary)]">
                Lim inn en stillingsannonse, eller en URL, og få rollen,
                ferdighetene og ansvarsområdene hentet ut umiddelbart, pluss AI-hjelp
                til å skrive et søknadsbrev tilpasset stillingen.
            </p>
        </div>
    );
}
