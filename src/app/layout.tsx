import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iris - Marketplace Negotiation Agent",
  description: "Help buyers manage and negotiate multiple deals across marketplaces",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-black">
        {children}
      </body>
    </html>
  );
}
