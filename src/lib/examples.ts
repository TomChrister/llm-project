// Fictional job postings so the app can be tried without hunting down a real
// one. Each `text` is what gets dropped into the "Paste text" field.
export type ExamplePosting = {
    id: string;
    label: string;
    text: string;
};

export const examplePostings: ExamplePosting[] = [
    {
        id: "frontend",
        label: "Senior Frontend Engineer",
        text: `Senior Frontend Engineer — Northwind Labs (Remote, EU)

About the role
Northwind Labs is building a collaborative data-analysis platform used by
research teams. We're looking for a Senior Frontend Engineer to lead the UI of
our next-generation editor. This is a full-time, fully remote position open to
candidates based in the EU.

What you'll do
- Own and evolve our React + TypeScript component library
- Build real-time, collaborative editing features
- Partner with design to ship accessible, polished interfaces
- Mentor two mid-level engineers and review their work

What we're looking for
- 5+ years building production web apps with React and TypeScript
- Strong CSS and accessibility fundamentals
- Experience with real-time data (WebSockets, CRDTs) is a big plus
- Comfortable working async across time zones

Nice to have
- Experience with Next.js
- Familiarity with data visualisation (D3, Recharts)
- Open-source contributions`,
    },
    {
        id: "pm",
        label: "Product Manager",
        text: `Product Manager, Payments — Lumen Financial (Hybrid, London)

Lumen Financial helps small businesses get paid faster. We're hiring a Product
Manager to own our payments experience end to end. This is a hybrid role: three
days a week in our London office.

Responsibilities
- Define the roadmap for our payment acceptance products
- Translate customer problems into clear, prioritised requirements
- Work closely with engineering, design, and compliance
- Analyse funnel metrics and run experiments to improve conversion

Requirements
- 3+ years of product management experience, ideally in fintech
- A track record of shipping B2B SaaS products
- Strong analytical skills and comfort with SQL
- Excellent written and verbal communication

Bonus points
- Experience with payments, cards, or regulatory environments
- Startup experience`,
    },
    {
        id: "designer",
        label: "UX Designer (Junior)",
        text: `Junior UX Designer — Bright Harbor (On-site, Amsterdam)

Bright Harbor designs digital tools for the maritime industry. We're looking for
a Junior UX Designer to join our small, close-knit product team on-site in
Amsterdam.

In this role you will
- Turn user research into wireframes and interactive prototypes
- Contribute to and help maintain our design system in Figma
- Run usability sessions and synthesise findings
- Collaborate daily with product and engineering

We'd love to see
- 1-2 years of UX/product design experience (internships count)
- A portfolio showing your process, not just final screens
- Proficiency in Figma
- Curiosity and a willingness to learn

Nice to have
- Some familiarity with HTML/CSS
- Interest in complex, data-heavy interfaces`,
    },
];
