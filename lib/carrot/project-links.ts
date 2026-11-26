export const approvedProjectLinks = {
  "/muji": { href: "https://konatsukoko.com/muji", label: "MUJI case study" },
  "/redline": { href: "https://konatsukoko.com/redline", label: "Redline project" },
  "/nypl": { href: "https://konatsukoko.com/nypl", label: "NYPL case study" },
} as const;

export function isApprovedProjectPath(path: string): path is keyof typeof approvedProjectLinks {
  return Object.hasOwn(approvedProjectLinks, path);
}
