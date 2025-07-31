import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/components/auth/SupabaseProvider";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSans3 = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "LLM Alchemy - AI Element Combination Game",
  description: "Discover new elements by combining existing ones using the power of AI. Choose between Science mode for realistic combinations or Creative mode for imaginative results!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Mobile viewport configuration */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        {/* Preconnect to Turnstile for faster loading */}
        <link rel="preconnect" href="https://challenges.cloudflare.com" />
        <link rel="dns-prefetch" href="https://challenges.cloudflare.com" />
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
      </head>
      <body
        className={`${geist.variable} ${geistMono.variable} ${sourceSans3.variable} antialiased`}
      >
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
