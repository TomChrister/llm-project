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
        label: "Frontend-utvikler",
        text: `Frontend-utvikler — Northwind Labs (Fjernjobb, EU)

Om rollen
Northwind Labs bygger en samarbeidsplattform for dataanalyse som brukes av
forskningsteam. Vi ser etter en erfaren frontend-utvikler til å lede
brukergrensesnittet for vår neste generasjons editor. Dette er en fast,
heltids fjernjobb åpen for kandidater bosatt i EU.

Hva du vil gjøre
- Eie og videreutvikle vårt React + TypeScript-komponentbibliotek
- Bygge sanntids, samarbeidende redigeringsfunksjoner
- Samarbeide tett med design for å levere tilgjengelige, polerte grensesnitt
- Veilede to utviklere på mellomnivå og gjennomgå arbeidet deres

Hva vi ser etter
- 5+ års erfaring med å bygge produksjonsapper med React og TypeScript
- Solid grunnlag i CSS og tilgjengelighet
- Erfaring med sanntidsdata (WebSockets, CRDT-er) er et stort pluss
- Komfortabel med å jobbe asynkront på tvers av tidssoner

Fint å ha
- Erfaring med Next.js
- Kjennskap til datavisualisering (D3, Recharts)
- Bidrag til åpen kildekode-prosjekter`,
    },
    {
        id: "pm",
        label: "Produktsjef",
        text: `Produktsjef, Betaling — Lumen Financial (Hybrid, London)

Lumen Financial hjelper småbedrifter med å få betalt raskere. Vi søker en
produktsjef til å eie hele vår betalingsopplevelse fra start til slutt.
Dette er en hybridrolle: tre dager i uken på kontoret vårt i London.

Ansvarsområder
- Definere veikartet for våre produkter for betalingsmottak
- Omsette kundeproblemer til klare, prioriterte krav
- Samarbeide tett med utvikling, design og compliance
- Analysere trakt-metrikker og kjøre eksperimenter for å bedre konvertering

Krav
- 3+ års erfaring med produktledelse, gjerne innen fintech
- Dokumentert erfaring med å levere B2B SaaS-produkter
- Sterke analytiske ferdigheter og god kjennskap til SQL
- Utmerket skriftlig og muntlig kommunikasjon

Ekstra pluss
- Erfaring med betaling, kort eller regulatoriske miljøer
- Erfaring fra oppstartsselskaper`,
    },
    {
        id: "designer",
        label: "UX-designer (Junior)",
        text: `Junior UX-designer — Bright Harbor (På kontoret, Amsterdam)

Bright Harbor designer digitale verktøy for maritim industri. Vi ser etter
en junior UX-designer til å bli med i vårt lille, tette produktteam på
kontoret i Amsterdam.

I denne rollen vil du
- Omsette brukerundersøkelser til wireframes og interaktive prototyper
- Bidra til og vedlikeholde designsystemet vårt i Figma
- Gjennomføre brukertester og oppsummere funn
- Samarbeide daglig med produkt og utvikling

Vi vil gjerne se
- 1-2 års erfaring med UX/produktdesign (praksisplasser teller)
- En portefølje som viser prosessen din, ikke bare ferdige skjermbilder
- Kompetanse i Figma
- Nysgjerrighet og vilje til å lære

Fint å ha
- Noe kjennskap til HTML/CSS
- Interesse for komplekse, datatunge grensesnitt`,
    },
];
