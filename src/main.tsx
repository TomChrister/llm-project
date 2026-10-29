import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { App } from "@/App";

// Self-hosted fonts, latin subset, only the faces the UI uses: Archivo for
// body text (regular, medium, and bold for the wordmark label) and Newsreader
// medium italic for the display headings. globals.css maps them onto
// Tailwind's font-sans / font-display.
import "@fontsource/archivo/latin-400.css";
import "@fontsource/archivo/latin-500.css";
import "@fontsource/archivo/latin-700.css";
import "@fontsource/newsreader/latin-500-italic.css";

import "@/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Fant ikke #root i index.html");

createRoot(root).render(
    <StrictMode>
        <App />
        <Analytics />
    </StrictMode>,
);
