import type { Metadata } from "next";
import { Archivo, Newsreader, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const archivo = Archivo({
    variable: "--font-archivo",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
    variable: "--font-newsreader",
    subsets: ["latin"],
    style: ["italic", "normal"],
    weight: ["400", "500"],
});

const plexMono = IBM_Plex_Mono({
    variable: "--font-plex-mono",
    subsets: ["latin"],
    weight: ["400", "500"],
});

export const metadata: Metadata = {
    title: "Jobbsøknadsassistent",
    description:
        "Hent ut stillingsdetaljer og skriv en søknad fra en URL eller tekst.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
      <html
          lang="no"
          className={`${archivo.variable} ${newsreader.variable} ${plexMono.variable} h-full antialiased`}
      >
      <body className="min-h-full flex flex-col">
      {children}
      <Analytics/>
      </body>
      </html>
  );
}
