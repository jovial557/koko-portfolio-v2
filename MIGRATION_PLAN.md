# Framer portfolio migration plan

## Current project state

The local repository is a Create Next App scaffold. Its Git origin points to the portfolio GitHub repository. The `app/` directory contains a single starter page at `/`, an English-only root layout with Geist and starter metadata, global Tailwind styles, and a starter favicon. The `public/` directory contains starter SVGs. There are no portfolio routes or assets, translation files, Carrot source, chat endpoint, or automated test suite in the checked-in tree. The password-protected Framer homepage was reachable through its normal sign-in flow. The owner supplied a homepage recording covering wide and narrow browser widths. Exact breakpoints and interaction timings still need verification. The owner supplied Carrot’s component source, notes, and ten sprite references outside the repository.

| Area | Installed or configured |
| --- | --- |
| Framework | Next.js 16.4.6, React and React DOM 19.3.0 |
| Styling | Tailwind CSS and its Turbopack integration at 4.3.3 |
| Tooling | TypeScript 5.9.3 with strict checking, ESLint 9.39.5 with Next config 16.4.6, npm lockfile |
| Next configuration | Cache Components, partial prefetching, experimental agent feedback, and a Tailwind Turbopack loader |
| Integrations | Motion, next-intl, and the Vercel AI SDK are absent. Gateway and voice integration are pending. |

The scaffold passed `npm run lint` and `tsc --noEmit --incremental false`. The production build and hosting setup are unverified. Local environment and Vercel link files are ignored by Git.

## Proposed architecture

- Put portfolio pages under `app/[locale]/` with a shared layout and reusable components. Render content on the server where possible. Use client components for interactions that need browser state, including Carrot and any reference-driven motion.
- Use Tailwind and shared CSS for styles measured from the Framer reference. Audit exported React and TypeScript files before porting them. Identify Framer-only layout, events, assets, or runtime hooks and adapt those behind a small interface where necessary. Use Motion where required to reproduce the approved behavior.
- Keep portfolio content and translations outside layout logic. Give projects stable IDs so localized routes, Carrot recommendations, and approved content can use the same project references.
- Use a server-only chat route handler, proposed as `POST /api/carrot/chat`. Keep the knowledge base versioned and file-backed initially. Select relevant entries by page context and the user’s question. This scope can be evaluated with real portfolio questions before adding a database or search service.
- Confirm package compatibility and the exact Gateway model identifier before implementation. Consult the installed Next.js docs for locale routing, route handlers, and caching.

## Development phases

1. **Inventory and parity baseline.** Collect Framer source and assets, map existing public URLs, and record responsive layouts and interactions. Agree on which references govern when the source and published behavior differ.
2. **Bilingual foundation.** Set up locale routing, message catalogs, metadata, a language switcher, and legacy redirect mapping. Verify deep links and the locale transition before migrating the pages.
3. **Portfolio parity.** Port shared layout and pages in small batches using approved content and project imagery. Compare each batch against the applicable desktop, tablet, and mobile references.
4. **Carrot parity and LLM integration.** First restore animations, chat, voice, recommendations, and bilingual rule-based responses. Then add the Gateway-backed conversation path and verify that both engines work through the same UI before enabling live traffic.
5. **Preview and release.** Verify the complete site on a Vercel preview, collect Japanese copy and parity approval, then seek explicit production approval.

## Required Framer assets and source files

| Reference | What to supply |
| --- | --- |
| Pages and responsive states | Public page list and current URLs, plus desktop, tablet, and mobile captures with viewport widths. Include breakpoint definitions or canvas settings if available. |
| Layout and interaction | Read-only design access or screenshots and recordings of navigation, hover and focus states, scroll effects, and transitions. Include component variants and interaction settings where available. |
| Authored source | Available React and TypeScript components, overrides, helpers, dependency lists, component settings, and asset references. If Framer cannot export a page, its canvas settings and published behavior can guide the port. |
| Content and media | Approved English copy, existing Japanese copy or glossary, project ordering and links, original images and videos, icons, fonts and licensing details, alt text, favicon, and social images. |
| Carrot | Component and chat source, rule engine and bilingual response data, sprites and frame maps, animation timings and state transitions, example chats and recommendations, and voice provider, voice IDs, and playback behavior. Share integration details without credentials. |
| Release references | Existing redirects or SEO metadata, and any legacy URLs or external links that must keep working. |

## Homepage recording reference

