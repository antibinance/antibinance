import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/context/ToastContext";
import NavigationShell from "@/components/NavigationShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AntiBinance - Community Hub for Binance Victims",
  description: "A community platform to track, discuss, and report losses from volatile token listings on Binance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${inter.className} min-h-full bg-binance-dark text-gray-200 antialiased`}>
        <LanguageProvider>
          <ToastProvider>
            <WalletProvider>
              <NavigationShell>{children}</NavigationShell>
            </WalletProvider>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
