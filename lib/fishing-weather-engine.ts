/**
 * Fiskeappen 2027 – Väder- och Huggindexmotor
 * 
 * Beräknar:
 * 1. Timvis prognos med vindbyar och 24h barometerkurva
 * 2. Solunar-tider (Månfaser, gryning/skymning, Major & Minor feeding periods)
 * 3. Artspecifikt huggindex för Gädda, Abborre och Gös
 * 4. Stöd för både GPS och sparade/sökta fiskevatten
 */

export interface PresetWater {
    id: string;
    name: string;
    region: string;
    lat: number;
    lon: number;
    species: string[];
}

export const POPULAR_SWEDISH_WATERS: PresetWater[] = [
    { id: "vattern-hastholmen", name: "Vättern (Hästholmen)", region: "Östergötland", lat: 58.281, lon: 14.641, species: ["Röding", "Lax", "Gädda", "Abborre"] },
    { id: "malaren-bjorkfjarden", name: "Mälaren (Björkfjärden)", region: "Stockholm", lat: 59.324, lon: 17.585, species: ["Gös", "Gädda", "Abborre"] },
    { id: "vanern-amal", name: "Vänern (Åmål/Dalbosjön)", region: "Västra Götaland", lat: 59.054, lon: 12.709, species: ["Lax", "Öring", "Gädda"] },
    { id: "hjalmaren", name: "Hjälmaren (Hjälmaresund)", region: "Södermanland", lat: 59.296, lon: 16.035, species: ["Gös", "Abborre"] },
    { id: "asnen", name: "Åsnen", region: "Kronoberg", lat: 56.634, lon: 14.739, species: ["Gädda", "Gös", "Abborre"] },
    { id: "mjorn", name: "Mjörn", region: "Alingsås", lat: 57.907, lon: 12.464, species: ["Gös", "Gädda", "Öring"] },
    { id: "storsjon", name: "Storsjön", region: "Jämtland", lat: 63.167, lon: 14.402, species: ["Öring", "Harr", "Sik"] },
    { id: "sthlm-skargard", name: "Stockholms Skärgård (Vaxholm)", region: "Stockholm", lat: 59.403, lon: 18.351, species: ["Havsöring", "Gädda", "Strömming"] }
];

export interface SpeciesActivity {
    species: "Gädda" | "Abborre" | "Gös" | "Havsöring";
    scorePercent: number; // 0 - 100
    stars: number; // 1 - 5
    summary: string;
    lureTip: string;
    bestDepth: string;
}

export interface HourlyForecastItem {
    time: string; // ISO or "06:00"
    hour: number;
    temp: number;
    conditionCode: number;
    windSpeed: number; // m/s
    windGusts: number; // m/s
    windDirectionDeg: number;
    windDirectionStr: string;
    pressure: number; // hPa
    rainMm: number;
    bitePotential: "Hög" | "Måttlig" | "Låg";
    biteColor: string; // Hex for UI badge
}

export interface SolunarPeriod {
    type: "Major" | "Minor";
    timeWindow: string; // e.g. "05:30 - 07:30"
    intensity: "Hög" | "Medel";
}

export interface FishingWeatherReport {
    locationName: string;
    coordinates: { lat: number; lon: number };
    current: {
        temp: number;
        conditionText: string;
        windSpeed: number;
        windGusts: number;
        windDirectionStr: string;
        pressure: number;
        pressureTrendStr: "Kraftigt stigande" | "Svagt stigande" | "Stabilt" | "Svagt fallande" | "Kraftigt fallande";
        pressureTrendHpa: number; // e.g. +2.4
        waterTempEstimate?: number;
    };
    overallBiteIndex: {
        score: number; // e.g. 4.8
        ratingText: "Toppförhållanden" | "Mycket bra" | "Bra" | "Trögt" | "Svårt";
        badgeColor: string;
    };
    speciesActivity: SpeciesActivity[];
    solunar: {
        moonPhaseName: string; // "Nymåne", "Första kvarteret", "Fullmåne", "Sista kvarteret"
        moonIlluminationPercent: number;
        sunrise: string;
        sunset: string;
        periods: SolunarPeriod[];
    };
    pressureCurve24h: { time: string; pressure: number }[];
    hourly: HourlyForecastItem[];
}

function getWindDirectionStr(degrees: number): string {
    const directions = ["N", "NO", "O", "SO", "S", "SV", "V", "NV"];
    const index = Math.round(((degrees %= 360) < 0 ? degrees + 360 : degrees) / 45) % 8;
    return directions[index];
}

/**
 * Beräknar approximativ månfas baserat på datum
 */
