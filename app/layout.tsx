import type { Metadata } from "next";

import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-sans/700.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";

const themeBootstrapScript = `
  (() => {
    try {
      const savedTheme = window.localStorage.getItem("portfolio-theme");
      const theme = savedTheme === "light" ? "light" : "dark";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
    }
  })();
`;

export const metadata: Metadata = {
  title: "amaganti.com",
  description: "Anurag Maganti's personal website",
  metadataBase: new URL("https://amaganti.com"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "amaganti.com",
    description: "Anurag Maganti's personal website",
    url: "https://amaganti.com",
    siteName: "amaganti.com",
    type: "website",
    images: [
      {
        url: "/metadata/metadataImg.png",
        width: 1210,
        height: 778,
        alt: "amaganti.com share preview image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "amaganti.com",
    description: "Anurag Maganti's personal website",
    images: [
      {
        url: "/metadata/metadataImg.png",
        alt: "amaganti.com share preview image",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
