import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobInput } from "@/components/job/JobInput";

function setup(busy = false) {
    const onExtract = vi.fn();
    render(<JobInput busy={busy} onExtract={onExtract} />);
    return { user: userEvent.setup(), onExtract };
}

const urlField = () =>
    screen.getByPlaceholderText<HTMLInputElement>("https://company.com/careers/senior-engineer");
const textField = () =>
    screen.getByPlaceholderText<HTMLTextAreaElement>("Lim inn hele stillingsannonsen her...");
const submitButton = () => screen.getByRole("button", { name: "Hent ut detaljer" });

describe("JobInput", () => {
    it("disables submit until text is entered, then submits the trimmed value", async () => {
        const { user, onExtract } = setup();

        await user.click(screen.getByText("Lim inn tekst"));
        expect(submitButton()).toBeDisabled();

        await user.type(textField(), "  Some job text  ");
        expect(submitButton()).toBeEnabled();

        await user.click(submitButton());
        expect(onExtract).toHaveBeenCalledWith("text", "Some job text");
    });

    it("starts in URL mode and submits the URL value", async () => {
        const { user, onExtract } = setup();

        await user.type(urlField(), "https://example.com/job");
        await user.click(submitButton());

        expect(onExtract).toHaveBeenCalledWith("url", "https://example.com/job");
    });

    // Regression: the field used to be type="url", so the browser's native
    // constraint validation silently swallowed the submit for any address
    // pasted without a scheme — no request, no error, nothing on screen.
    // (jsdom does not run constraint validation, so this asserts the two
    // things that actually made it silent: a non-validating input type, and a
    // scheme added before submit.)
    it("accepts a URL pasted without a scheme and submits it with https", async () => {
        const { user, onExtract } = setup();

        expect(urlField().type).not.toBe("url");

        await user.type(urlField(), "  www.finn.no/job/fulltime/ad.html?finnkode=1  ");
        await user.click(submitButton());

        expect(onExtract).toHaveBeenCalledWith(
            "url",
            "https://www.finn.no/job/fulltime/ad.html?finnkode=1",
        );
    });

    it("fills the textarea from an example posting", async () => {
        const { user } = setup();

        await user.click(screen.getByText("Lim inn tekst"));
        await user.click(screen.getByText("Frontend-utvikler"));

        expect(textField().value).toContain("Frontend-utvikler — Northwind Labs");
    });

    it("shows a busy label and disables the submit button while busy", () => {
        setup(true);

        expect(screen.getByRole("button", { name: "Henter ut…" })).toBeDisabled();
    });
});
