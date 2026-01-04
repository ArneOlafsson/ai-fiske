import { NextResponse } from 'next/server';
import { FishingSpot } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const { species, area } = await request.json();

        await new Promise(resolve => setTimeout(resolve, 1500));

        const mockSpots: FishingSpot[] = [
            {
                name: "Långgrundet",
                type: "Insjö",
                season: "Vår och Höst",
                tips: `Utmärkt för ${species}. Fiska nära vassen med jigg.`,
                coordinates: { lat: 59.5, lng: 18.0 }
            },
            {
                name: "Djupviken",
                type: "Insjö",
                season: "Hela året",
                tips: "Djupt vatten, prova bottenmete.",
            },
            {
                name: "Stenudden",
                type: "Skärgård",
                season: "Sommarkvällar",
                tips: "Bra strömmar här. Använd skeddrag.",
            }
        ];

        return NextResponse.json({ spots: mockSpots });
    } catch (error) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