- Around 0:06–0:12 the recording shows a blue loading screen with a percentage and pixel-art progress animation, then the dark homepage with the “Nice to meet you!” intro, two text columns, and an image preview over the intro.
- Around 0:15–0:33 the desktop view shows compact navigation, numbered Selected Works rows with labels on the right, a floating NYPL image preview, and both dark and light appearances.
- Around 0:36–0:48 the browser narrows from two columns to one. The narrow header uses a menu control, and the MUJI and NYPL images appear inline below their project rows. Carrot remains near the bottom edge at both widths.
- Treat the video as a visual baseline. Verify the exact responsive thresholds, typography, preview triggers, and loader timing against Framer. Source the original homepage images and loader assets before implementation.

## Internationalization

- Use next-intl with explicit `/en` and `/ja` prefixes. Use English as the proposed fallback for visits without an explicit or saved language preference. Agree on how `/` and legacy links should resolve after reviewing the URL inventory. Set the document language and localized metadata for each locale.
- Maintain separate message catalogs for interface text and localized fields for portfolio content. Review the Japanese copy with the owner before release, including navigation, alt text, metadata, and Carrot’s canned responses and voice phrasing.
- Switch locales using the matching route or stable project ID and preserve relevant query parameters and fragments when valid. Keep the current Carrot transcript in browser session storage so it can survive locale navigation. Restore it with validated data and provide a clear-chat action. Default Carrot to the website locale and preserve its existing in-chat language selector. Use the selected conversation language for subsequent turns and keep earlier messages as written.
- Test Japanese typeface coverage, line breaks, line height, mixed-script text, controls, and project titles at the reference widths.

## Carrot integration

- Keep existing character and playback logic independent of the response provider. Keep the laptop sprite active while chat is open, as the source does. Drive the separate thinking indicator from the pending request. Preserve user-initiated playback for completed replies.
- Send the active locale, validated page or project ID, and a bounded set of recent turns to the server. Use approved examples to guide Carrot’s personality. Supply only relevant knowledge-base entries, acknowledge gaps in available facts, and resolve recommendations from known project IDs and localized URLs.
- Use Gemini 2.5 Flash Lite via Vercel AI Gateway and the Vercel AI SDK. Return replies and validated recommendation references in a shape the existing chat UI can consume. Prefer delivering a complete reply initially so voice playback and fallback are predictable.
- Use the rule engine for disabled AI, provider errors or timeouts, and traffic or spending limits. Adapt it to the same reply shape and confirm it can serve visitors during a Gateway or limiter outage. Apply its existing voice behavior subject to separate limits if voice incurs paid requests.

## Carrot source audit and port sequence

### Behavior and code to carry forward

- Reuse the frame selection, randomized hop and pause logic, direction flipping, viewport bounds, responsive sizing, invitation, and keyboard activation. The source advances hop frames every 70 ms and idle and laptop frames every 450 ms. It changes sprite size below 600 px and 1024 px. The code defaults are 50, 58, and 64 px. Confirm actual instance overrides in Framer.
- Opening chat stops movement and switches Carrot to the laptop until chat closes. The source exposes a 4,000 ms laptop duration property, but the open handler keeps laptop mode active throughout the chat. Preserve the observed open/close behavior and remove the simulated 2.45-second reply delay when real networking lands.
- Port the chat markup, motion, suggestion chips, auto-scroll, close and reset actions, per-message playback, and project links. Preserve the 350-character user input and 24-message display/history cap. Keep the request context bounded independently on the server.
- Extract the bodies of `getPortfolioAnswer` and `getJapanesePortfolioAnswer` into a pure TypeScript fallback that takes the language and history explicitly. Review their canned answers as source material for the knowledge base. Verify Redline, MUJI, NYPL, and Bunny Quest against the approved public catalog, including whether and where the Redline case study may be linked.

### Next.js component boundaries

- Keep a shared client-side Carrot shell that coordinates character, chat, and audio. Put movement, frame clocks, resize and timer cleanup in a sprite or movement hook. Port the conversation panel and its existing body portal into a client component with a mount guard. Verify focus on open and close, keyboard activation, and reduced motion.
- Replace `addPropertyControls`, `ControlType`, image control objects, and function component `defaultProps` with typed sprite configuration and explicit defaults. Use the planned Motion package for the source's `motion` and `AnimatePresence` primitives. React DOM portals, browser audio, and the reply rules can carry forward with their respective client or shared boundaries.
- Move labels and suggestions to the message catalogs and keep reply rules and curated project facts outside the chat UI. Use the stable project IDs to resolve localized links and link labels. Preserve the selected language during an in-flight turn by recording it with the submitted request and returned reply.

