import type { Metadata } from "next";
import { JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "TruthLens",
  description: "Real-time claim analysis powered by Nemotron 3 Super",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark h-full", mono.variable, "font-sans", geist.variable)}>
      <body className="h-full font-[family-name:var(--font-mono)]">
        {children}
      </body>
    </html>
  );
}
