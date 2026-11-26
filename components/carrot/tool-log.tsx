import { portfolioSections, projectRegistry, resumeUrl, type ProjectId } from "@/lib/carrot/project-links";
import type { ToolEntry } from "@/lib/carrot/tool-contract";
import styles from "./carrot.module.css";

type Action = { label: string } & ({ href: string } | { elementId: string } | { project: ProjectId });

function describe(entry: ToolEntry): { command: string; status: string; action?: Action } {
  if ("rejected" in entry) return { command: entry.rejected, status: "Arguments rejected." };

  const { result } = entry;
  if ("project" in result) {
    const { title, description, href } = projectRegistry[result.project];
    const command = `${result.name}("${result.project}")`;
    if (result.name === "recommendProject") {
      return { command, status: `${title} · ${description}`, action: { label: `Guide me to ${title}`, project: result.project } };
    }
    if (result.name === "highlightProject") {
      return { command, status: `${title} found.`, action: { label: `Guide me to ${title}`, project: result.project } };
    }
    return href
      ? { command, status: `${title} found.`, action: { label: `Open ${title}`, href } }
      : { command, status: "No approved project link." };
  }
  if (result.name === "scrollToSection") {
    const { title, elementId } = portfolioSections[result.section];
    return {
      command: `scrollToSection("${result.section}")`,
      status: `${title} found.`,
      action: { label: `Go to ${title}`, elementId },
    };
  }
  if (result.name === "openResume") {
    return {
      command: "openResume()",
      status: "Public résumé found.",
      action: { label: "Open Kokona’s résumé", href: resumeUrl },
    };
  }
  return { command: "showContact()", status: "No verified public contact details available." };
}

export function ToolLog({ entries, reduced, ready, onGuide }: {
  entries: ToolEntry[];
  reduced: boolean;
  ready: boolean;
  onGuide: (project: ProjectId) => void;
}) {
  function reveal(elementId: string) {
    document.getElementById(elementId)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center" });
  }

  return (
    <ul className={styles.toolLog} aria-label="Carrot tool results">
      {entries.map((entry) => {
        const { command, status, action } = describe(entry);
        return (
          <li key={entry.id}>
            <code>{command}</code>
            <div>{("rejected" in entry || ("result" in entry && entry.result.name === "showContact")) ? "·" : "✓"} {status}</div>
            {ready && action && ("href" in action ? (
              <a href={action.href} target="_blank" rel="noopener noreferrer">{action.label} ↗</a>
            ) : (
              <button type="button" onClick={() => "project" in action ? onGuide(action.project) : reveal(action.elementId)}>{action.label} ↓</button>
            ))}
          </li>
        );
      })}
    </ul>
  );
}
