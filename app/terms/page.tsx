export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl text-gray-800 dark:text-gray-200">
            <h1 className="text-3xl font-bold mb-6">Användarvillkor (Terms of Service)</h1>
            <p className="mb-4 text-sm text-gray-500">Senast uppdaterad: 2026-01-30</p>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">1. Allmänt</h2>
                <p>
                    Välkommen till AI Fiskeassistenten ("Tjänsten"). Genom att använda vår app godkänner du dessa villkor.
                    Tjänsten tillhandahålls av [Ditt Företagsnamn/Du].
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">2. Tjänsten</h2>
                <p>
                    AI Fiskeassistenten erbjuder AI-baserad identifiering av fiskarter, chattfunktioner och kartor över fiskevatten.
                    Vi garanterar inte att AI-identifieringen alltid är 100% korrekt. Var god konsultera lokala regler och experter vid osäkerhet.
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">3. Prenumeration och Betalning</h2>
                <p>
                    Vissa funktioner kräver ett Premium-medlemskap.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Premium Helår 2026:</strong> En engångskostnad på 299 SEK ger tillgång till Premium-funktioner under kalenderåret 2026.</li>
                    <li>Betalning sker säkert via Stripe. Vi lagrar inga kortuppgifter.</li>
                    <li>Ditt medlemskap är personligt och får inte delas.</li>
                </ul>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">4. Ångerrätt och Återbetalning</h2>
                <p>
                    Enligt distansavtalslagen har du normalt 14 dagars ångerrätt. Om du börjar använda digitala tjänsten (t.ex. genom att använda Premium-funktioner)
                    kan ångerrätten förbrukas. Kontakta oss på support@ai-fiske.se vid frågor om återbetalning.
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">5. Användardata</h2>
                <p>
                    Vi värnar om din integritet. Se vår Integritetspolicy för detaljer om hur vi hanterar dina personuppgifter.
                </p>
            </section>
        </div>
    );
}
