import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiResult } from '@/lib/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("Missing GEMINI_API_KEY");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const body = await request.json();
        const { imageUrl } = body;

        if (!imageUrl) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Prepare image part
        let imagePart;
        if (imageUrl.startsWith('data:image')) {
            // Base64
            const base64Data = imageUrl.split(',')[1];
            const mimeType = imageUrl.split(':')[1].split(';')[0];
            imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            };
        } else {
            // URL - Fetch and convert to base64 buffer for Gemini
            // Note: Gemini 1.5 Flash supports URL if file API used, otherwise inlineData best for simple stateless.
            const imageResp = await fetch(imageUrl);
            const arrayBuffer = await imageResp.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString('base64');
            const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';
            imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            };
        }

        const prompt = `
        Analysera denna fiskbild för en svensk fiskeapp.
        Returnera enbart valid JSON (ingen markdown) med följande struktur:
        {
            "fishNameSv": "Svenskt artnamn",
            "fishNameLatin": "Latinskt namn",
            "confidence": 0.0-1.0 (siffra),
            "descriptionShort": "Kort beskrivning (max 2 meningar)",
            "edible": "Ja" | "Nej" | "Beror på",
            "edibleNotes": "Kort notering om matvärde",
            "recipeTitle": "Titel på ett passande recept",
            "recipeIngredients": ["ingrediens 1", "ingrediens 2"...],
            "recipeSteps": ["steg 1", "steg 2"...],
            "cookingMethod": "Stekning" | "Ugn" | "Grillning" | "Soppa"
        }
        Om det inte är en fisk, sätt "fishNameSv": "Okänd" och confidence lågt.
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();

        // Clean markdown code blocks if present // ```json ... ```
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        const aiResult: AiResult = JSON.parse(cleanJson);

        return NextResponse.json({ aiResult });
    } catch (error: any) {
        console.error("AI Error Detailed:", error);
        console.error("Key present:", !!process.env.GEMINI_API_KEY);
        console.error("Key length:", process.env.GEMINI_API_KEY?.length);
        return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 });
    }
}
