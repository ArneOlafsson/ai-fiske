import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AI Fiskeassistent - Din Smarta Fiskeguide",
  description: "Identifiera fiskarter med AI, hitta hemliga fiskevatten och få skräddarsydda recept. Din kompletta guide till bättre fiske.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "AI Fiskeassistent - Identifiera Fisk & Hitta Vatten",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${inter.className} antialiased min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
