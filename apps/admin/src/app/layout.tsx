import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AdminProviders from "@/components/AdminProviders";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "StuNet Admin",
  description: "Campus administration portal — restricted access.",
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
