"use client";

// The one client boundary: everything imported from here runs in the browser.
import dynamic from "next/dynamic";
import { Analytics } from "@vercel/analytics/react";

// Not rendered on the server. The app is built from the URL hash and
// localStorage, which the server never sees, so server HTML would always be
// the empty home page and flash before the real view replaced it.
const App = dynamic(() => import("@/App").then((m) => m.App), { ssr: false });

if (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("noanalytics")
) {
    localStorage.setItem("va-disable", "1");
}

export function ClientApp() {
    return (
        <>
            <App />
            <Analytics
                beforeSend={(event) => {
                    if (localStorage.getItem("va-disable")) return null;
                    return event;
                }}
            />
        </>
    );
}
