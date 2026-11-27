<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project context

This is Konatsu Koko’s CT390 Rapid Prototyping with AI final project for Advertising & Digital Design at FIT. Migrate and enhance the owner’s existing [Framer portfolio](https://konatsukoko.com/) in the [GitHub repository](https://github.com/jovial557/koko-portfolio-v2). Use the existing site and owner-provided Framer materials as the visual and behavioral baseline.

## CT390 final scope

- Complete and polish the English homepage first. Follow with a separate Carrot LLM implementation phase, then verify accessibility, performance, and release readiness.
- Serve the English homepage at `/`. Keep existing `/en` links working and temporarily redirect `/ja` routes to their matching English paths. Keep Japanese catalogs and localization infrastructure for a later phase. The public navigation has no language switcher.
- Defer Japanese localization, full project-page migration, and nonessential features outside the homepage. Preserve existing approved Framer project links until their replacements are ready.

## Migration rules

- Preserve typography, spacing, layouts, animations, microinteractions, and responsive behavior. Get explicit approval for redesigns. Use approved copy and assets. Record missing references without inventing portfolio content, project imagery, or design details.
- Reuse available exported Framer React and TypeScript components and preserve their behavior. Adapt Framer-specific dependencies where needed. Keep working code and avoid unnecessary dependencies or abstractions.
- Use the existing Next.js App Router, React, TypeScript, and Tailwind CSS, with Motion for animation and next-intl for localization. Inspect installed dependencies and versions before adding packages.
- Keep translations separate from component logic. Restore public Japanese routes and language switching only when that phase resumes. Review Japanese copy with the owner and verify typography, wrapping, and responsive layouts before release.
- Explain significant architectural decisions before implementing them. Work incrementally and verify each change. Prioritize accessibility, responsiveness, performance, and maintainability.

## Carrot

Implement Carrot in a separate phase after the homepage scope changes. Preserve references for future Japanese conversation.

- Preserve Carrot’s pixel-art sprites, autonomous hopping and idle behavior, chat UI, laptop animation during processing, English conversation, personalized voice playback, and project recommendations and links.
- Use the Vercel AI SDK with Gemini 2.5 Flash Lite through Vercel AI Gateway. Ground responses in curated, approved portfolio content, preserve Carrot’s personality, and support follow-up questions with bounded conversation context.
- Keep the original rule-based TypeScript engine as a migration reference. Surface LLM failures explicitly without substituting a canned reply. Enforce rate limits and spending controls on the server. Keep provider credentials and confidential assets out of client bundles and version control.

## Release boundaries

- Use GitHub for version control and Vercel for deployment. Obtain explicit owner approval before deploying to production or changing the production domain.
- Leave the existing Framer project and publication untouched. Never commit API keys, secrets, or confidential assets.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
