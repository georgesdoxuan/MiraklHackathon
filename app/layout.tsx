import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirakl Connect — BDR Intelligence",
  description: "Plateforme de prospection B2B pour l'équipe BDR Mirakl Connect",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
