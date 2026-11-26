<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project context

This is Konatsu Koko’s CT390 Rapid Prototyping with AI final project for Advertising & Digital Design at FIT. Migrate and enhance the owner’s existing [Framer portfolio](https://konatsukoko.com/) in the [GitHub repository](https://github.com/jovial557/koko-portfolio-v2). Use the existing site and owner-provided Framer materials as the visual and behavioral baseline.

## Migration rules

- Preserve typography, spacing, layouts, animations, microinteractions, and responsive behavior. Get explicit approval for redesigns. Use approved copy and assets. Record missing references without inventing portfolio content, project imagery, or design details.
- Reuse available exported Framer React and TypeScript components and preserve their behavior. Adapt Framer-specific dependencies where needed. Keep working code and avoid unnecessary dependencies or abstractions.
- Use the existing Next.js App Router, React, TypeScript, and Tailwind CSS, with Motion for animation and next-intl for localization. Inspect installed dependencies and versions before adding packages.
- Build shared components for English and Japanese at `/en` and `/ja`. Keep translations separate from component logic. Preserve the equivalent page and Carrot conversation when switching languages wherever possible. Verify Japanese typography, wrapping, and responsive layouts. Japanese translations require the owner’s review before they are final.
- Explain significant architectural decisions before implementing them. Work incrementally and verify each change. Prioritize accessibility, responsiveness, performance, and maintainability.

## Carrot

- Preserve Carrot’s pixel-art sprites, autonomous hopping and idle behavior, chat UI, laptop animation during processing, bilingual conversation, personalized voice playback, and project recommendations and links.
- Use the Vercel AI SDK with Gemini 2.5 Flash Lite through Vercel AI Gateway. Ground responses in curated, approved portfolio content, preserve Carrot’s personality, and support follow-up questions with bounded conversation context.
- Retain the rule-based TypeScript engine as the fallback. Enforce rate limits and spending controls on the server. Keep provider credentials and confidential assets out of client bundles and version control.

## Release boundaries

- Use GitHub for version control and Vercel for deployment. Obtain explicit owner approval before deploying to production or changing the production domain.
- Leave the existing Framer project and publication untouched. Never commit API keys, secrets, or confidential assets.
