import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
import { PortalProvider } from "@/components/providers/PortalProvider";
import localFont from "next/font/local";
import "./globals.css";
import { initializeTaiwanTimezone } from "@/lib/timezone";

// 初始化台灣時區
initializeTaiwanTimezone();

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const sarasaGothic = localFont({
  src: [
    {
      path: "../public/fonts/SarasaGothicTC-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../public/fonts/SarasaGothicTC-ExtraLightItalic.ttf",
      weight: "200",
      style: "italic",
    },
    {
      path: "../public/fonts/SarasaGothicTC-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/SarasaGothicTC-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../public/fonts/SarasaGothicTC-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/SarasaGothicTC-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/SarasaGothicTC-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/SarasaGothicTC-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../public/fonts/SarasaGothicTC-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/SarasaGothicTC-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-sarasa-gothic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "博政整合工程開發有限公司",
  description: "博政整合工程開發有限公司",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sarasaGothic.variable} antialiased`}
      >
        <SessionProvider>
          <PortalProvider>
            {children}
            <div id="portal-root" className="relative z-[9999]" />
          </PortalProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
