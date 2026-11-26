# Framer portfolio migration plan

## Current project state

The Next.js homepage includes the typography and responsive layout of the Framer reference, inline illustrations and intro hover previews, interactive Selected Works previews, a responsive menu, a rolling timezone clock, scrambled navigation labels, and light and dark themes. The owner supplied the original Framer source, homepage recording, project preview media, and Carrot source and sprite references. The existing Framer publication remains the reference for destinations that have yet to migrate.

| Area | Installed or configured |
| --- | --- |
| Framework | Next.js 16.4.6, React and React DOM 19.3.0 |
| Styling | Tailwind CSS and its Turbopack integration at 4.3.3 |
| Tooling | TypeScript 5.9.3 with strict checking, ESLint 9.39.5 with Next config 16.4.6, npm lockfile |
| Next configuration | Cache Components, partial prefetching, experimental agent feedback, and a Tailwind Turbopack loader |
| Integrations | next-intl, Motion, and the Vercel AI SDK are installed. Carrot uses Gateway in local development. |

Local environment and Vercel link files are ignored by Git. Production deployment requires explicit approval.

## CT390 final scope

The English homepage at `/` is the first priority. Polish the existing interactions, confirm responsive parity and accessibility, and address image and animation performance. Implement the LLM-powered Carrot in a separate phase after the scope and routing changes.

Japanese localization, full migration of project pages, and nonessential features outside the homepage are deferred. Keep the approved Play, About, MUJI, and NYPL destinations linked to the existing Framer portfolio. Resume uses its approved Google Drive URL. Redline remains preview-only pending an approved destination.

## Proposed architecture

- Serve the homepage from `app/page.tsx` using the shared root layout and reusable components. Render content on the server where possible. Use client components for interactions that need browser state, including Carrot and any reference-driven motion.
- Use Tailwind and shared CSS for styles measured from the Framer reference. Audit exported React and TypeScript files before porting them. Identify Framer-only layout, events, assets, or runtime hooks and adapt those behind a small interface where necessary. Use the installed Motion library where required to reproduce the approved behavior.
- Keep portfolio content and translations outside layout logic. Give projects stable IDs so localized routes, Carrot recommendations, and approved content can use the same project references.
- Use the server-only `POST /api/chat` route for streamed AI SDK replies. Keep the starting public knowledge and personality in `lib/carrot/personality.ts` and the model and generation limits in `lib/carrot/model.ts`.
- Confirm package compatibility and the exact Gateway model identifier before implementation. Consult the installed Next.js docs for locale routing, route handlers, and caching.

## Development phases

1. **Public routing and homepage polish.** Serve the English homepage from the root, preserve legacy URLs, and verify the existing layout and animations against the desktop and mobile recordings.
2. **Carrot parity and LLM integration.** Port the original movement, chat, voice, and English rule-based responses. Then add the Gateway-backed conversation path and verify both engines in the same UI.
3. **Testing and release.** Check accessibility, performance, responsive behavior, routes, project links, and Carrot’s end-to-end behavior in a Vercel preview before requesting production approval.
4. **Deferred migration.** Restore Japanese routes and language switching after translated content is reviewed. Migrate the full case studies and nonessential pages in later milestones.

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
- Treat the video as a visual baseline. Verify the exact responsive thresholds, typography, preview triggers, and loader timing against Framer. Use the existing homepage media and defer the loader until the final priorities are met.

## Public routing and deferred localization

- Render the English homepage directly at `/` and serve `lang="en"`. Use temporary redirects from `/en` and `/ja` to the matching unprefixed paths. Known prefixed Play, About, MUJI, and NYPL paths lead to their verified Framer pages until local routes are available. Keep query parameters on redirects.
- Preserve both message catalogs and the next-intl configuration for future localization. The Japanese catalog is a draft for owner review. Restore locale metadata, navigation, and route equivalents when Japanese returns.
- Validate Japanese typography, line breaks, controls, and Carrot’s Japanese voice and replies in the deferred localization phase.

## Carrot integration

- Keep existing character and playback logic independent of the response provider. Keep the laptop sprite active while chat is open, as the source does. Drive the separate thinking indicator from the pending request. Preserve user-initiated playback for completed replies.
- Send the active locale, validated page or project ID, and a bounded set of recent turns to the server. Use approved examples to guide Carrot’s personality. Supply only relevant knowledge-base entries, acknowledge gaps in available facts, and resolve recommendations from known project IDs and approved English URLs.
- Use Gemini 2.5 Flash Lite via Vercel AI Gateway and the Vercel AI SDK. Stream text into the existing chat. Enable voice playback on completed replies and resolve only approved project links.
- Keep the original rule engine as a source reference. Show a visible error for disabled AI, provider failures, timeouts, and rate or spending limits. Keep voice playback subject to its separate service limits.

## Carrot source audit and port sequence

### Behavior and code to carry forward

- Reuse the frame selection, randomized hop and pause logic, direction flipping, viewport bounds, responsive sizing, invitation, and keyboard activation. The source advances hop frames every 70 ms and idle and laptop frames every 450 ms. It changes sprite size below 600 px and 1024 px. The code defaults are 50, 58, and 64 px. Confirm actual instance overrides in Framer.
- Opening chat stops movement and switches Carrot to the laptop until chat closes. The source exposes a 4,000 ms laptop duration property, but the open handler keeps laptop mode active throughout the chat. Preserve the observed open/close behavior and remove the simulated 2.45-second reply delay when real networking lands.
- Port the chat markup, motion, suggestion chips, auto-scroll, close and reset actions, per-message playback, and project links. Preserve the 350-character user input and 24-message display/history cap. Keep the request context bounded independently on the server.
- Keep the original response rules as migration reference. Review any candidate facts against the public portfolio before adding them to the knowledge base. Verify Redline, MUJI, NYPL, and Bunny Quest against the approved public catalog, including whether and where the Redline case study may be linked.

