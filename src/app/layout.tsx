import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cyber Shield - Advanced Vulnerability Scanner",
  description: "Next-generation cybersecurity platform for comprehensive vulnerability assessment and threat detection.",
  keywords: ["cybersecurity", "vulnerability scanner", "penetration testing", "security assessment", "threat detection"],
  authors: [{ name: "Cyber Shield Security Team" }],
  openGraph: {
    title: "Cyber Shield - Vulnerability Scanner",
    description: "Advanced cybersecurity platform for threat detection",
    siteName: "Cyber Shield",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cyber Shield - Vulnerability Scanner",
    description: "Advanced cybersecurity platform for threat detection",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground cyber-theme`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
