# Brief for Kiro: Haunted Lockfile (Kiroween 2026, category Costume Contest)

You are building a brand-new project for the Kiroween 2026 hackathon, category Costume Contest ("build any app but
show us a haunting user interface that's polished and unforgettable; spooky design elements that enhance your app's
function"). Work only inside this directory. Use Kiro's spec-driven workflow and leave every Kiro artifact in the
repo (`.kiro/` must be committed, never gitignored). Read README.md first: it is the product scope.

## Product

A developer drops or pastes an npm `package-lock.json` (lockfileVersion 2 or 3). The page parses it in the browser,
sends only `name@version` pairs to the Worker, and renders a graveyard:

- Ghost: the locked version is deprecated on npm (deps.dev `isDeprecated` or npm `deprecated` field).
- Tombstone: no release of the package for more than 730 days (latest `publishedAt` on deps.dev).
- Zombie: an OSV advisory affects the locked version AND the package is a ghost or a tombstone.
- Alive: none of the above.

Every grave opens a panel with the evidence (dates, deprecation message, advisory ids and severity) and links to
the sources, plus the next step (upgrade to version X if a non-deprecated newer version exists, or "look for a
maintained alternative"). A "Report" button exports the findings as Markdown. Direct dependencies are drawn in the
front rows, transitive ones further back.

## The haunting has to do a job

- Tombstone height = years since the last release (measured, not decorative).
- Fog density over the whole graveyard = share of risky packages.
- Ghosts drift only for deprecated packages; a zombie hand rises only when an advisory is real.
- A quiet, polished night palette, one accent colour for danger; typography that stays readable.
- Accessibility is part of v1: a plain table view with the same data, full keyboard navigation, visible focus,
  `prefers-reduced-motion` turns all motion off, colour is never the only signal (each plot also has an icon and a
  word), and it works at 360 px wide.

## Data sources (public, no key; verified 5 Nov 2026)

- deps.dev v3: `GET https://api.deps.dev/v3/systems/npm/packages/{name}` (versions with `publishedAt`,
  `isDefault`, `isDeprecated`); URL-encode scoped names (`@scope/name` becomes `%40scope%2Fname`).
- OSV: `POST https://api.osv.dev/v1/querybatch` with `{"queries":[{"package":{"name":..,"ecosystem":"npm"},
  "version":..}]}`.
- npm registry: `GET https://registry.npmjs.org/{name}/{version}` for the `deprecated` message.
- Known real case for tests and the demo: `request@2.88.2` is deprecated, published 2020-02-11, advisory
  GHSA-p8p7-x288-28g6 (a zombie).

## Steps, in order

1. `.kiro/steering/product.md`, `tech.md`, `structure.md` (short, concrete).
2. Spec in `.kiro/specs/haunted-lockfile/`: `requirements.md` (EARS acceptance criteria), `design.md`, `tasks.md`.
3. Cloudflare Worker in TypeScript (wrangler, no framework), `account_id = "1ed921eb42c9296a7db12104be5455c9"`,
   name `haunted-lockfile`: serves the page and `POST /api/haunt` (max 2,000 packages per request, batched calls,
   5 s timeout per upstream call, results cached in `caches.default` for 6 h, partial results when a source fails,
   each grave marked with which sources answered). No KV, no D1, no secrets, nothing about the user stored.
4. Pure, testable functions: `parseLockfile(json)` (v2/v3, dedupe name@version, mark direct deps) and
   `classify(pkg, depsdev, osv, npm, now)`.
5. Tests: vitest + fast-check property-based tests (for any input the classifier returns exactly one plot; a
   package with no advisory is never a zombie; dates in the future or missing never crash; the parser never throws
   on malformed JSON and reports it), plus fixtures from real API answers saved in `test/fixtures/`. See each new
   test fail on purpose once (mutate the code) before accepting it.
6. Hooks in `.kiro/hooks/`: run the tests when `src/**/*.ts` is saved; another useful one of your choice.
7. README: keep the scope, add how to run (`npm i`, `npm test`, `npx wrangler dev`), how Kiro was used (spec,
   steering, hooks, property-based tests, anything else you used), and the live URL once deployed.

## Done means

`npm test` and the typecheck pass; the page works on a real lockfile (use this repo's own lock and a small
fixture that contains `request@2.88.2`); every rule above has a test.