### Voice continuity

- Keep the existing English voice backend and its JSON POST contract at `https://carrot-voice-api.vercel.app/api/speak`. Port request cancellation, Blob playback, and object URL cleanup. Preserve text cleanup for spoken links and emojis, the 1,200-character playback cap, and sequential clips near 400 characters. Enforce the documented 450-character ceiling even for a single long token.
- Use the reply language for Japanese `ja-JP` browser speech, retaining script detection if migrated messages have no language metadata. Keep English browser speech as the fallback for custom API failures. Cancel playback on close, reset, language change, or unmount. Verify cross-origin access from preview before deciding whether a same-origin relay is needed. Keep the existing service unchanged unless a separate backend change is agreed.
- If voice calls incur charges, verify the existing service's own controls. A local relay limit alone cannot protect a separately reachable endpoint. Confirm playback on mobile and with unavailable browser voices.

### Asset and style mapping

- Map the supplied ten references to `idle1`, `idle2`, `hop1` through `hop6`, and `laptop1`, `laptop2`. The source establishes the slots and cadence. The original files or Framer property panel should confirm the slot order, alpha padding, and instance-specific values. Keep transparent originals and pixelated rendering.
- The code names Instrument Sans, IBM Plex Mono, Instrument Serif, and Figtree, with Inter among the fallback stacks. Confirm the live font files, weights, Japanese fallback, and licensing.
- Resolve the two Framer CSS variables ending in `10c5451c` and `db3088dc` to the published surface and text values. Their code fallbacks include white, `#222`, and `#272e38`. Carry over the existing inline layout styles and colors as verified local styles.

### Integration order

1. Confirm sprite mapping, property overrides, font and token values, and the live open-to-close interaction. Port Carrot with local replies and the existing voice contract, then verify parity in both languages.
2. Implement the server chat route with the Gateway model configured server-side. Accept validated, bounded input and require atomic rate and budget checks before any paid call. Keep the portable fallback available during rejections and outages. Use the real request state for thinking and abort on close or reset so stale replies cannot return to the conversation.
3. Verify follow-ups, language continuity, allowed links, rate limits, spending limits, and the existing voice in preview. Defer site-control tools until after the initial migration.

## Security and cost controls

- Use server-side Vercel environment credentials or supported workload identity. Separate preview and production configuration. Treat voice credentials the same way if the voice integration requires them.
- Validate locale, message types, lengths, request size, and project IDs on the server. Treat visitor text as untrusted. Keep the model grounded in approved public facts, and allow recommendation links only from the project catalog. Render reply text safely.
- Enforce a shared, atomic rate limit on the server before contacting Gateway. Apply per-visitor or network limits and a project-wide allowance across instances. If the limiter is unavailable, serve the rule-based path. Keep the paid path disabled until spending and request limits are configured.
- Bound history, prompt size, output tokens, and upstream duration. Set an application-level spending ceiling using conservative reservations for in-flight calls, reconcile with reported usage where available, and configure Gateway alerts or hard limits where supported. Agree on the budget before enabling the preview or production paid path. Use a kill switch to route all traffic to the fallback.
- Track latency, fallback reasons, limits, and usage. Keep credentials and full transcripts out of routine logs. Check paid voice usage independently.

## Testing and deployment

- Run lint, TypeScript checks, and a production build at each integration milestone. Add targeted regression checks for locale routing, fallback behavior, and rate and budget limits when those features land.
- Compare layouts and motion to Framer captures in both languages at representative desktop, tablet, and mobile widths. Verify keyboard navigation, visible focus, screen-reader labels, reduced motion, zoom, Japanese wrapping, and image and font loading.
- Exercise Carrot end to end in both locales, including follow-ups, project links, voice playback, lifecycle animations, language switching mid-chat, a provider outage, limit exhaustion, and repeat requests. Use mocked upstream responses for routine tests and a limited set of live Gateway and voice smoke tests on preview.
- Verify direct links, redirects, metadata, and error pages on a Vercel preview. Review parity, approved copy, accessibility, and budget settings before requesting production approval. Keep Framer live during the migration. Document the prior hosting and DNS settings so production can be rolled back if the approved cutover fails.
