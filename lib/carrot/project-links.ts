import english from "@/messages/en.json";

export const projectRegistry = {
  "coming-soon": {
    ...english.home.projects.upcoming,
    description: "An upcoming UX/UI project. Details are not public yet.",
    elementId: "project-coming-soon",
    href: null,
  },
  muji: {
    ...english.home.projects.muji,
    description: "A responsive e-commerce and art direction project exploring more personal online gifting.",
    elementId: "project-muji",
    href: "https://konatsukoko.com/muji",
    linkLabel: "MUJI case study",
  },
  redline: {
    ...english.home.projects.redline,
    description: "An AI-generated short film imagining a futuristic Formula 1 world.",
    elementId: "project-redline",
    href: null,
  },
  nypl: {
    ...english.home.projects.nypl,
    description: "A dynamic visual identity concept for the New York Public Library.",
    elementId: "project-nypl",
    href: "https://konatsukoko.com/nypl",
    linkLabel: "NYPL case study",
  },
} as const;

export type ProjectId = keyof typeof projectRegistry;

export function isProjectId(value: unknown): value is ProjectId {
  return typeof value === "string" && Object.hasOwn(projectRegistry, value);
}

export const approvedProjectLinks = {
  "/muji": { href: projectRegistry.muji.href, label: projectRegistry.muji.linkLabel },
  "/nypl": { href: projectRegistry.nypl.href, label: projectRegistry.nypl.linkLabel },
} as const;

export function isApprovedProjectPath(path: string): path is keyof typeof approvedProjectLinks {
  return Object.hasOwn(approvedProjectLinks, path);
}

export const resumeUrl = "https://drive.google.com/file/u/2/d/1YetGrWqdIx2NNqWrOicrqhrlD6vKiFXW/view?usp=sharing";

export const portfolioSections = {
  introduction: { title: "Introduction", elementId: "intro-title" },
  "selected-works": { title: "Selected Works", elementId: "selected-works" },
} as const;

export type SectionId = keyof typeof portfolioSections;

export function isSectionId(value: unknown): value is SectionId {
  return typeof value === "string" && Object.hasOwn(portfolioSections, value);
}
