import { NextResponse } from 'next/server';
import { AiResult } from '@/lib/types';

// Mock response for testing
const MOCK_PIKE: AiResult = {
    fishNameSv: "Gädda",
    fishNameLatin: "Esox lucius",
    confidence: 0.98,
    descriptionShort: "Gäddan är en rovfisk som kännetecknas av sin långsmala kropp och stora gap fyllt med vassa tänder. Den är vanlig i svenska sjöar och bräckt vatten.",
    edible: "Ja",
    edibleNotes: "Gäddan är en utmärkt matfisk men har många ben (Y-ben). Passar bra till färs eller ugnsbakad.",
    recipeTitle: "Klassiska Gäddwallenbergare",
    recipeIngredients: [
        "500g gäddfärs",
        "2 dl vispgrädde",
        "3 äggulor",
        "Salt och vitpeppar",
        "Ströbröd",
        "Smör till stekning"
    ],
    recipeSteps: [
        "Blanda den kalla gäddfärsen med salt och peppar.",
        "Rör ner äggulorna en i taget.",
        "Tillsätt grädden lite i taget under omrörning (färsen måste vara kall).",
        "Forma biffar, panera i ströbröd och stek i rikligt med smör ca 3-4 min per sida."
    ],
    cookingMethod: "Stekning"
};

const MOCK_PERCH: AiResult = {
    fishNameSv: "Abborre",
    fishNameLatin: "Perca fluviatilis",
    confidence: 0.96,
    descriptionShort: "Abborren är en av Sveriges vanligaste fiskar, känd för sina röda fenor och ränder på sidorna.",
    edible: "Ja",
    edibleNotes: "Abborren räknas som en delikatess. Fast och vitt kött som är lätt att filéa.",
    recipeTitle: "Smörstekt Abborrfilé med Kantareller",
    recipeIngredients: [
        "600g abborrfilé",
        "Smör",
        "Salt och peppar",
        "200g kantareller",
        "Dill och citron"
    ],
    recipeSteps: [
        "Salta och peppra filéerna.",
        "Stek kantarellerna i smör tills vätskan kokat in.",
        "Lägg i en klick smör till och stek abborrfiléerna ca 2 min på varje sida.",
        "Servera med pressad potatis och citronskiva."
    ],
    cookingMethod: "Stekning"
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { imageUrl } = body;

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Randomly return Pike or Perch for demo variety
        const isPike = Math.random() > 0.5;
        const result = isPike ? MOCK_PIKE : MOCK_PERCH;

        return NextResponse.json({ aiResult: result });
    } catch (error) {
        console.error("AI Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
