import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { App } from "@/App";

// Self-hosted equivalents of what next/font/google used to inject: the same
// families, weights and latin subset, resolved to the CSS variables that
// globals.css maps onto Tailwind's font-sans / font-display / font-mono.
import "@fontsource/archivo/latin-400.css";
import "@fontsource/archivo/latin-500.css";
import "@fontsource/archivo/latin-600.css";
import "@fontsource/archivo/latin-700.css";
import "@fontsource/newsreader/latin-400.css";
import "@fontsource/newsreader/latin-500.css";
import "@fontsource/newsreader/latin-400-italic.css";
import "@fontsource/newsreader/latin-500-italic.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";

import "@/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Fant ikke #root i index.html");

createRoot(root).render(
    <StrictMode>
        <App />
        <Analytics />
    </StrictMode>,
);
