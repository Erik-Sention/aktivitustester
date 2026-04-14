import type { Metadata } from "next";
import { Playfair_Display, Rajdhani } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const rajdhani = Rajdhani({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "AktivitusTester",
  description: "Client and performance test management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" className={`${playfair.variable} ${rajdhani.variable}`}>
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
