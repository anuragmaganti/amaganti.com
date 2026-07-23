import type { Metadata } from "next";

import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-sans/700.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { siteConfig } from "@/config/portfolio";
import { themeConfig } from "@/config/visual";

import "./globals.css";

const themeBootstrapScript = `
  (() => {
    try {
      const savedTheme = window.localStorage.getItem(${JSON.stringify(themeConfig.storageKey)});
      const theme = savedTheme === "light" ? "light" : ${JSON.stringify(themeConfig.defaultTheme)};
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = ${JSON.stringify(themeConfig.defaultTheme)};
      document.documentElement.style.colorScheme = ${JSON.stringify(themeConfig.defaultTheme)};
    }
  })();
`;

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.title,
    type: "website",
    images: [
      {
        url: siteConfig.socialPreview.src,
        width: siteConfig.socialPreview.width,
        height: siteConfig.socialPreview.height,
        alt: siteConfig.socialPreview.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.socialPreview.src,
        alt: siteConfig.socialPreview.alt,
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
    <html
      lang="en"
      data-theme={themeConfig.defaultTheme}
      suppressHydrationWarning
    >
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
