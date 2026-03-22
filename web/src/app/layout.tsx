import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "JobPilot — AI-Powered Job Search",
  description: "Autonomous job search and application management powered by Claude AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <TRPCProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TRPCProvider>
      </body>
    </html>
  );
}
