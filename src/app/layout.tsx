import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { themeInitScript } from "@/components/ThemeToggle";
import { SessionGuard } from "@/components/auth/SessionGuard";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Travelism — Your travel intelligence agency",
  description:
    "Brief an intelligent travel intelligence team. Watch them investigate, then assemble a complete, evidence-backed trip.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <SessionGuard />
        {children}
      </body>
    </html>
  );
}
