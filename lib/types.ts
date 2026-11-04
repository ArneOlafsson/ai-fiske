import { Timestamp } from "firebase/firestore";

export type UserRole = "guest" | "user" | "admin";
export type PremiumType = "none" | "lifetime" | "trial" | "yearly_2026" | "yearly_2027" | "subscription";

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    createdAt: Timestamp;
    isPremium: boolean;
    premiumType: PremiumType;
    premiumExpiresAt?: Timestamp;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: "active" | "canceled" | "past_due";
    stripePaymentStatus?: string;
    aiQuotaTotal: number;
    aiQuotaUsed: number;
    role: UserRole;
    banned: boolean;
}

export interface AiResult {
    fishNameSv: string;
    fishNameLatin: string;
    confidence?: number;
    descriptionShort: string;
    edible: "Ja" | "Nej" | "Beror på";
    edibleNotes: string;
    recipeTitle: string;
    recipeIngredients: string[];
    recipeSteps: string[];
    cookingMethod: string;
}

export interface LureInfo {
    name: string; // T.ex. "Buster Jerk"
    brand?: string; // T.ex. "Strike Pro"
    color?: string; // T.ex. "Skitmörten (C041)"
    type?: "Jerkbait" | "Spinnare" | "Jigg" | "Wobbler" | "Fluga" | "Skeddrag" | "Mete" | "Annat";
    weightGrams?: number;
    lengthCm?: number;
}

export interface CatchWeatherLog {
    temp?: number;
    windSpeed?: number;
    windDirection?: string;
    pressure?: number;
    biteIndex?: number;
}

export interface Catch {
    id: string; // Document ID
    ownerUid: string;
    ownerName?: string | null;
    imageUrl: string;
    thumbnailUrl?: string; // Optimerad WebP-miniatyr för snabb laddning i mobilen
    mediaType?: 'image' | 'video';
    createdAt: Timestamp;
    locationText: string;
    locationGeo?: { lat: number; lng: number };
    waterType: "sjö" | "älv" | "hav";
    comment: string;
    isPublic: boolean;
    aiResult?: AiResult;
    weightKg?: number; // Fångstvikt t.ex. 8.4
    lengthCm?: number; // Fångstlängd t.ex. 104
    lure?: LureInfo; // Drag/bete som användes
    weatherLogged?: CatchWeatherLog; // Väderlogg vid huggtillfället
    likesCount: number;
    commentsCount?: number;
}

export interface Comment {
    id: string;
    uid: string;
    displayName: string;
    photoURL?: string | null;
    text: string;
    createdAt: Timestamp;
    parentId?: string | null;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    createdAt: Timestamp;
}

export interface FishingSpot {
    name: string;
    type: string;
    season: string;
    tips: string;
    coordinates?: { lat: number; lng: number };
}

export interface Like {
    catchId: string;
    uid: string;
    createdAt: Timestamp;
}
