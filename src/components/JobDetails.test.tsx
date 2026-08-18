import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobDetails } from "@/components/JobDetails";

describe("JobDetails", () => {
    it("renders title, company, and meta fields", () => {
        render(
            <JobDetails
                job={{
                    title: "Senior Frontend Engineer",
                    company: "Northwind Labs",
                    location: "Remote (EU)",
                    employmentType: "Full-time",
                    seniority: "Senior",
                    requiredSkills: ["React", "TypeScript"],
                    niceToHaveSkills: ["Next.js"],
                    responsibilities: ["Own the editor UI"],
                }}
            />,
        );

        expect(
            screen.getByRole("heading", { name: "Senior Frontend Engineer" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Northwind Labs")).toBeInTheDocument();
        expect(screen.getByText("Remote (EU)")).toBeInTheDocument();
        expect(screen.getByText("React")).toBeInTheDocument();
        expect(screen.getByText("Next.js")).toBeInTheDocument();
        expect(screen.getByText("Own the editor UI")).toBeInTheDocument();
    });

    it("falls back to a placeholder title and omits empty sections while streaming", () => {
        render(
            <JobDetails
                job={{
                    requiredSkills: [],
                    niceToHaveSkills: [],
                    responsibilities: [],
                }}
            />,
        );

        expect(screen.getByRole("heading", { name: "…" })).toBeInTheDocument();
        expect(screen.queryByText("Nødvendige ferdigheter")).not.toBeInTheDocument();
        expect(screen.queryByText("Ansvarsområder")).not.toBeInTheDocument();
    });

    it("filters out undefined items in partially-streamed arrays", () => {
        render(
            <JobDetails
                job={{
                    title: "Product Manager",
                    requiredSkills: ["SQL", undefined],
                    niceToHaveSkills: [],
                    responsibilities: [undefined],
                }}
            />,
        );

        expect(screen.getByText("SQL")).toBeInTheDocument();
        expect(screen.queryByText("Ansvarsområder")).not.toBeInTheDocument();
    });
});
