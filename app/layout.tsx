import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm" });

import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Bertlids - Din Smarta Fiskeguide",
  description: "Identifiera fiskarter med AI, hitta hemliga fiskevatten och få skräddarsydda recept. Din kompletta guide till bättre fiske.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png?v=2",
    apple: "/icon-192.png?v=2",
  },
  openGraph: {
    title: "Bertlids Tips, Trix och Utrustning",
    description: "Ladda upp en bild på din fångst och få svar direkt. Hitta nya smultronställen och bli en bättre fiskare med AI.",
    url: "https://ai-fiske-app-2026.web.app",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "AI Fiskeassistent Logo",
      },
    ],
  },
};

import { AuthProvider } from "@/components/AuthProvider";
import { Analytics } from "@vercel/analytics/next";
import AutoUpdater from "@/components/AutoUpdater";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${dmSans.className} ${playfair.variable} antialiased min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <AutoUpdater />
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
