# Tasks — Haunted Lockfile

Tasks are ordered; each depends on the ones before it.

## T-01 Project scaffold
- [x] `package.json` with vitest, fast-check, wrangler, typescript
- [x] `tsconfig.json` targeting ES2022, lib `["ES2022"]`
- [x] `wrangler.toml`
- [x] `vitest.config.ts`

## T-02 Types
- [x] `src/types.ts`: Plot, PackageInput, DepsDev, OsvAdvisory, NpmMeta, HauntResult, ParseResult

## T-03 parseLockfile
- [x] `src/parseLockfile.ts`: supports v2 and v3, deduplicates, marks direct deps
- [x] `test/parseLockfile.test.ts`: happy path v2, happy path v3, malformed JSON, missing keys

## T-04 classify
- [x] `src/classify.ts`: pure function, implements the ghost/tombstone/zombie/alive logic
- [x] `test/classify.test.ts`: property-based tests (fast-check) + unit tests for request@2.88.2

## T-05 Test fixtures
- [x] `test/fixtures/depsdev-request.json`: real deps.dev response for request
- [x] `test/fixtures/osv-request.json`: real OSV response for request@2.88.2
- [x] `test/fixtures/npm-request.json`: real npm registry response for request@2.88.2

## T-06 Haunt handler
- [x] `src/haunt.ts`: POST /api/haunt, batching, caching, partial results
- [x] `test/haunt.test.ts`: 400 on >2000, partial results when source fails

## T-07 Page
- [x] `src/page.ts`: returns full HTML with embedded CSS and JS

## T-08 Worker entry point
- [x] `src/worker.ts`: routes GET / → page, POST /api/haunt → haunt handler

## T-09 Kiro hooks
- [x] `.kiro/hooks/test-on-save.sh`
- [x] `.kiro/hooks/typecheck-on-save.sh`

## T-10 README update
- [x] How to run, how Kiro was used, live URL placeholder


## Code Review Round 2 — Completed 2026-11-05

### A. Worker chunking and progressive rendering
- [x] Exported `MAX_PACKAGES_PER_REQUEST = 10` from `src/haunt.ts`
- [x] Worker rejects requests with >10 packages with HTTP 413
- [x] Page splits lockfile into chunks of 10 packages
- [x] Max 4 chunks in flight at once
- [x] Progressive rendering as chunks return
- [x] Shows "N of M packages haunted" progress
- [x] Failed chunks mark packages as "unknown" (never dropped silently)
- [x] Per-package caching in `caches.default` (6h TTL) by name@version
- [x] Test coverage for 413 rejection and exact-limit acceptance

### B. Parser served to browser
- [x] Exported `keyToPackageName` from `src/parseLockfile.ts`
- [x] Added GET `/parse.js` route to `src/worker.ts`
- [x] Returns `${keyToPackageName.toString()}\n${parseLockfile.toString()}`
- [x] Page loads parser dynamically from `/parse.js` on mount
- [x] Test verifies served parser evaluates and parses identically to module
- [x] Browser runs exactly the tested parser code

### C. File size discipline
- [x] Split `src/page.ts` (was 780 lines) into modules under `src/page/`:
  - `src/page.ts` — 26 lines (imports and template assembly)
  - `src/page/styles.ts` — 279 lines (all CSS)
  - `src/page/html.ts` — 64 lines (HTML structure)
  - `src/page/client.ts` — 466 lines (client-side JavaScript)
- [x] Every file now under 500 lines

## Code Review Round 3 — Completed 2026-11-05

### A. Mutation test fixes
- [x] Mutant 1: Test that old version deprecated but locked version not → not ghost
- [x] Mutant 2: Test suggest non-deprecated when newest is deprecated
- [x] Mutant 3: Test nested b and root b at different versions — only root is direct
- [x] Mutant 4: Test same package at same version in two locations only appears once
- [x] Mutant 5: Test OSV querybatch chunking at 1000-query boundary

### B. Behaviour bug: Alive packages with advisories
- [x] Updated `classify.ts` to show advisory warning for alive packages with advisories
- [x] Next step now says "Advisory affects this version: upgrade to X and re-check"
- [x] Tests for alive + advisory scenarios
- [x] Upgraded vitest from 2.1.9 to 5.1.0 (removed GHSA-5xrq-8626-4rwp advisory)
- [x] Upgraded wrangler to 4.158.0 and @cloudflare/workers-types to 5.x
- [x] All tests and typecheck pass with new dependencies

