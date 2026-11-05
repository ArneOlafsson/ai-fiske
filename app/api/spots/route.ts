import { NextResponse } from 'next/server';
import { FishingSpot } from '@/lib/types';
import { GoogleGenerativeAI } from "@google/generative-ai";

const ACTIVE_GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(ACTIVE_GEMINI_KEY);

export async function POST(request: Request) {
    try {
        const { species, area } = await request.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-3.5-flash-lite",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            Du är en expertguide för sportfiske i Sverige.
            Användaren vill hitta bra fiskeplatser för arten: "${species}" i området: "${area}".

            Generera en lista med 3-5 rekommenderade fiskeplatser.
            Platserna kan vara specifika (t.ex. "Lilla Värtan") eller generella typer av platser som passar i området.
            Ge realistiska tips baserat på art och område.

            Svara ENDAST med en JSON-lista som följer denna struktur exakt:
            [{
                "name": "Namn på platsen",
                "type": "Typ av vatten (Insjö, Skärgård, Älv, Hav etc)",
                "season": "Bästa säsong",
                "tips": "Kort experttips för platsen och metoden"
            }]
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const spots = JSON.parse(responseText);

        return NextResponse.json({ spots });
    } catch (error) {
        console.error("AI Spots Error:", error);
        return NextResponse.json({ error: "Kunde inte hitta platser just nu." }, { status: 500 });
    }
}
