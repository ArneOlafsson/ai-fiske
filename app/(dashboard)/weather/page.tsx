'use client';

import { useAuth } from "@/components/AuthProvider";
import { ArrowLeft, Cloud, ArrowUpRight, Wind, Droplets, MapPin, Gauge, Sun, CloudRain, CloudSnow, CloudLightning, ArrowDownRight, ArrowRight as ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

// WMO Weather interpretation
function getWeatherCodeDescription(code: number) {
    if (code === 0) return { text: "Klart", icon: Sun };
    if (code === 1) return { text: "Mestadels klart", icon: Sun };
    if (code === 2) return { text: "Halvklart", icon: Cloud };
    if (code === 3) return { text: "Mulet", icon: Cloud };
    if (code === 45 || code === 48) return { text: "Dimma", icon: Cloud };
    if (code >= 51 && code <= 55) return { text: "Duggregn", icon: CloudRain };
    if (code >= 61 && code <= 65) return { text: "Regn", icon: CloudRain };
    if (code >= 71 && code <= 77) return { text: "Snö", icon: CloudSnow };
    if (code >= 80 && code <= 82) return { text: "Regnskurar", icon: CloudRain };
    if (code >= 85 && code <= 86) return { text: "Snöbyar", icon: CloudSnow };
    if (code >= 95 && code <= 99) return { text: "Åska", icon: CloudLightning };
    return { text: "Växlande", icon: Cloud };
}

function getWindDirection(degree: number) {
    const directions = ["N", "NO", "O", "SO", "S", "SV", "V", "NV"];
    const index = Math.round(((degree %= 360) < 0 ? degree + 360 : degree) / 45) % 8;
    return directions[index];
}

export default function WeatherPage() {
    const { loading } = useAuth();
    const [weatherData, setWeatherData] = useState<any>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [locationName, setLocationName] = useState("Din Plats");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number, locName: string) => {
            try {
                // Open-Meteo Current & Past Hourly (for pressure trend)
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&hourly=surface_pressure&past_hours=3&forecast_days=1`;
                
                const response = await fetch(url);
                if (!response.ok) throw new Error("Kunde inte hämta väderdata");
                
                const data = await response.json();
                
                if (!data.current) throw new Error("Saknar väderdata för platsen");

                const currentTemp = Math.round(data.current.temperature_2m);
                const currentPressure = Math.round(data.current.surface_pressure);
                const windSpeed = Math.round(data.current.wind_speed_10m);
                const windDirDeg = data.current.wind_direction_10m;
                const windDirStr = getWindDirection(windDirDeg);
                const weatherInfo = getWeatherCodeDescription(data.current.weather_code);
                
                // Pressure trend: current vs 3 hours ago
                let pastPressure = currentPressure;
                let trendIcon = ArrowRightIcon;
                let trendStr = "Stabilt";
                let trendVal = 0;
                
                if (data.hourly && data.hourly.surface_pressure && data.hourly.surface_pressure.length > 0) {
                    const times = data.hourly.time;
                    const pressures = data.hourly.surface_pressure;
                    // Find index of 3 hours ago
                    const pastIndex = 0; // standard hourly array begins at past_hours
                    if (pressures[pastIndex]) {
                        pastPressure = pressures[pastIndex];
                        trendVal = currentPressure - pastPressure;
                        
                        if (trendVal >= 1.5) {
                            trendStr = "Stigande";
                            trendIcon = ArrowUpRight;
                        } else if (trendVal <= -1.5) {
                            trendStr = "Sjunkande";
                            trendIcon = ArrowDownRight;
                        } else {
                            trendStr = "Stabilt";
                            trendIcon = ArrowRightIcon;
                        }
                    }
                }

                // Fishing recommendation logic
                let rec = "";
                if (trendVal >= 1.5) {
                    rec = `Det stigande lufttrycket (${currentPressure} hPa) är ofta en bra indikator för aktiv abborre och gädda. De tenderar att jaga mer frekvent under tiden trycket ökar.`;
                } else if (trendVal <= -1.5) {
                    rec = `Lufttrycket sjunker kraftigt (${currentPressure} hPa). Fisket kan vara trögt just nu, men det kan smälla till intensivt strax innan en front eller åskväder drar in.`;
                } else if (currentPressure > 1015) {
                    rec = `Lufttrycket är stabilt och högt (${currentPressure} hPa). Bra förhållanden, fisken brukar sprida ut sig mer och jaga fritt.`;
                } else {
                    rec = `Lufttrycket är lågt och stabilt (${currentPressure} hPa). Välj beten som går lite lägre där fisken tenderar att trycka, och fiska långsammare.`;
                }

                if (windSpeed > 8) {
                    rec += ` Starka vindar på ${windSpeed} m/s ${windDirStr}. Hitta lävikar om du kan, men kom ihåg att fisken ofta samlas där vinden driver in bytesfisk.`;
                } else if (windSpeed > 3) {
                    rec += ` ${windDirStr}-vindarna på ${windSpeed} m/s rör om ytvattnet, vilket generellt sätter igång fisket ordentligt!`;
                }

                setWeatherData({
                    temp: currentTemp,
                    condition: weatherInfo.text,
                    Icon: weatherInfo.icon,
                    windSpeed: windSpeed,
                    windDirection: windDirStr,
                    pressure: currentPressure,
                    pressureTrend: trendStr,
                    TrendIcon: trendIcon,
                    location: locName,
                    recommendation: rec
                });

                setIsLoadingData(false);
            } catch (err) {
                console.error(err);
                setErrorMsg("Något gick fel vid hämtning av väder.");
                setIsLoadingData(false);
            }
        };

        const fallbackLocation = () => {
            setLocationName("Stockholm (Standardplats)");
            fetchWeather(59.3293, 18.0686, "Stockholm"); // fallback to STHLM
        };

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    
                    // Optional: Reverse geocoding could be added here for precise city name, 
                    // skipping it to keep API calls minimal and fast for now.
                    setLocationName("Din GPS Plats");
                    fetchWeather(lat, lon, "Din position");
                },
                (error) => {
                    console.warn("Geolocation Error/Denied", error);
                    fallbackLocation();
                },
                { timeout: 7000 }
            );
        } else {
            fallbackLocation();
        }

    }, []);

    if (loading) return null;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <header className="flex items-center gap-4 mb-8">
                <Link 
                    href="/dashboard"
                    className="p-2 bg-[#132738] rounded-xl hover:bg-[#1a334a] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">Väder & Lufttryck</h1>
                    <p className="text-muted-foreground text-sm">Fiskeprognos baserad på din plats</p>
                </div>
            </header>

            {isLoadingData ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Cloud className="w-12 h-12 text-primary animate-pulse" />
                    <p className="text-muted-foreground animate-pulse text-sm">Lokaliserar och hämtar väderdata...</p>
                </div>
            ) : errorMsg ? (
                 <div className="text-center py-10 bg-red-500/10 rounded-2xl border border-red-500/20">
                     <p className="text-red-400 font-bold mb-2">{errorMsg}</p>
                     <p className="text-red-400/70 text-sm">Prova ladda om sidan, eller säkerställ att platstjänster är aktiverat.</p>
                 </div>
            ) : weatherData && (
                <div className="space-y-6">
                    {/* Main Weather Card */}
                    <div className="bg-gradient-to-br from-[#1E3A54] to-[#132738] rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 border border-[#2A4B6B] relative overflow-hidden">
                        
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        
                        <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-widest uppercase mb-6">
                            <MapPin className="w-4 h-4" />
                            {weatherData.location}
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
                            <div className="flex items-center gap-6">
                                <div className="bg-primary/20 p-5 rounded-full">
                                    <weatherData.Icon className="w-12 h-12 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-white font-bold text-5xl mb-2">{weatherData.temp}°C</h2>
                                    <p className="text-xl text-primary font-medium">{weatherData.condition}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 mt-8 md:mt-12 gap-4">
                            <div className="bg-[#0B1E2D]/50 rounded-2xl p-4 flex flex-col justify-center border border-[#2A4B6B]/30">
                                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2 flex items-center gap-2">
                                    <Wind className="w-4 h-4 text-primary" /> Vind
                                </span>
                                <span className="text-white font-bold text-2xl">{weatherData.windSpeed} <span className="text-sm font-normal text-muted-foreground">m/s {weatherData.windDirection}</span></span>
                            </div>
                            <div className="bg-[#0B1E2D]/50 rounded-2xl p-4 flex flex-col justify-center border border-[#2A4B6B]/30">
                                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2 flex items-center gap-2">
                                    <Gauge className="w-4 h-4 text-primary" /> Lufttryck
                                </span>
                                <span className="text-white font-bold text-2xl">{weatherData.pressure} <span className="text-sm font-normal text-muted-foreground">hPa</span></span>
                                <p className="text-xs mt-1 text-primary flex items-center gap-1 font-bold tracking-wider uppercase">
                                    <weatherData.TrendIcon className="w-3 h-3" /> {weatherData.pressureTrend} trend
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Fishing recommendation */}
                    <div className="bg-[#132738] border-l-4 border-primary rounded-2xl p-5 shadow-lg border border-[#2A4B6B]/50 animate-in slide-in-from-bottom-4 duration-700 fade-in fill-mode-both">
                        <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                            <Droplets className="w-5 h-5 text-primary" /> 
                            Fiskeutsikter just nu
                        </h3>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                            {weatherData.recommendation}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