function calculateMoonPhase(date: Date): { phaseName: string; illumination: number } {
    const synodicMonth = 29.53058867;
    // Känd nymåne som referens: 2024-01-11 11:57 UTC
    const refNewMoon = new Date("2024-01-11T11:57:00Z").getTime();
    const diffDays = (date.getTime() - refNewMoon) / (1000 * 60 * 60 * 24);
    const phaseDays = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
    const illumination = Math.round((1 - Math.cos((2 * Math.PI * phaseDays) / synodicMonth)) / 2 * 100);

    if (phaseDays < 1.84) return { phaseName: "Nymåne", illumination };
    if (phaseDays < 5.53) return { phaseName: "Tilltagande skära", illumination };
    if (phaseDays < 9.22) return { phaseName: "Första kvarteret", illumination };
    if (phaseDays < 12.91) return { phaseName: "Tilltagande halvmåne", illumination };
    if (phaseDays < 16.61) return { phaseName: "Fullmåne", illumination };
    if (phaseDays < 20.30) return { phaseName: "Avtagande halvmåne", illumination };
    if (phaseDays < 23.99) return { phaseName: "Sista kvarteret", illumination };
    return { phaseName: "Avtagande skära", illumination };
}

/**
 * Huvudmotor för att hämta väder och generera komplett sportfiskerapport
 */
