"use client";

import { useState, useRef } from "react";

type UploadResult = {
    docId: string;
    filename: string;
    pages: number;
    chunks: number;
    file: File;
};

export function PdfUploader({
    onUploadedAction,
}: {
    onUploadedAction: (result: UploadResult) => void;
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    async function handleFile(file: File) {
        setError(null);
        setIsLoading(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? "Something went wrong");
                return;
            }

            onUploadedAction({ ...data, file });
        } catch {
            setError("Could not connect to server");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                }}
            />

            {isLoading ? (
                <p>Reading file...</p>
            ) : (
                <p>Drop and drag a PDF file here, or upload it</p>
            )}

            {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
    );
}