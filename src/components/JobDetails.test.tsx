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

    it("links back to the source URL, shortened, under the title and company", () => {
        render(
            <JobDetails
                job={{
                    title: "Software Engineer",
                    company: "Pexip",
                    requiredSkills: [],
                    niceToHaveSkills: [],
                    responsibilities: [],
                }}
                sourceUrl="https://pexip.bamboohr.com/careers/635"
            />,
        );

        const link = screen.getByRole("link", {
            name: "pexip.bamboohr.com/careers/635",
        });
        expect(link).toHaveAttribute("href", "https://pexip.bamboohr.com/careers/635");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
        // It belongs to the header, after the company line.
        expect(link.previousElementSibling).toHaveTextContent("Pexip");
    });

    it("omits the source link for a posting that was pasted as text", () => {
        render(
            <JobDetails
                job={{
                    title: "Software Engineer",
                    requiredSkills: [],
                    niceToHaveSkills: [],
                    responsibilities: [],
                }}
            />,
        );

        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("shows an unparseable source URL as-is", () => {
        render(
            <JobDetails
                job={{
                    title: "Software Engineer",
                    requiredSkills: [],
                    niceToHaveSkills: [],
                    responsibilities: [],
                }}
                sourceUrl="ikke en url"
            />,
        );

        expect(screen.getByRole("link", { name: "ikke en url" })).toBeInTheDocument();
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
