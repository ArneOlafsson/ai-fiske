export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl text-gray-800 dark:text-gray-200">
            <h1 className="text-3xl font-bold mb-6">Användarvillkor &amp; EULA – Bertlids Fiskeapp</h1>
            <p className="mb-4 text-sm text-gray-500">Senast uppdaterad: 2026-11-15</p>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">1. Allmänt</h2>
                <p>
                    Dessa användarvillkor (&quot;Villkoren&quot;) reglerar din användning av applikationen Bertlids Fiskeapp och tillhörande webbtjänster,
                    vilka tillhandahålls av Olafsson Atwork Consulting AB (Lilla Torget 4, 761 30 Norrtälje). Genom att använda appen godkänner du dessa villkor.
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">2. Bertlid PRO – Prenumeration &amp; Betalning</h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Bertlid PRO Årskort:</strong> 299 kr/år (förnyas automatiskt årsvis).</li>
                    <li><strong>Bertlid PRO Månadskort:</strong> 49 kr/mån (förnyas automatiskt månadsvis).</li>
                    <li>Prenumerationen debiteras ditt Apple-ID-konto eller Google Play-konto vid bekräftelse av köp och förnyas automatiskt om den inte sägs upp minst 24 timmar före innevarande periods slut.</li>
                    <li>Du kan när som helst hantera eller avsluta din prenumeration i kontoinställningarna i App Store eller Google Play.</li>
                </ul>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">3. Trivselregler och Användargenererat Innehåll</h2>
                <p>
                    Vi tillämpar nolltolerans mot stötande, kränkande eller olagligt innehåll i Community-flödet. Användare kan direkt i appen anmäla inlägg eller blockera andra användare.
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">4. Ansvarsfriskrivning</h2>
                <p>
                    AI-artbestämning, väderdata och huggprognoser tillhandahålls som vägledande beslutsstöd. Kontrollera alltid lokala fiskeregler och iaktta god sjösäkerhet.
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">5. Kontakt &amp; Integritet</h2>
                <p>
                    Se vår integritetspolicy på <a href="https://bertlid.se/integritetspolicy/" className="underline">bertlid.se/integritetspolicy</a> och fullständiga villkor på <a href="https://bertlid.se/villkor/" className="underline">bertlid.se/villkor</a>. Kontakt: support@bertlid.se.
                </p>
            </section>
        </div>
    );
}
