# Design — Haunted Lockfile

## Architecture

```
Browser                         Cloudflare Worker
──────────────────────────────  ─────────────────────────────────────────
1. User drops/pastes lockfile
2. parseLockfile(json)
   → { packages, errors }
3. Chunk into groups of 10
   (keeps Worker under 50 subrequest limit)
4. POST /api/haunt (max 4 in flight)
   { packages: [{name,version}] } ──►  haunt.ts
                                        ├─ per-key caching (deps.dev, OSV, npm)
                                        ├─ batch deps.dev calls (25 concurrent)
                                        ├─ OSV querybatch (ONE call per request)
                                        ├─ OSV advisory details (25 concurrent)
                                        ├─ npm registry (fallback only)
                                        ├─ classify() each package
                                        └─ return results
5. render progressively as chunks return
   graveyard / table  ◄──  { results: HauntResult[] }
```

## Data types (src/types.ts)

```ts
type Plot = "ghost" | "tombstone" | "zombie" | "alive";

interface PackageInput {
  name: string;
  version: string;
  isDirect: boolean;
}

interface DepsDev {
  latestPublishedAt: string | null;  // ISO-8601 or null
  versions: { 
    version: string; 
    publishedAt: string | null;
    isDeprecated: boolean;
    deprecatedReason?: string;
  }[];
}

interface OsvAdvisory {
  id: string;
  severity?: string;  // from database_specific.severity or severity[0].score
  summary?: string;
  url?: string;
}

interface NpmMeta {
  deprecated?: string;  // the message, or undefined
}

interface HauntResult {
  name: string;
  version: string;
  isDirect: boolean;
  plot: Plot;
  deprecationMessage?: string;
  lastPublishedAt?: string;   // ISO-8601
  daysSinceRelease?: number;
  advisories: OsvAdvisory[];
  nextStep: string;
  sources: { depsdev: boolean; osv: boolean; npm: boolean };
}

interface ParseResult {
  packages: PackageInput[];
  errors: string[];
}
```

## classify() logic

```
classify(pkg, depsdev, osv, npm, now):
  // Check per-version deprecation
  deprecated = npm.deprecated != null || 
               depsdev.versions.find(v => v.version === pkg.version)?.isDeprecated
  
  lastDate   = most recent publishedAt across depsdev.versions (ignore future dates)
  stale      = lastDate != null && daysBetween(lastDate, now) > 730
  hasAdvisory = osv.advisories.length > 0

  if hasAdvisory && (deprecated || stale) → zombie
  elif deprecated                          → ghost
  elif stale                               → tombstone
  else                                     → alive
  
  nextStep:
    if alive && hasAdvisory → "Advisory affects this version: upgrade to X and re-check."
    elif alive → "No action needed."
    elif non-deprecated version exists → "Consider upgrading to pkg@X.Y.Z."
    else → "Look for a maintained alternative to pkg."
```

## POST /api/haunt implementation

1. Parse body, validate ≤ 10 packages per request (MAX_PACKAGES_PER_REQUEST), 413 if exceeded.
2. Per-key caching:
   - deps.dev results cached per package name: `haunted-lockfile-cache.internal/depsdev/{name}`
   - OSV advisory details cached per ID: `haunted-lockfile-cache.internal/osv/{id}`
   - npm registry cached per name@version: `haunted-lockfile-cache.internal/npm/{name}/{version}`
   - All cached for 6 hours in `caches.default`
3. Fan out deps.dev calls (one per unique package name, 25 concurrent max).
4. OSV `querybatch` POST (ONE call per request — MAX_PACKAGES_PER_REQUEST=10 never exceeds 1000-query limit).
5. OSV advisory detail fetch: GET `/v1/vulns/{id}` for each unique ID from querybatch (25 concurrent max).
6. npm registry called only as fallback: when deps.dev didn't answer OR doesn't list the locked version.
7. Each upstream wrapped in `AbortController` with 5s timeout.
8. Assemble results, run `classify()`, return (no result-level caching — per-key caching allows composition).

## Front-end graveyard rendering

**Self-contained SVG scene** (single `<section class="graveyard-container">` with `<svg viewBox="0 0 1000 460">`):
- Scene placed right under stats chips, hidden until results arrive
- Responsive: ~460px tall on desktop, ~360px on phones
- All elements (moon, stars, legend, fog caption, graves) inside the SVG — no position:fixed