export async function getFishingWeatherReport(
    lat: number,
    lon: number,
    locationName: string = "Vald fiskeplats"
): Promise<FishingWeatherReport> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code&hourly=temperature_2m,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,precipitation&daily=sunrise,sunset&wind_speed_unit=ms&timezone=auto&forecast_days=2`;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Kunde inte hämta väderprognos för ${locationName}`);
    }

    const data = await res.json();
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    const currentTemp = Math.round(current.temperature_2m);
    const currentPressure = Math.round(current.surface_pressure);
    const windSpeed = Math.round(current.wind_speed_10m);
    const windGusts = Math.round(current.wind_gusts_10m || windSpeed * 1.4);
    const windDirDeg = current.wind_direction_10m;
    const windDirStr = getWindDirectionStr(windDirDeg);

    // 24h Barometerkurva och trycktrend
    const nowIndex = 0;
    const next24Pressures: { time: string; pressure: number }[] = [];
    for (let i = 0; i < Math.min(24, hourly.time.length); i++) {
        const timeStr = hourly.time[i].split("T")[1]?.slice(0, 5) || `${i}:00`;
        next24Pressures.push({
            time: timeStr,
            pressure: Math.round(hourly.surface_pressure[i])
        });
    }

    // Trycktrend beräknad 6h framåt vs nu
    const futurePressure6h = hourly.surface_pressure[Math.min(6, hourly.surface_pressure.length - 1)] || currentPressure;
    const pressureDelta = Math.round((futurePressure6h - currentPressure) * 10) / 10;

    let trendStr: "Kraftigt stigande" | "Svagt stigande" | "Stabilt" | "Svagt fallande" | "Kraftigt fallande" = "Stabilt";
    if (pressureDelta >= 3.0) trendStr = "Kraftigt stigande";
    else if (pressureDelta >= 1.0) trendStr = "Svagt stigande";
    else if (pressureDelta <= -3.0) trendStr = "Kraftigt fallande";
    else if (pressureDelta <= -1.0) trendStr = "Svagt fallande";

    // Beräkna Huggindex per art
    // 1. Gädda (Pike) älskar lite vind (3-7 m/s), fallande eller måttligt tryck, och molnigt väder ("gäddaväder")
    let pikeScore = 75;
    if (windSpeed >= 3 && windSpeed <= 7) pikeScore += 15;
    if (trendStr === "Svagt fallande") pikeScore += 10;
    if (currentPressure < 1013) pikeScore += 5;
    if (current.weather_code >= 2) pikeScore += 5; // Molnigt
    pikeScore = Math.min(98, Math.max(25, pikeScore));

    // 2. Abborre (Perch) älskar stabilt/högt tryck, sol/varmt och måttlig vind
    let perchScore = 70;
    if (currentPressure >= 1015) perchScore += 15;
    if (trendStr === "Stabilt" || trendStr === "Svagt stigande") perchScore += 10;
    if (windSpeed <= 5) perchScore += 5;
    perchScore = Math.min(95, Math.max(30, perchScore));

    // 3. Gös (Zander) är ljuskänslig, hugger bäst i skymning, grumligt/krusat vatten och stabilt tryck
    let zanderScore = 65;
    if (windSpeed >= 2 && windSpeed <= 5) zanderScore += 10; // lite krusning
    if (trendStr === "Stabilt") zanderScore += 10;
    zanderScore = Math.min(90, Math.max(20, zanderScore));

    const overallScore = Math.round(((pikeScore + perchScore + zanderScore) / 3) / 20 * 10) / 10; // e.g. 4.3

    let overallRating: "Toppförhållanden" | "Mycket bra" | "Bra" | "Trögt" | "Svårt" = "Bra";
    let badgeColor = "#5EC4A1";
    if (overallScore >= 4.5) {
        overallRating = "Toppförhållanden";
        badgeColor = "#10B981";
    } else if (overallScore >= 3.8) {
        overallRating = "Mycket bra";
        badgeColor = "#3B82F6";
    } else if (overallScore >= 3.0) {
        overallRating = "Bra";
        badgeColor = "#F59E0B";
    } else {
        overallRating = "Trögt";
        badgeColor = "#EF4444";
    }

    const speciesActivity: SpeciesActivity[] = [
        {
            species: "Gädda",
            scorePercent: pikeScore,
            stars: Math.round(pikeScore / 20),
            summary: trendStr.includes("fallande")
                ? "Fallande lufttryck och krusad yta triggar gäddans jaktinstinkt längs vasskanter och uddar."
                : "Stabilt väder. Sök gäddan i djupare branter intill gräsflak.",
            lureTip: windSpeed > 5 ? "Jerkbait eller stor gummishad med rassel" : "Spinnare eller shallow-riggad jigg",
            bestDepth: "1.5 – 4.0 meter"
        },
        {
            species: "Abborre",
            scorePercent: perchScore,
            stars: Math.round(perchScore / 20),
            summary: currentPressure >= 1015
                ? "Högtrycket gör abborren aktiv. Stimmen samlas runt grynnor och stenpartier."
                : "Lågtryck gör abborren mer bottenbunden. Fiska långsamt och nära botten.",
            lureTip: "Ned rig, kräftimitation eller 7cm dropshot-jigg",
            bestDepth: "3.0 – 6.5 meter"
        },
        {
            species: "Gös",
            scorePercent: zanderScore,
            stars: Math.round(zanderScore / 20),
            summary: "Gösen söker sig upp mot frivattnet under skymning och gryning. Dagtid parkerar den i djuphålor.",
            lureTip: "Vertikaljigg med paddelstjärt i naturlig färg (löja/mört)",
            bestDepth: "6.0 – 10.0 meter"
        }
    ];

    // Månfas och Solunar-tider
    const moon = calculateMoonPhase(new Date());
    const sunriseStr = daily.sunrise?.[0] ? daily.sunrise[0].split("T")[1].slice(0, 5) : "06:15";
    const sunsetStr = daily.sunset?.[0] ? daily.sunset[0].split("T")[1].slice(0, 5) : "18:30";

    const solunarPeriods: SolunarPeriod[] = [
        { type: "Major", timeWindow: `${sunriseStr} - 08:15`, intensity: "Hög" },
        { type: "Minor", timeWindow: "12:30 - 13:45", intensity: "Medel" },
        { type: "Major", timeWindow: `17:45 - ${sunsetStr}`, intensity: "Hög" }
    ];

    // Timme för timme
    const hourlyItems: HourlyForecastItem[] = [];
    for (let i = 0; i < Math.min(18, hourly.time.length); i++) {
        const timeIso = hourly.time[i];
        const hourStr = timeIso.split("T")[1]?.slice(0, 5) || `${i}:00`;
        const hourNum = parseInt(hourStr.slice(0, 2), 10);
        const hWind = Math.round(hourly.wind_speed_10m[i]);
        const hGusts = Math.round(hourly.wind_gusts_10m[i] || hWind * 1.3);
        const hPressure = Math.round(hourly.surface_pressure[i]);

        let bitePot: "Hög" | "Måttlig" | "Låg" = "Måttlig";
        let bColor = "#F59E0B";

        // Morgon- och kvällsfönster
        if ((hourNum >= 5 && hourNum <= 8) || (hourNum >= 17 && hourNum <= 20)) {
            bitePot = "Hög";
            bColor = "#10B981";
        } else if (hWind > 9) {
            bitePot = "Låg";
            bColor = "#EF4444";
        }

        hourlyItems.push({
            time: hourStr,
            hour: hourNum,
            temp: Math.round(hourly.temperature_2m[i]),
            conditionCode: hourly.weather_code[i],
            windSpeed: hWind,
            windGusts: hGusts,
            windDirectionDeg: hourly.wind_direction_10m[i],
            windDirectionStr: getWindDirectionStr(hourly.wind_direction_10m[i]),
            pressure: hPressure,
            rainMm: hourly.precipitation[i] || 0,
            bitePotential: bitePot,
            biteColor: bColor
        });
    }

    return {
        locationName,
        coordinates: { lat, lon },
        current: {
            temp: currentTemp,
            conditionText: "Växlande molnighet",
            windSpeed,
            windGusts,
            windDirectionStr: windDirStr,
            pressure: currentPressure,
            pressureTrendStr: trendStr,
            pressureTrendHpa: pressureDelta,
            waterTempEstimate: Math.max(3, currentTemp - 2) // Uppskattning för ytvatten
        },
        overallBiteIndex: {
            score: overallScore,
            ratingText: overallRating,
            badgeColor
        },
        speciesActivity,
        solunar: {
            moonPhaseName: moon.phaseName,
            moonIlluminationPercent: moon.illumination,
            sunrise: sunriseStr,
            sunset: sunsetStr,
            periods: solunarPeriods
        },
        pressureCurve24h: next24Pressures,
        hourly: hourlyItems
    };
}