### Next.js component boundaries

- Keep a shared client-side Carrot shell that coordinates character, chat, and audio. Put movement, frame clocks, resize and timer cleanup in a sprite or movement hook. Port the conversation panel and its existing body portal into a client component with a mount guard. Verify focus on open and close, keyboard activation, and reduced motion.
- Replace `addPropertyControls`, `ControlType`, image control objects, and function component `defaultProps` with typed sprite configuration and explicit defaults. Use the installed Motion package for the source's `motion` and `AnimatePresence` primitives. React DOM portals, browser audio, and the reply rules can carry forward with their respective client or shared boundaries.
- Move labels and suggestions to the message catalogs and keep reply rules and curated project facts outside the chat UI. Use the stable project IDs to resolve localized links and link labels. Preserve the selected language during an in-flight turn by recording it with the submitted request and returned reply.

### Voice continuity

- The English terminal uses the existing Carrot voice service through the same-origin `POST /api/voice` relay. The relay uses the published portfolio’s approved origin and forwards the original `{ text }` JSON contract. Voice provider credentials stay in the existing service.
- The client strips links, Markdown formatting, and emoji, then generates clips up to 400 characters on demand and plays them in order. A bounded in-browser cache avoids generating repeated clips. Closing or resetting cancels playback and requests. A failure exposes a retry control.
- Before hosted use, configure a Vercel Firewall IP rate limit for `POST /api/voice` (for example, 18 requests per 60 seconds), then set `CARROT_VOICE_WAF_RATE_LIMIT_ENABLED=true` in protected environments. Development uses a local 18-per-minute cap. The relay does not change or protect the upstream service’s own firewall. Review upstream abuse controls separately.
- Japanese voice behavior is deferred with public Japanese localization.

### Asset and style mapping

- Map the supplied ten references to `idle1`, `idle2`, `hop1` through `hop6`, and `laptop1`, `laptop2`. The source establishes the slots and cadence. The original files or Framer property panel should confirm the slot order, alpha padding, and instance-specific values. Keep transparent originals and pixelated rendering.
- The code names Instrument Sans, IBM Plex Mono, Instrument Serif, and Figtree, with Inter among the fallback stacks. Confirm the live font files, weights, Japanese fallback, and licensing.
- Resolve the two Framer CSS variables ending in `10c5451c` and `db3088dc` to the published surface and text values. Their code fallbacks include white, `#222`, and `#272e38`. Carry over the existing inline layout styles and colors as verified local styles.

### Integration order

1. Confirm sprite mapping, property overrides, font and token values, and the live open-to-close interaction. Port Carrot with local replies and the existing voice contract, then verify English parity. Preserve the Japanese rules for the deferred localization phase.
2. Implement the server chat route with the Gateway model configured server-side. Accept validated, bounded input and require atomic rate and budget checks before any paid call. Return a clear error during rejections and outages. Use the real request state for thinking and abort on close or reset so stale replies cannot return to the conversation.
3. Verify follow-ups, context continuity, allowed links, rate limits, spending limits, and the existing voice in preview. Defer site-control tools until after the initial migration.

## Security and cost controls

- Use server-side Vercel environment credentials or supported workload identity. Separate preview and production configuration. Treat voice credentials the same way if the voice integration requires them.
- Validate locale, message types, lengths, request size, and project IDs on the server. Treat visitor text as untrusted. Keep the model grounded in approved public facts, and allow recommendation links only from the project catalog. Render reply text safely.
- Before enabling hosted chat, publish a Vercel Firewall fixed-window rule for POST requests to `/api/chat`. Use IP as the counting key, six requests per 60 seconds, and a 429 response. Verify it covers every accessible deployment hostname. Then set the server-only `CARROT_WAF_RATE_LIMIT_ENABLED=true` in the protected environments. The route remains closed in hosted environments until that flag is set. Local development uses an in-process cap of 12 requests per minute.
- Bound history, prompt size, output tokens, and upstream duration. Use the configured $5 monthly AI Gateway budget for aggregate spending. Before enabling hosted chat, ensure the deployed credential is covered by that budget. Unset the firewall-enabled flag to disable hosted chat.
- Review Gateway latency, sanitized errors, limits, and usage. Keep credentials and full transcripts out of routine logs. Check paid voice usage independently.

## Testing and deployment

- Run lint, TypeScript checks, and a production build at each integration milestone. Add targeted regression checks for locale routing, error behavior, and rate and budget limits when those features land.
- Compare the English homepage to Framer captures at representative desktop, tablet, and mobile widths. Verify keyboard navigation, visible focus, screen-reader labels, reduced motion, zoom, and image and font loading. Check page load performance and animation responsiveness.
- Exercise Carrot end to end in English, including follow-ups, project links, voice playback, lifecycle animations, a provider outage, limit exhaustion, and repeat requests. Use mocked upstream responses for routine tests and a limited set of live Gateway and voice smoke tests on preview.
- Verify direct links, redirects, metadata, and error pages on a Vercel preview. Review parity, approved copy, accessibility, and budget settings before requesting production approval. Keep Framer live during the migration. Document the prior hosting and DNS settings so production can be rolled back if the approved cutover fails.
