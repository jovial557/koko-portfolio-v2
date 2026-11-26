import { isProjectId, isSectionId, type ProjectId, type SectionId } from "./project-links";

export const toolNames = [
  "recommendProject", "highlightProject", "scrollToSection", "openProject", "openResume", "showContact",
] as const;

export type ToolName = (typeof toolNames)[number];
export type PortfolioToolResult =
  | { name: "recommendProject" | "highlightProject" | "openProject"; project: ProjectId }
  | { name: "scrollToSection"; section: SectionId }
  | { name: "openResume" | "showContact" };

export function prepareProjectGuide(project: ProjectId) {
  return { name: "highlightProject", project, state: "awaiting_visitor_click", performed: false } as const;
}

export type ToolEntry = { id: string; result: PortfolioToolResult } | { id: string; rejected: ToolName };

export function isToolName(value: unknown): value is ToolName {
  return toolNames.some((name) => name === value);
}

export function readToolResult(output: unknown): PortfolioToolResult | null {
  if (!output || typeof output !== "object" || !("name" in output)) return null;
  switch (output.name) {
    case "recommendProject":
    case "highlightProject":
    case "openProject":
      return "project" in output && isProjectId(output.project)
        ? { name: output.name, project: output.project }
        : null;
    case "scrollToSection":
      return "section" in output && isSectionId(output.section)
        ? { name: output.name, section: output.section }
        : null;
    case "openResume":
    case "showContact":
      return { name: output.name };
    default:
      return null;
  }
}
