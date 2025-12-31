import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Welber",
  description: "Next.js application created for Project Welber",
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
