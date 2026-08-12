"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Self-hosted worker (copied into /public) — robust under Next + Turbopack and
// works offline. Keep in sync with pdfjs-dist on upgrade.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export type ActiveCitation = { quote: string; page: number | null };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export function PdfViewer({
    file,
    active,
}: {
    file: File;
    active: ActiveCitation | null;
}) {
    const [numPages, setNumPages] = useState(0);
    const [width, setWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Render pages at the container's width, responsively.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => setWidth(el.clientWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Scroll to the cited page whenever a citation is activated.
    useEffect(() => {
        if (!active?.page) return;
        pageRefs.current[active.page - 1]?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }, [active]);

    // Highlight text items that belong to the active quote. Runs per text item;
    // depends on the active quote so react-pdf refreshes the text layer on change.
    const textRenderer = useCallback(
        ({ str }: { str: string }) => {
            const quote = active?.quote ? norm(active.quote) : "";
            const item = norm(str);
            const hit =
                quote.length >= 3 &&
                item.length >= 3 &&
                (quote.includes(item) || item.includes(quote));
            return hit
                ? `<mark class="pdf-hl">${escapeHtml(str)}</mark>`
                : escapeHtml(str);
        },
        [active],
    );

    return (
        <div ref={containerRef} className="h-[70vh] overflow-y-auto rounded-lg border border-gray-300 bg-gray-100">
            <Document
                file={file}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={<p className="p-4 text-gray-500">Loading PDF…</p>}
                error={<p className="p-4 text-red-600">Could not display PDF.</p>}
            >
                {Array.from({ length: numPages }, (_, i) => (
                    <div
                        key={i}
                        ref={(el) => {
                            pageRefs.current[i] = el;
                        }}
                        className="flex justify-center border-b border-gray-300 py-2"
                    >
                        <Page
                            pageNumber={i + 1}
                            width={width || undefined}
                            customTextRenderer={textRenderer}
                        />
                    </div>
                ))}
            </Document>
        </div>
    );
}
