import { projectRegistry, type ProjectId } from "@/lib/carrot/project-links";

export const projectMenuSuggestion = "Guide me to one of her projects.";
export const projectMenuQuestion = "Which project would you like to see?";
export const projectMenuHint = "Just type A, B, or C!";

export const projectMenu = [
  { letter: "A", project: "muji", aliases: ["muji", "first"] },
  { letter: "B", project: "redline", aliases: ["redline", "second"] },
  { letter: "C", project: "nypl", aliases: ["nypl", "new york public library", "third"] },
] as const satisfies readonly { letter: string; project: ProjectId; aliases: readonly string[] }[];

export const projectMenuContext = [
  projectMenuQuestion,
  ...projectMenu.map(({ letter, project }) => `[${letter}] ${projectRegistry[project].title}`),
  projectMenuHint,
].join("\n");

export function readProjectSelection(question: string) {
  const choice = question.toLowerCase().replace(/[.!?]+$/, "").trim()
    .replace(/^(?:(?:could|would|can) you |please )?(?:(?:show me|take me to|guide me to|i(?:'d| would) like(?: to see)?|i(?:'ll| will) (?:take|pick|choose)) )/, "")
    .replace(/^(?:the |option )/, "")
    .replace(/,? please$/, "")
    .replace(/ one$/, "")
    .trim()
    .replace(/^\[([abc])\]$/, "$1");
  return projectMenu.find(({ letter, project, aliases }) =>
    choice === letter.toLowerCase()
    || choice === projectRegistry[project].title.toLowerCase()
    || aliases.some((alias) => alias === choice),
  );
}

export function isInvalidProjectSelection(question: string) {
  return /^(?:option\s+)?(?:\[?[a-z]\]?|\d+|(?:the )?(?:fourth|last)(?: one)?|coming soon)[.!?]*$/i.test(question);
}
