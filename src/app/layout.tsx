import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/components/LenisProvider";
import ConvexClientProvider from "@/components/ConvexClientProvider";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "DocuTube AI — YouTube to Product Documentation SaaS",
  description: "Instantly turn YouTube videos and tutorials into professional PRDs, TRDs, SRSs, API Docs, Test Cases, Database Schemas, and Setup Guides. Powered by Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-background text-foreground`}>
        <ConvexClientProvider>
          <LenisProvider>
            {children}
          </LenisProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
