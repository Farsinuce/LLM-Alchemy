import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Jersey_10, Pixelify_Sans } from "next/font/google";
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

const jersey10 = Jersey_10({
  variable: "--font-jersey-10",
  subsets: ["latin"],
  weight: "400",
});

const pixelifySans = Pixelify_Sans({
  variable: "--font-pixelify-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        {/* Preconnect to Turnstile for faster loading */}
        <link rel="preconnect" href="https://challenges.cloudflare.com" />
        <link rel="dns-prefetch" href="https://challenges.cloudflare.com" />
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
      </head>
      <body
        className={`${geist.variable} ${geistMono.variable} ${jersey10.variable} ${pixelifySans.variable} antialiased`}
      >
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
