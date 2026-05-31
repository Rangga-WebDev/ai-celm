/** @format */

import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI-CELM",
  description: "AI-integrated Civic Engagement Learning Model",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
