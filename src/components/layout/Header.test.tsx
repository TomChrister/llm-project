import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/layout/Header";

describe("Header", () => {
    it("marks the current view and navigates to the other", async () => {
        const user = userEvent.setup();
        const onNavigate = vi.fn();

        render(<Header view="home" onNavigate={onNavigate} />);

        expect(screen.getByRole("button", { name: "Hjem" })).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(
            screen.getByRole("button", { name: "Søknadsbrev" }),
        ).not.toHaveAttribute("aria-current");

        await user.click(screen.getByRole("button", { name: "Søknadsbrev" }));

        expect(onNavigate).toHaveBeenCalledWith("letters");
    });
});
