import { useCallback, useEffect, useState } from "react";

export type View = "home" | "letters";

const LETTERS_HASH = "#/soknadsbrev";

function readView(): View {
    return window.location.hash === LETTERS_HASH ? "letters" : "home";
}

// The current view, mirrored in the URL hash so a refresh stays on the same
// page and the browser's back button moves between the two.
export function useView(): [View, (view: View) => void] {
    const [view, setView] = useState<View>(readView);

    useEffect(() => {
        const onHashChange = () => setView(readView());
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    const navigate = useCallback((next: View) => {
        const hash = next === "letters" ? LETTERS_HASH : "";
        if (window.location.hash !== hash) {
            // Assigning "" leaves a bare "#" behind, so clear it via history.
            if (hash) window.location.hash = hash;
            else
                window.history.pushState(
                    null,
                    "",
                    window.location.pathname + window.location.search,
                );
        }
        setView(next);
    }, []);

    return [view, navigate];
}
