import "server-only";

import { jsonSchema, tool } from "ai";
import { isProjectId, isSectionId, portfolioSections, projectRegistry } from "./project-links";
import { prepareProjectGuide, type PortfolioToolResult } from "./tool-contract";

function enumInput<Key extends string, Value extends string>(
  key: Key,
  values: string[],
  isAllowed: (value: unknown) => value is Value,
) {
  return jsonSchema<Record<Key, Value>>({
    type: "object",
    properties: { [key]: { type: "string", enum: values } },
    required: [key],
    additionalProperties: false,
  }, {
    validate(value) {
      if (value && typeof value === "object" && Object.keys(value).length === 1 &&
          Object.hasOwn(value, key) && isAllowed((value as Record<string, unknown>)[key])) {
        return { success: true, value: value as Record<Key, Value> };
      }
      return { success: false, error: new Error("Unapproved tool argument") };
    },
  });
}

const confirmation = { state: "awaiting_visitor_click", performed: false } as const;

const projects = enumInput("project", Object.keys(projectRegistry), isProjectId);
const sections = enumInput("section", Object.keys(portfolioSections), isSectionId);
const empty = jsonSchema<Record<string, never>>({
  type: "object", properties: {}, additionalProperties: false,
}, {
  validate(value) {
    return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0
      ? { success: true, value: {} }
      : { success: false, error: new Error("Unexpected tool arguments") };
  },
});

export const portfolioTools = {
  recommendProject: tool({
    description: "Recommend a project based on the visitor's interests. MUJI: e-commerce and product design. Redline: film and creative technology. NYPL: identity and brand design. The coming-soon row has no public details and should only be used when explicitly requested.",
    inputSchema: projects,
    execute: ({ project }) => ({
      name: "recommendProject", project, recommendation: projectRegistry[project].description,
    } satisfies PortfolioToolResult & { recommendation: string }),
  }),
  highlightProject: tool({
    description: "Offer a visitor-controlled action to have Carrot guide the visitor to an approved Selected Works row, including coming-soon.",
    inputSchema: projects,
    execute: ({ project }) => prepareProjectGuide(project),
  }),
  scrollToSection: tool({
    description: "Offer a visitor-controlled action to scroll to Introduction or Selected Works on the homepage.",
    inputSchema: sections,
    execute: ({ section }) => ({ ...confirmation, name: "scrollToSection", section } satisfies PortfolioToolResult & typeof confirmation),
  }),
  openProject: tool({
    description: "Offer a visitor-controlled link to an approved project. Only MUJI and NYPL have approved destinations. For Redline, offer highlightProject instead.",
    inputSchema: enumInput("project", ["muji", "nypl"], (value): value is "muji" | "nypl" => value === "muji" || value === "nypl"),
    execute: ({ project }) => ({ ...confirmation, name: "openProject", project } satisfies PortfolioToolResult & typeof confirmation),
  }),
  openResume: tool({
    description: "Offer a visitor-controlled link to Kokona's public résumé.",
    inputSchema: empty,
    execute: () => ({ ...confirmation, name: "openResume" } satisfies PortfolioToolResult & typeof confirmation),
  }),
  showContact: tool({
    description: "Look up approved public professional contact information when asked how to contact Kokona.",
    inputSchema: empty,
    execute: () => ({
      name: "showContact", available: false,
    } satisfies PortfolioToolResult & { available: boolean }),
  }),
};
