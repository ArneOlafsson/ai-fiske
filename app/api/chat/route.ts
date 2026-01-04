import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { message, history } = await request.json();

        // Simulate thinking
        await new Promise(resolve => setTimeout(resolve, 1000));

        let answer = "Det är en intressant fråga om fiske! Som AI-fiskeassistent rekommenderar jag att anpassa betet efter vattentemperaturen.";

        if (message.toLowerCase().includes("bete")) {
            answer = "För gädda fungerar stora gummibeten eller jerkbaits bäst just nu. För abborre skulle jag prova en mindre jigg i naturliga färger.";
        } else if (message.toLowerCase().includes("väder")) {
            answer = "Mulet väder med lite vind är ofta optimalt för gäddfiske (" + "Gäddväder" + "). Högtryck kan göra fisken passiv.";
        } else if (message.toLowerCase().includes("hej")) {
            answer = "Hej! Vad kan jag hjälpa dig med inom fiske idag?";
        }

        return NextResponse.json({
            role: 'assistant',
            text: answer
        });
    } catch (error) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
