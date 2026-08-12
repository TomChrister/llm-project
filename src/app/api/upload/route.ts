import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { randomUUID } from "crypto";
import { chunkDocument, putDocument } from "@/lib/rag";
import { embedTexts } from "@/lib/voyage";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file received" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "File size cannot be longer than 10MB", }, { status: 400 })
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const parser = new PDFParse({ data: buffer });
        let text: string;
        let pages: number;
        try {
            const data = await parser.getText();
            text = data.text;
            pages = data.total;
        } finally {
            await parser.destroy();
        }

        // Chunk → embed → store in the RAG index, keyed by a generated docId.
        const chunks = chunkDocument(text);
        if (chunks.length === 0) {
            return NextResponse.json(
                { error: "No extractable text found in this PDF" },
                { status: 400 },
            );
        }

        const embeddings = await embedTexts(
            chunks.map((c) => c.text),
            "document",
        );
        const stored = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));

        const docId = randomUUID();
        putDocument(docId, file.name, stored);

        return NextResponse.json({
            docId,
            filename: file.name,
            pages,
            chunks: stored.length,
        });
    } catch (err) {
        console.error("PDF processing error", err);
        return NextResponse.json(
            { error: "Could not process PDF file" },
            { status: 500 },
        );
    }
}
