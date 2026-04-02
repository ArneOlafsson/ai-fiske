import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
    try {
        const { message, history } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY not set");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const chat = model.startChat({
            history: history.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.text }],
            })),
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const systemPrompt = "Du är en expertguide för sportfiske i Sverige. Svara kortfattat, kunnigt och uppmuntrande på svenska. Håll svaren under 100 ord om möjligt.";

        // We prepend the system prompt context to the user message since startChat doesn't strictly support system instruction in all valid SDK versions/models easily without beta flags
        // or we could use the systemInstruction arg if we are sure of the SDK version.
        // For safety/compatibility, we can guide the model via the first message or verify SDK version.
        // Checking package.json, we have "@google/generative-ai": "^0.24.1", which supports systemInstruction.

        // Re-initializing model with system instruction for better behavior
        const chatModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            // Added instruction to avoid markdown formatting significantly
            systemInstruction: "Du är en expertguide för sportfiske i Sverige. Svara kortfattat, kunnigt och uppmuntrande på svenska. Använd INTE markdown-formatering (som fetstil **txt** eller punktlistor *). Skriv endast ren text i stycken. Om frågan inte handlar om fiske, försök leda tillbaka ämnet eller avböj vänligt."
        });

        const chatSession = chatModel.startChat({
            history: history.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.text }],
            })),
        });

        const result = await chatSession.sendMessage(message);
        const responseText = result.response.text();

        return NextResponse.json({
            role: 'assistant',
            text: responseText
        });
    } catch (error) {
        console.error("AI Chat Error:", error);
        return NextResponse.json({ error: "Kunde inte svara just nu." }, { status: 500 });
    }
}
