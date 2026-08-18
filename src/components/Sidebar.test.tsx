import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/components/Sidebar";
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

describe("Sidebar", () => {
    it("shows an empty state when there are no saved jobs", () => {
        render(
            <Sidebar
                jobs={[]}
                currentId={null}
                onSelect={vi.fn()}
                onNew={vi.fn()}
                onDelete={vi.fn()}
                open={false}
                onClose={vi.fn()}
            />,
        );

        expect(screen.getByText("Ingen lagrede stillinger ennå.")).toBeInTheDocument();
    });

    it("lists saved jobs and selects one on click", async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        const onClose = vi.fn();
        const jobs = [makeJob("1", "Frontend-utvikler", "Northwind Labs")];

        render(
            <Sidebar
                jobs={jobs}
                currentId={null}
                onSelect={onSelect}
                onNew={vi.fn()}
                onDelete={vi.fn()}
                open={false}
                onClose={onClose}
            />,
        );

        await user.click(screen.getByText("Frontend-utvikler"));

        expect(onSelect).toHaveBeenCalledWith("1");
        expect(onClose).toHaveBeenCalled();
    });

    it("deletes a job without triggering select (stopPropagation)", async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        const onDelete = vi.fn();
        const jobs = [makeJob("1", "Frontend-utvikler")];

        render(
            <Sidebar
                jobs={jobs}
                currentId={null}
                onSelect={onSelect}
                onNew={vi.fn()}
                onDelete={onDelete}
                open={false}
                onClose={vi.fn()}
            />,
        );

        await user.click(screen.getByTitle("Fjern"));

        expect(onDelete).toHaveBeenCalledWith("1");
        expect(onSelect).not.toHaveBeenCalled();
    });

    it("starts a new extraction via the header button", async () => {
        const user = userEvent.setup();
        const onNew = vi.fn();

        render(
            <Sidebar
                jobs={[]}
                currentId={null}
                onSelect={vi.fn()}
                onNew={onNew}
                onDelete={vi.fn()}
                open={false}
                onClose={vi.fn()}
            />,
        );

        await user.click(screen.getByText("Ny uthenting"));

        expect(onNew).toHaveBeenCalled();
    });
});
