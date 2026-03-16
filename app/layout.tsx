import type { Metadata } from "next";

import "@fontsource/montserrat";

import "./globals.css";

export const metadata: Metadata = {
  title: "amaganti.com",
  description:
    "A scroll-driven portfolio exploring cinematic interaction design, spatial systems, and product thinking.",
  metadataBase: new URL("https://example.com"),
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
