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
                                        ├─ OSV querybatch (chunked at 1000)
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

1. Parse body, validate ≤ 2,000 packages.
2. Per-key caching:
   - deps.dev results cached per package name: `haunted-lockfile-cache.internal/depsdev/{name}`
   - OSV advisory details cached per ID: `haunted-lockfile-cache.internal/osv/{id}`
   - npm registry cached per name@version: `haunted-lockfile-cache.internal/npm/{name}/{version}`
   - All cached for 6 hours in `caches.default`
3. Fan out deps.dev calls (one per unique package name, 25 concurrent max).
4. OSV `querybatch` POST (chunked at 1,000 queries per call).
5. OSV advisory detail fetch: GET `/v1/vulns/{id}` for each unique ID from querybatch (25 concurrent max).
6. npm registry called only as fallback: when deps.dev didn't answer OR doesn't list the locked version.
7. Each upstream wrapped in `AbortController` with 5s timeout.
8. Assemble results, run `classify()`, return (no result-level caching — per-key caching allows composition).

## Front-end graveyard rendering

Night scene with SVG elements:
- **Sky**: gradient background (#0a0d14 to #1a1f2e), positioned absolutely behind all graves.
- **Moon**: circular element (60px diameter) in top-right corner with glow effect.
- **Ground**: gradient strip at bottom (100px high, var(--ground) to transparent).
- **Graves**: bottom-aligned on ground, flexbox with flex-end alignment.

SVG graves:
- **Alive**: sprout/flower (circle base + stem + leaves), 40px height, green (#2a5c3a).
- **Ghost**: rounded-top headstone (54px wide), translucent fill (#5c6ca0), drift animation (translateY ±8px, 3s ease-in-out).
- **Tombstone**: rounded-top headstone, purple fill (#4a3060), height = 14px per year since last release (min 50px, max 140px), years engraved as SVG text.
- **Zombie**: tombstone with green border (#4a9a3a) + rising hand SVG below (animated translateY 0–40%, 2.5s ease-in-out).

Layout:
- Direct dependencies: 1.2× scale (transform: scale(1.2)).
- Transitive dependencies: 0.8 opacity.
- Sort order: direct first, then by risk (zombie, ghost, tombstone, alive), then alphabetical.

Advisory badge:
- Red circle "!" in top-right corner of grave (18px diameter, var(--danger)).
- Shows on any package with advisories.length > 0, regardless of plot.
- Also shown in table view and evidence panel.

Fog:
- Radial gradient overlay (var(--fog), transparent), positioned absolutely over entire scene.
- Opacity = (risky packages / total packages) × 0.65, max 0.65.
- Caption: "Fog N% — X of Y packages at risk" at bottom-center.

Height legend:
- Top-left corner, semi-transparent background.
- Shows "Headstone height = years since last release" with 2y, 5y, 10y markers.

Interaction:
- Each grave is a `<button>` with `role="listitem"`, `tabindex="0"`.
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
