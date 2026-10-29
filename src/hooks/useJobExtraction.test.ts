import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NOT_A_JOB_TITLE } from "@shared/schema";
import { useJobExtraction } from "./useJobExtraction";

// The route streams the object as plain JSON text, so a canned body is all
// useObject needs.
function stubExtract(body: string) {
    vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response(body))),
    );
}

const JOB = {
    title: "Frontend-utvikler",
    company: "Acme",
    requiredSkills: ["React"],
    niceToHaveSkills: [],
    responsibilities: ["Bygge UI"],
};

function setup() {
    const onExtracted = vi.fn();
    const { result } = renderHook(() => useJobExtraction(onExtracted));
    return { onExtracted, result };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("useJobExtraction", () => {
    it("hands a complete posting to onExtracted", async () => {
        stubExtract(JSON.stringify(JOB));
        const { onExtracted, result } = setup();

        act(() => result.current.start("url", "https://example.com/jobb"));

        await waitFor(() => expect(onExtracted).toHaveBeenCalledTimes(1));
        expect(onExtracted).toHaveBeenCalledWith(JOB, "https://example.com/jobb");
        expect(result.current.message).toBeNull();
    });

    it("explains a stream that broke off before the object was complete", async () => {
        // Cut off mid-object: the partial parse has a title but no arrays, so
        // it fails the schema when the stream closes.
        stubExtract('{"title":"Frontend-utvikler","requiredSkills":["Rea');
        const { onExtracted, result } = setup();

        act(() => result.current.start("text", "en lang nok annonsetekst"));

        await waitFor(() => expect(result.current.message).toMatch(/stoppet/));
        expect(onExtracted).not.toHaveBeenCalled();
    });

    it("refuses text the model judged not to be a job posting", async () => {
        stubExtract(
            JSON.stringify({
                title: NOT_A_JOB_TITLE,
                requiredSkills: [],
                niceToHaveSkills: [],
                responsibilities: [],
            }),
        );
        const { onExtracted, result } = setup();

        act(() => result.current.start("text", "en nyhetsartikkel om været"));

        await waitFor(() =>
            expect(result.current.message).toBe("Det ser ikke ut som en stillingsannonse."),
        );
        expect(onExtracted).not.toHaveBeenCalled();
        expect(result.current.object).toBeUndefined();
    });

    it("clears the finish error when a new extraction starts", async () => {
        stubExtract('{"title":"Fr');
        const { result } = setup();
        act(() => result.current.start("text", "første forsøk"));
        await waitFor(() => expect(result.current.message).not.toBeNull());

        stubExtract(JSON.stringify(JOB));
        act(() => result.current.start("text", "andre forsøk"));

        expect(result.current.message).toBeNull();
    });
});
