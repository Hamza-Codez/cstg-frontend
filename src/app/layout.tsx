import type { Metadata } from "next";
import { Inter } from "next/font/google";

// tokens.css first: globals.css and every component read these variables.
import "@/styles/tokens.css";
import "./globals.css";

import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Support Engine",
  description: "Customer support ticket and SLA automation engine",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-canvas text-text antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
