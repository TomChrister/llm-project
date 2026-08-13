"use client";

import { useState } from "react";
import { useObject } from "@ai-sdk/react";
import { JobInput } from "@/components/JobInput";
import { JobDetails } from "@/components/JobDetails";
import { ApplicationChat } from "@/components/ApplicationChat";
import { jobPostingSchema, type JobPosting } from "@/lib/schema";

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
    return "Couldn't extract the job details. Please try again.";
}

export default function Home() {
    // Set once extraction completes; its presence flips us into the chat phase.
    const [jobData, setJobData] = useState<JobPosting | null>(null);
    // Bumped on "Start over" to remount JobInput with a clean slate.
    const [resetKey, setResetKey] = useState(0);

    const { submit, object, isLoading, error, clear } = useObject({
        api: "/api/extract",
        schema: jobPostingSchema,
        onFinish({ object }) {
            if (object) setJobData(object);
        },
    });

    const message = errorMessage(error);

    function startOver() {
        setJobData(null);
        clear();
        setResetKey((k) => k + 1);
    }

    return (
        <main className="mx-auto mt-12 mb-16 w-full max-w-3xl px-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-white">
                        Job Application Assistant
                    </h1>
                    <p className="mt-2 text-gray-400">
                        Paste a job posting URL or its text to extract the
                        details and draft an application.
                    </p>
                </div>
                {jobData && (
                    <button
                        type="button"
                        onClick={startOver}
                        className="shrink-0 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:border-blue-500 hover:text-white"
                    >
                        Start over
                    </button>
                )}
            </div>

            {/* Input phase — hidden once we have a finished extraction. */}
            {!jobData && (
                <div className="mt-6">
                    <JobInput
                        key={resetKey}
                        busy={isLoading}
                        onExtract={(mode, value) => submit({ mode, value })}
                    />
                    {message && <p className="mt-4 text-red-500">{message}</p>}
                </div>
            )}

            {/* Live-streaming details during extraction. */}
            {!jobData && object && (
                <div className="mt-8">
                    <JobDetails job={object} />
                </div>
            )}

            {/* Chat phase — final details plus the application assistant. */}
            {jobData && (
                <div className="mt-8 space-y-8">
                    <JobDetails job={jobData} />
                    <ApplicationChat jobData={jobData} />
                </div>
            )}
        </main>
    );
}
