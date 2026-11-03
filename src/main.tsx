import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { App } from "@/App";

// Self-hosted variable fonts: Inter for all UI and body text, and Archivo
// (with its width axis) for the expanded display headline. globals.css maps
// them onto Tailwind's font-sans / font-display.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/archivo/wdth.css";

import "@/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Fant ikke #root i index.html");

createRoot(root).render(
    <StrictMode>
        <App />
        <Analytics />
    </StrictMode>,
);
