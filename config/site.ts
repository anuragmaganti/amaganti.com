export type SiteConfig = {
  name: string;
  shortName: string;
  title: string;
  description: string;
  url: string;
  email: string;
  socialPreview: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
};

export const siteConfig = {
  name: "Anurag Maganti",
  shortName: "Anurag",
  title: "amaganti.com",
  description: "Anurag Maganti's personal website",
  url: "https://amaganti.com",
  email: "amaganti.dev@gmail.com",
  socialPreview: {
    src: "/metadata/metadataImg.png",
    width: 1210,
    height: 778,
    alt: "amaganti.com share preview image",
  },
} as const satisfies SiteConfig;

export type IntroContent = {
  greeting: string;
  name: string;
  summary: string;
  note: string;
};

export const introContent = {
  greeting: "Hi, I'm",
  name: siteConfig.shortName,
  summary:
    "a software engineer obsessed with building products that feel a little bit magical",
  note: "(yep, that's a real LIDAR scan of my head)",
} as const satisfies IntroContent;

export type PortfolioLink = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
};

export const outroLinks = [
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/anuragmaganti",
    external: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/anuragmaganti/",
    external: true,
  },
  {
    id: "email",
    label: "Email me",
    href: `mailto:${siteConfig.email}`,
    external: false,
  },
  {
    id: "publication",
    label: "Nature publication",
    href: "https://www.nature.com/articles/s41586-018-0697-7",
    external: true,
  },
] as const satisfies readonly PortfolioLink[];
