import { useState } from "react";
import { Wordmark } from "@/components/ui/Wordmark";

// Each blob is a soft cyan or lime ellipse. Centre and radii are a base value
// plus a random spread, so the aurora settles into a different, irregular
// shape on every visit instead of one centred oval. Values are % of the glow
// box, which hangs off the right-hand side of the hero.
const blobs = [
    { color: "122, 243, 255", x: [55, 12], y: [35, 12], rx: [26, 10], ry: [20, 8] },
    { color: "211, 251, 82", x: [72, 10], y: [22, 12], rx: [30, 10], ry: [22, 8] },
    { color: "211, 251, 82", x: [45, 14], y: [72, 12], rx: [22, 8], ry: [26, 8] },
    { color: "122, 243, 255", x: [82, 8], y: [68, 14], rx: [16, 6], ry: [14, 6] },
    { color: "211, 251, 82", x: [92, 6], y: [45, 16], rx: [14, 6], ry: [20, 6] },
] as const;

function spread([base, range]: readonly [number, number]): number {
    return base + (Math.random() - 0.5) * range * 2;
}

function auroraBackground(): string {
    return blobs
        .map(
            (b) =>
                `radial-gradient(${spread(b.rx).toFixed(1)}% ${spread(b.ry).toFixed(1)}% at ${spread(b.x).toFixed(1)}% ${spread(b.y).toFixed(1)}%, rgba(${b.color}, 0.9) 0%, rgba(${b.color}, 0) 100%)`,
        )
        .join(", ");
}

// The aurora sits behind the existing hero copy only; it is the one place the
// gradient is used. The hero deliberately doesn't form its own stacking
// context, so the glow's negative z-index drops it behind the input card
// below instead of tinting it.
export function Hero() {
    // Rolled once per mount, so it doesn't reshuffle on re-renders.
    const [background] = useState(auroraBackground);

    return (
        <div className="relative flex flex-col items-center gap-4 px-4 pt-16 pb-16 text-center">
            <div
                aria-hidden="true"
                style={{ backgroundImage: background }}
                className="pointer-events-none absolute top-[-30%] right-[-45%] -z-10 h-[150%] w-[110%] opacity-75 blur-3xl"
            />
            <Wordmark size="lg" />
            <p className="m-0 max-w-[600px] text-xl leading-snug text-[var(--text-primary)]">
                Lim inn en stillingsannonse, eller en URL, og få rollen, ferdighetene og ansvarsområdene
                hentet ut umiddelbart, pluss AI-hjelp
                til å skrive et søknadsbrev tilpasset stillingen.
            </p>
            <p className="m-0 max-w-[600px] text-sm text-[var(--text-secondary)]">
                Annonser på engelsk fungerer også, da kommer både detaljene og
                søknadsbrevet tilbake på engelsk.
            </p>
        </div>
    );
}
