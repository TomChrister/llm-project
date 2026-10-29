import { useCallback, useEffect, useRef, useState } from "react";
import { useObject } from "@ai-sdk/react";
import { jobPostingSchema, NOT_A_JOB_TITLE, type JobPosting } from "@shared/schema";
import type { ExtractMode } from "@/components/job/JobInput";

// The route returns errors as JSON ({ error }); useObject surfaces a non-2xx
// response as an Error whose message is the raw body, so parse it back out.
function errorMessage(error: Error | undefined): string | null {
    if (!error) return null;
    try {
        const parsed = JSON.parse(error.message);
        if (parsed && typeof parsed.error === "string") return parsed.error;
    } catch {
        // Not JSON — fall through to a generic message.
    }
    return "Klarte ikke å hente ut stillingsdetaljene. Prøv igjen.";
}

/**
 * Owns one streaming extraction: the request, the partial object arriving from
 * the model, and the URL it was started from.
 *
 * `onExtracted` fires once the object is complete. It is held in a ref because
 * useObject's onFinish is called from inside the hook and would otherwise close
 * over the callback from the render that started the request.
 */
export function useJobExtraction(
    onExtracted: (jobData: JobPosting, sourceUrl?: string) => void,
) {
    // The URL the running extraction was started from (null when the posting
    // was pasted as text), so the job card can link back to the original ad.
    const [pendingUrl, setPendingUrl] = useState<string | null>(null);
    const pendingUrlRef = useRef<string | null>(null);

    const onExtractedRef = useRef(onExtracted);
    useEffect(() => {
        onExtractedRef.current = onExtracted;
    }, [onExtracted]);

    // useObject's `error` only covers a failed request. A stream that broke off
    // mid-way, or ended in an object that fails the schema, reaches onFinish
    // with no object instead, and would otherwise leave a half-filled card
    // with no explanation. Text the model judged not to be a posting ends here
    // too, rather than being saved and given a cover letter.
    const [finishError, setFinishError] = useState<string | null>(null);

    const { submit, object, isLoading, error, clear } = useObject({
        api: "/api/extract",
        schema: jobPostingSchema,
        onFinish({ object }) {
            if (!object) {
                setFinishError("Uthentingen stoppet før den var ferdig. Prøv igjen.");
                return;
            }
            if (object.title === NOT_A_JOB_TITLE) {
                clear();
                setFinishError("Det ser ikke ut som en stillingsannonse.");
                return;
            }
            onExtractedRef.current(object, pendingUrlRef.current ?? undefined);
        },
    });

    const start = useCallback(
        (mode: ExtractMode, value: string) => {
            const url = mode === "url" ? value : null;
            pendingUrlRef.current = url;
            setPendingUrl(url);
            setFinishError(null);
            submit({ mode, value });
        },
        [submit],
    );

    const reset = useCallback(() => {
        pendingUrlRef.current = null;
        setPendingUrl(null);
        setFinishError(null);
        clear();
    }, [clear]);

    return {
        /** Partial job data streaming in, or undefined before/after a run. */
        object,
        isLoading,
        /** A user-facing error message, or null. */
        message: finishError ?? errorMessage(error),
        pendingUrl,
        start,
        reset,
    };
}
