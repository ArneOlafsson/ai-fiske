import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { message, history } = await request.json();

        // Simulate thinking
        await new Promise(resolve => setTimeout(resolve, 1000));

        let answer = "Det är en intressant fråga om fiske! Som AI-fiskeassistent rekommenderar jag att anpassa betet efter vattentemperaturen.";

        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes("bete") || lowerMsg.includes("drag")) {
            answer = "För gädda fungerar stora gummibeten eller jerkbaits bäst just nu. För abborre skulle jag prova en mindre jigg i naturliga färger (typ motoroil).";
        } else if (lowerMsg.includes("väder") || lowerMsg.includes("vind")) {
            answer = "Mulet väder med lite vind är ofta optimalt för gäddfiske (så kallat 'Gäddväder'). Högtryck och strålande sol kan göra fisken passiv, då får du fiska djupare.";
        } else if (lowerMsg.includes("gös")) {
            answer = "Gös fiskas bäst på kvällen eller natten, gärna med bottenmete eller vertikalfiske nära grynnor. De gillar ofta färger som chartreuse eller vitt.";
        } else if (lowerMsg.includes("gädda") || lowerMsg.includes("gäddan")) {
            answer = "Gäddan är en predator som ofta står i vasskanten eller vid natebälten. Testa att veva in betet oregelbundet med 'vevstopp' för att trigga hugg.";
        } else if (lowerMsg.includes("abborre")) {
            answer = "Abborren är en flockfisk. Hittar du en, finns det ofta fler! Prova dropshot eller spinnare runt bryggor och stenrösen.";
        } else if (lowerMsg.includes("hej") || lowerMsg.includes("tja")) {
            answer = "Hej! 👋 Jag är din AI-fiskeassistent. Fråga mig om beten, fiskeplatser eller vilken fisk som är på hugget!";
        }

        return NextResponse.json({
            role: 'assistant',
            text: answer
        });
    } catch (error) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
