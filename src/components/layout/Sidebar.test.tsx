import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/components/layout/Sidebar";
import type { SavedJob } from "@/lib/storage";

function makeJob(id: string, title: string, company?: string): SavedJob {
    return {
        id,
        jobData: {
            title,
            company,
            requiredSkills: [],
            niceToHaveSkills: [],
            responsibilities: [],
        },
        messages: [],
        createdAt: Date.now(),
    };
}

function renderSidebar(props: Partial<ComponentProps<typeof Sidebar>> = {}) {
    const handlers = { onSelect: vi.fn(), onDelete: vi.fn(), onClose: vi.fn() };
    render(<Sidebar jobs={[]} currentId={null} open={false} {...handlers} {...props} />);
    return handlers;
}

describe("Sidebar", () => {
    it("moves focus into the open drawer and closes it on Escape", async () => {
        const user = userEvent.setup();
        const { onClose } = renderSidebar({ open: true });

        expect(screen.getByRole("button", { name: "Lukk meny" })).toHaveFocus();
        await user.keyboard("{Escape}");
        expect(onClose).toHaveBeenCalledOnce();
    });

    it("shows an empty state when there are no saved jobs", () => {
        renderSidebar();

        expect(screen.getByText("Ingen påbegynte søknadsbrev ennå.")).toBeInTheDocument();
    });

    it("lists saved jobs and selects one on click", async () => {
        const user = userEvent.setup();
        const { onSelect, onClose } = renderSidebar({
            jobs: [makeJob("1", "Frontend-utvikler", "Northwind Labs")],
        });

        // A real button, so the keyboard can open it: focus it, press Enter.
        screen.getByRole("button", { name: /Frontend-utvikler/ }).focus();
        await user.keyboard("{Enter}");

        expect(onSelect).toHaveBeenCalledWith("1");
        expect(onClose).toHaveBeenCalled();
    });

    it("deletes a job without triggering select", async () => {
        const user = userEvent.setup();
        const { onSelect, onDelete } = renderSidebar({
            jobs: [makeJob("1", "Frontend-utvikler")],
        });

        await user.click(screen.getByTitle("Fjern"));

        expect(onDelete).toHaveBeenCalledWith("1");
        expect(onSelect).not.toHaveBeenCalled();
    });
});