### C. Costume Contest design: Night scene graveyard
- [x] Redesigned graveyard as night scene with SVG elements
- [x] Night sky gradient + moon element
- [x] Ground line with soil texture
- [x] Graves bottom-aligned on ground
- [x] SVG headstones: rounded top, height = 14px per year since last release (max 140px)
- [x] Years engraved on tombstones
- [x] Ghost: translucent SVG, drift animation (disabled with prefers-reduced-motion)
- [x] Zombie: hand rising from soil (animated, disabled with prefers-reduced-motion)
- [x] Alive: small sprout/flower SVG
- [x] Direct deps larger scale, transitive faded in back
- [x] Advisory badge "!" on graves with advisories (alive or zombie)
- [x] Fog layer: opacity = share of risky packages, with caption "Fog N% — X of Y at risk"
- [x] Height scale legend showing 2, 5, 10 year markers
- [x] "Try the demo lockfile" button loads request@2.88.2 fixture
- [x] Progress text: "Haunting 40 of 197…" while running, "197 packages haunted" when done
- [x] Display font: "IM Fell English SC" for title only
- [x] Every grave is focusable button with Tab/arrow navigation
- [x] Enter/Space opens evidence panel, Escape closes, focus returns to grave
- [x] Full package name in tooltip and aria-label when truncated
- [x] Works at 360px width (no horizontal scroll, scene scrolls inside container)
- [x] prefers-reduced-motion turns off all animation (drift, hand, fog transition)
- [x] All files under 500 lines: styles.ts (340), html.ts (78), client.ts (556), page.ts (26)

## Code Review Round 4 — Completed 2026-11-05

### A. Scene as self-contained SVG block
- [x] Removed all position:fixed elements (moon, legend were floating)
- [x] Scene is now a single `<section>` with inline `<svg viewBox>` right under stats chips
- [x] Moon with proper SVG radial glow and craters inside scene (upper right)
- [x] Stars (7 static dots, twinkling disabled under reduced-motion) inside scene
- [x] Fog caption and height legend rendered INSIDE the SVG, not floating
- [x] Scene height: ~460px desktop, ~360px phones (responsive via CSS)
- [x] Ground (soil band + grass edge) at 78% of scene height (~360px from top)
- [x] No empty half-screen gap between form and graveyard

### B. Grave designs and labels
- [x] Zombie: red-tinted headstone (#8a6a6a fill, #c0392b stroke) + clearly visible zombie hand (SVG: forearm, palm, 4 fingers, thumb, ~36px tall)
- [x] Ghost: translucent white SVG ghost (rounded head, wavy hem, 2 eyes) floating 30px above its stone
- [x] Tombstone: grey stone with engraved years text
- [x] Alive: small green sprout (unchanged)
- [x] Danger accent (#c0392b) ONLY for zombie stones, advisory badges, and panel warnings
- [x] Package name and plot label ON the ground, inside soil band, readable (12px+ desktop), AA contrast
- [x] Name truncated with ellipsis, full name in `<title>` tooltip

### C. Fog rendering
- [x] Fog caption "Fog 100% — 1 of 1 packages at risk" visible inside scene (top-left as text element)
- [x] Fog is 2–3 layered semi-transparent SVG ellipses over lower half
- [x] Fog opacity = share of risky packages (0 risky = no fog at all)
- [x] Slow drifting disabled under prefers-reduced-motion

### D. Demo button → link, no button stacking
- [x] "Try the demo lockfile" changed from button to text link next to Analyze
- [x] Clicking link loads demo lockfile AND runs Analyze immediately
- [x] Buttons never stack at 360px width (only one big button now)

### E. Legend and scene visibility
- [x] Legend and scene hidden (display:none) until results arrive
- [x] Graveyard shown with `.visible` class after first results render

### F. Evidence panel as accessible dialog
- [x] Panel has role=dialog, aria-modal=true, aria-labelledby pointing to package name h2
- [x] Focus moves to close button when opened
- [x] Escape and close button both return focus to the grave that opened it (stored in data-triggerElementIndex)
- [x] Panel shows: plot with icon+word, locked version, last release date+years, deprecation, advisory id+severity+summary linking to osv.dev, which sources answered, next step

### G. Dead code removal
- [x] Removed OSV querybatch chunking loop (MAX_PACKAGES_PER_REQUEST=10, never hits 1000-query limit)
- [x] One querybatch call per request (never chunked)
- [x] Removed vacuous chunking test, replaced with assertion: one querybatch call per request

### H. File split for <500 lines
- [x] Split `client.ts` (was 556 lines) into three modules:
  - `src/page/client.ts` — 427 lines (main logic)
  - `src/page/scene.ts` — 225 lines (SVG scene builder)
  - `src/page/panel.ts` — 103 lines (evidence dialog)
- [x] All files now under 500 lines

### I. Tests and verification
- [x] All 59 tests pass
- [x] Typecheck passes with no errors
- [x] tasks.md and design.md updated
