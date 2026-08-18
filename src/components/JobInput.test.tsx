import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobInput } from "@/components/JobInput";

describe("JobInput", () => {
    it("disables submit until text is entered, then submits the trimmed value", async () => {
        const user = userEvent.setup();
        const onExtract = vi.fn();

        render(<JobInput busy={false} onExtract={onExtract} />);

        const submit = screen.getByRole("button", { name: "Hent ut detaljer" });
        expect(submit).toBeDisabled();

        await user.type(
            screen.getByPlaceholderText("Lim inn hele stillingsannonsen her..."),
            "  Some job text  ",
        );
        expect(submit).toBeEnabled();

        await user.click(submit);
        expect(onExtract).toHaveBeenCalledWith("text", "Some job text");
    });

    it("switches to URL mode and submits the URL value", async () => {
        const user = userEvent.setup();
        const onExtract = vi.fn();

        render(<JobInput busy={false} onExtract={onExtract} />);

        await user.click(screen.getByText("Fra URL"));
        await user.type(
            screen.getByPlaceholderText("https://company.com/careers/senior-engineer"),
            "https://example.com/job",
        );
        await user.click(screen.getByRole("button", { name: "Hent ut detaljer" }));

        expect(onExtract).toHaveBeenCalledWith("url", "https://example.com/job");
    });

    it("fills the textarea from an example posting", async () => {
        const user = userEvent.setup();

        render(<JobInput busy={false} onExtract={vi.fn()} />);

        await user.click(screen.getByText("Frontend-utvikler"));

        const textarea = screen.getByPlaceholderText(
            "Lim inn hele stillingsannonsen her...",
        ) as HTMLTextAreaElement;
        expect(textarea.value).toContain("Frontend-utvikler — Northwind Labs");
    });

    it("shows a busy label and disables the submit button while busy", () => {
        render(<JobInput busy={true} onExtract={vi.fn()} />);

        expect(
            screen.getByRole("button", { name: "Henter ut…" }),
        ).toBeDisabled();
    });
});
