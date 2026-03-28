import type { Metadata } from "next";
import { Funnel_Display, Roboto_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const funnelDisplay = Funnel_Display({
  variable: "--font-funnel-display",
  subsets: ["latin"],
  weight: ["800"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Comprendo — Understand any codebase, instantly",
  description: "Comprendo maps your TypeScript codebase into an interactive flow graph. See how your code connects, where complexity lives, and what AI changed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${funnelDisplay.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
