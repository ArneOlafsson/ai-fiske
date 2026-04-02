export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl text-gray-800 dark:text-gray-200">
            <h1 className="text-3xl font-bold mb-6">Integritetspolicy (Privacy Policy)</h1>
            <p className="mb-4 text-sm text-gray-500">Senast uppdaterad: 2026-01-30</p>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">1. Insamling av data</h2>
                <p>
                    Vi samlar in information som du tillhandahåller direkt till oss, till exempel när du skapar ett konto, laddar upp en bild på en fångst, eller kontaktar oss.
                    Data vi kan samla in inkluderar:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>E-postadress och användarnamn (via Google Auth/Firebase).</li>
                    <li>Bilder du laddar upp för identifiering.</li>
                    <li>Platsdata (valfritt, för att spara fångstpositioner).</li>
                </ul>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">2. Hur vi använder din data</h2>
                <p>
                    Vi använder informationen för att:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Tillhandahålla och förbättra våra tjänster (t.ex. träna AI för bättre fiskigenkänning).</li>
                    <li>Hantera ditt konto och dina prenumerationer.</li>
                    <li>Kommunicera med dig angående uppdateringar eller support.</li>
                </ul>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">3. Delning av data</h2>
                <p>
                    Vi säljer inte din personliga data till tredje part. Vi kan dela data med tjänsteleverantörer som hjälper oss driva appen (t.ex. Firebase för hosting/databas, Stripe för betalningar).
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">4. Dina rättigheter</h2>
                <p>
                    Du har rätt att begära tillgång till, rättelse av eller radering av dina personuppgifter. Kontakta oss om du vill utöva dessa rättigheter eller radera ditt konto.
                </p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">5. Cookies</h2>
                <p>
                    Vi använder cookies och liknande tekniker för att hålla dig inloggad och analysera hur tjänsten används (via Google Analytics).
                </p>
            </section>
        </div>
    );
}