**Sky & moon**:
- Sky: linearGradient (#0a0d14 to #1a1f2e)
- Moon: circle at (850, 80) with radial glow, 3 crater ellipses (#d0d2e0, filtered shadow)
- Stars: 7 static circles at various positions, opacity 0.4–0.8 (no twinkling under reduced-motion)

**Ground**:
- Soil band starts at 78% of scene height (~360px from top on 460px scene)
- linearGradient from #232840 at top to #0f1219 at bottom
- Grass edge: wavy path stroke (#2a4a20, opacity 0.4) at ground line

**Graves (SVG `<g>` elements, each with data-index for click/focus)**:
- **Alive**: green sprout (circle + stem + 2 leaf ellipses), ~40px tall, color #2a5c3a
- **Ghost**: grey tombstone + white translucent ghost SVG floating 30px above (rounded head, wavy hem, 2 eyes), animated drift under motion-allowed
- **Tombstone**: grey headstone (#6a6a8a), height = 14px per year (min 50px, max 140px), years engraved as text
- **Zombie**: red-tinted headstone (#8a6a6a fill, #c0392b 2px stroke) + zombie hand rising from soil (forearm, palm, 4 fingers, thumb, ~36px tall, #4a9a3a), animated rise under motion-allowed

**Layout**:
- Direct deps: 1.2× scale (larger width)
- Graves sorted: direct first → zombie/ghost/tombstone/alive → alphabetical
- Each grave positioned along x-axis with y at ground level, wrapping to multiple rows

**Advisory badge**:
- Red circle "!" (9px radius, #c0392b fill) in top-right of stone, white "!" text
- Shows on any package with advisories, zombie or alive
- Danger accent (#c0392b) ONLY for zombie stones, advisory badges, and panel warnings

**Fog**:
- SVG ellipse (80% width, 30% height) at bottom with radial gradient (#b0c8e8, opacity = risky_ratio × 0.65)
- 0 risky = no fog (opacity 0)
- Caption as `<text>` at (20, 30): "Fog N% — X of Y packages at risk" (#8090b0, 11px)

**Height legend**:
- SVG `<g>` at (20, 80): semi-transparent rect + 4 text lines
- "Years since last release: / 2 years: ~28px / 5 years: ~70px / 10 years: ~140px (max)"

**Interaction**:
- Each grave is SVG `<g class="grave-item">` with role=button, tabindex=0, aria-label with full name
- Click or Enter/Space opens evidence panel (role=dialog, aria-modal, focus on close button)
- Escape or close button closes panel, returns focus to grave (tracked via data-triggerElementIndex)
- Full package name in `<title>` element for tooltip when truncated
- `aria-label`: "name@version — plot [— has advisory]".
- `title`: full package name (for truncated labels).
- Tab/arrow keys navigate, Enter/Space opens evidence panel, Escape closes.
- Focus returns to grave when panel closes.

Animations (disabled by `prefers-reduced-motion: reduce`):
- Ghost drift: `animation: drift 3s ease-in-out infinite` (translateY ±8px).
- Zombie hand rise: `animation: rise 2.5s ease-in-out infinite` (translateY 0–40%).
- Fog transition: `transition: opacity 1.5s`.

Demo button:
- "Try the demo lockfile" button next to Analyze.
- Loads test/fixtures/request-lock.json (contains request@2.88.2 zombie).
- Blue background (var(--ghost-blue)).

## Palette

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0a0d14` | page background |
| `--ground` | `#1a1f2e` | graveyard ground |
| `--stone` | `#3a4060` | tombstone fill |
| `--stone-ghost` | `#6070a0` | ghost tombstone |
| `--zombie-green` | `#4a7a3a` | zombie accent |
| `--danger` | `#c0392b` | single danger accent (advisory badges, zombie border) |
| `--fog` | `#b0c8e8` | fog overlay tint |
| `--text` | `#e8eaf6` | body text |
| `--muted` | `#8090b0` | secondary text |

Typography:
- Body: `system-ui, -apple-system, sans-serif`
- Monospace (package names): `"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace`
- Display (title only): `"IM Fell English SC", Georgia, serif` (loaded from Google Fonts)

## Accessibility

- `role="main"` on graveyard, `role="complementary"` on evidence panel.
- Each grave is a `<button>` with `aria-label="name@version — plot"`.
- Table view uses `<table>` with proper `<th scope>`.
- Focus ring: `outline: 2px solid #e8eaf6; outline-offset: 3px`.
- All icon+word pairs use `<span aria-hidden="true">` for icon, visible text for word.
