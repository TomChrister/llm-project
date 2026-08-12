"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PdfUploader } from "@/components/PdfUploader";
import { DocumentQA } from "@/components/DocumentQA";
import type { ActiveCitation } from "@/components/PdfViewer";

// pdf.js touches the DOM, so the viewer must be client-only (no SSR).
const PdfViewer = dynamic(
  () => import("@/components/PdfViewer").then((m) => m.PdfViewer),
  { ssr: false, loading: () => <p className="p-4 text-gray-500">Loading viewer…</p> },
);

export default function Home() {
  const [document, setDocument] = useState<{
    docId: string;
    filename: string;
    pages: number;
    chunks: number;
    file: File;
  } | null>(null);
  const [active, setActive] = useState<ActiveCitation | null>(null);

  if (!document) {
    return (
        <main className="max-w-2xl mx-auto mt-20 px-4">
          <PdfUploader onUploadedAction={(result) => setDocument(result)} />
        </main>
    );
  }

  return (
      <main className="mx-auto mt-8 max-w-6xl px-4">
        <p className="mb-4 text-sm text-white">
          File uploaded: {document.filename} ({document.pages} pages, {document.chunks} chunks indexed)
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <PdfViewer file={document.file} active={active} />
          <DocumentQA
            docId={document.docId}
            onCite={(quote, page) => setActive({ quote, page })}
          />
        </div>
      </main>
  );
}
