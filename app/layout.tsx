import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WFT - Walber Filho Transportes",
  description: "Pagina da Walber Filho Transportes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
