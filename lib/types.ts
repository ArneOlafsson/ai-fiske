import { Timestamp } from "firebase/firestore";

export type UserRole = "guest" | "user" | "admin";
export type PremiumType = "none" | "lifetime" | "trial";

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

export interface Catch {
    id: string; // Document ID
    ownerUid: string;
    imageUrl: string;
    createdAt: Timestamp;
    locationText: string;
    locationGeo?: { lat: number; lng: number };
    waterType: "sjö" | "älv" | "hav";
    comment: string;
    isPublic: boolean;
    aiResult?: AiResult;
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
