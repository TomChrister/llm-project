import type { Metadata } from "next";
import type { ReactNode } from "react";

// Self-hosted variable fonts: Inter for all UI and body text, and Archivo
// (with its width axis) for the expanded display headline. globals.css maps
// them onto Tailwind's font-sans / font-display.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/archivo/wdth.css";

import "./globals.css";

export const metadata: Metadata = {
    title: "Jobbsøknadsassistent",
    description:
        "Hent ut stillingsdetaljer og skriv en søknad fra en URL eller tekst.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="no">
            <body>
                <div id="root">{children}</div>
            </body>
        </html>
    );
}
