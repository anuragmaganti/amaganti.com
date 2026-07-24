type ContentTextSegment = {
  type: "text";
  text: string;
};

type ContentLinkSegment = {
  type: "link";
  text: string;
  href: string;
  external?: boolean;
};

export type ContentParagraph = {
  id: string;
  segments: readonly (ContentTextSegment | ContentLinkSegment)[];
  reveal: {
    enter: readonly [number, number];
    from: "left" | "right" | "bottom";
    exitTo: "left" | "right";
  };
};

export type ContentSectionEntry = {
  id: string;
  title: string;
  layout: "top-overlay";
  exit: readonly [number, number];
  paragraphs: readonly ContentParagraph[];
};

export const contentSections = [
  {
    id: "about-me",
    title: "About Me",
    layout: "top-overlay",
    exit: [0.58, 0.82],
    paragraphs: [
      {
        id: "systems",
        segments: [
          {
            type: "text",
            text: "I fell in love with interconnected systems as a researcher in cell biology and cancer, where I saw delicate molecular interactions ripple outward and shape the behavior of cellular systems.",
          },
        ],
        reveal: { enter: [-0.22, -0.12], from: "left", exitTo: "right" },
      },
      {
        id: "software",
        segments: [
          {
            type: "text",
            text: "That same fascination drew me to software engineering. I’ve spent the past two years ",
          },
          {
            type: "link",
            text: "building a startup in the digital asset space by creating software for evolving markets.",
            href: "https://www.nuopact.com/",
            external: true,
          },
        ],
        reveal: { enter: [-0.17, -0.07], from: "right", exitTo: "left" },
      },
      {
        id: "curiosity",
        segments: [
          {
            type: "text",
            text: "My journey has been an extension of that same curiosity, a chance to explore how code and people interact and to build tools within systems that are constantly evolving.",
          },
        ],
        reveal: { enter: [-0.12, -0.02], from: "left", exitTo: "right" },
      },
    ],
  },
] as const satisfies readonly ContentSectionEntry[];

export type ContentSectionId = (typeof contentSections)[number]["id"];

export const contentSectionsById = contentSections.reduce<
  Record<ContentSectionId, ContentSectionEntry>
>(
  (index, section) => {
    index[section.id] = section;
    return index;
  },
  {} as Record<ContentSectionId, ContentSectionEntry>,
);
