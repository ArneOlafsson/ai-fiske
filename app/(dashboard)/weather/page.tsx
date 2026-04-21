'use client';

import { useAuth } from "@/components/AuthProvider";
import { ArrowLeft, Cloud, ArrowUpRight, Wind, Droplets, MapPin, Gauge, Sun, CloudRain, CloudSnow, CloudLightning, ArrowDownRight, ArrowRight as ArrowRightIcon, Search, X, Loader2, Crosshair } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/primitives";

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
    
    // Search states
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const fetchWeather = async (lat: number, lon: number, locName: string) => {
        setIsLoadingData(true);
        setErrorMsg("");
        setShowSearch(false);
        try {
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
            
            let pastPressure = currentPressure;
            let trendIcon = ArrowRightIcon;
            let trendStr = "Stabilt";
            let trendVal = 0;
            
            if (data.hourly && data.hourly.surface_pressure && data.hourly.surface_pressure.length > 0) {
                const pressures = data.hourly.surface_pressure;
                const pastIndex = 0;
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

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=sv&format=json`);
            const data = await res.json();
            setSearchResults(data.results || []);
        } catch(err) {
            console.error(err);
        }
        setIsSearching(false);
    };

    const fetchCurrentLocation = () => {
        setIsLoadingData(true);
        setShowSearch(false);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude, "Din GPS Position");
                },
                (error) => {
                    console.warn("Geolocation Error", error);
                    fetchWeather(59.3293, 18.0686, "Stockholm (Standard)");
                },
                { timeout: 7000 }
            );
        } else {
            fetchWeather(59.3293, 18.0686, "Stockholm (Standard)");
        }
    };

    useEffect(() => {
        fetchCurrentLocation();
    }, []);

    if (loading) return null;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500 relative">
            <header className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <Link 
                        href="/dashboard"
                        className="p-2 bg-[#132738] rounded-xl hover:bg-[#1a334a] transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Väder</h1>
                        <p className="text-muted-foreground text-sm">Lokala fiskeutsikter</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowSearch(!showSearch)} className="bg-[#132738] border-[#2A4B6B] text-white">
                    <Search className="w-4 h-4" />
                </Button>
            </header>

            {/* Search Modal / Dropdown */}
            {showSearch && (
                <div className="bg-[#132738] rounded-2xl p-4 border border-[#2A4B6B] shadow-xl animate-in slide-in-from-top-2 absolute w-full z-50">
                    <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Sök stad eller sjö..."
                            className="flex-1 bg-[#0B1E2D] border border-[#2A4B6B] rounded-lg px-4 py-2 text-white outline-none focus:border-primary transition-colors"
                        />
                        <Button type="submit" disabled={isSearching} className="bg-primary text-[#0B1E2D]">
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sök"}
                        </Button>
                    </form>
                    
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm text-muted-foreground hover:text-white mb-2"
                        onClick={fetchCurrentLocation}
                    >
                        <Crosshair className="w-4 h-4 mr-2" /> Använd min GPS-position
                    </Button>

                    <div className="space-y-2">
                        {searchResults.map((result: any) => (
                            <button
                                key={`${result.id}`}
                                className="w-full text-left p-3 rounded-lg hover:bg-[#1E3A54] transition-colors bg-[#0B1E2D]/50 border border-transparent hover:border-[#2A4B6B]"
                                onClick={() => fetchWeather(result.latitude, result.longitude, `${result.name}${result.admin1 ? `, ${result.admin1}` : ''}`)}
                            >
                                <div className="text-white font-bold">{result.name}</div>
                                <div className="text-xs text-muted-foreground">{result.admin1}, {result.country}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

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
                <div className={`space-y-6 transition-opacity ${showSearch ? 'opacity-30 pointer-events-none' : ''}`}>
                    {/* Main Weather Card */}
                    <div className="bg-gradient-to-br from-[#1E3A54] to-[#132738] rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 border border-[#2A4B6B] relative overflow-hidden">
                        
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        
                        <button onClick={() => setShowSearch(true)} className="group flex items-center gap-2 text-primary font-bold text-xs tracking-widest uppercase mb-6 hover:text-white transition-colors bg-[#0B1E2D]/30 px-3 py-1.5 rounded-full border border-primary/20">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">{weatherData.location}</span>
                            <Search className="w-3 h-3 ml-1 opacity-50 group-hover:opacity-100" />
                        </button>

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
