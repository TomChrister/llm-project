import { z } from "zod";

// Shared between the /api/extract route (streamObject) and the UI (useObject)
// so the streamed shape stays in sync on both ends. streamObject fills these
// fields progressively, so every field must tolerate being briefly absent.
export const jobPostingSchema = z.object({
    title: z.string().describe("The job title, e.g. 'Senior Frontend Engineer'."),
    company: z.string().optional().describe("Hiring company name, if stated."),
    location: z
        .string()
        .optional()
        .describe("Location or remote policy, e.g. 'Berlin' or 'Remote (EU)'."),
    employmentType: z
        .string()
        .optional()
        .describe("e.g. 'Full-time', 'Part-time', 'Contract', 'Internship'."),
    seniority: z
        .string()
        .optional()
        .describe("e.g. 'Junior', 'Mid', 'Senior', 'Lead'."),
    requiredSkills: z
        .array(z.string())
        .describe("Must-have skills, tools, or qualifications."),
    niceToHaveSkills: z
        .array(z.string())
        .describe("Preferred but non-essential skills. Empty if none stated."),
    responsibilities: z
        .array(z.string())
        .describe("Key duties and responsibilities of the role."),
});

export type JobPosting = z.infer<typeof jobPostingSchema>;
