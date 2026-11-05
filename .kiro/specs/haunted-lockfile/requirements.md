# Requirements — Haunted Lockfile

Acceptance criteria written in EARS (Easy Approach to Requirements Syntax).

---

## Lockfile parsing

**REQ-01** While the user drops or pastes a `package-lock.json`, the system shall parse it in the browser and extract every locked `name@version` pair without sending the file contents to any server.

**REQ-02** The system shall support lockfileVersion 2 and 3.

**REQ-03** The system shall deduplicate packages so each `name@version` pair appears at most once in the API call.

**REQ-04** The system shall mark packages listed directly under `dependencies` (lockfileVersion 2) or `packages[""]` → `dependencies` (lockfileVersion 3) as direct dependencies.

**REQ-05** When the input is malformed JSON or not a package-lock.json, the system shall return a structured error and shall not throw an uncaught exception.

---

## Classification

**REQ-06** The system shall classify each package as exactly one of: Ghost, Tombstone, Zombie, or Alive.

**REQ-07** When a package's locked version carries a `deprecated` field in the npm registry or `isDeprecated: true` in deps.dev, the system shall classify it as Ghost (unless also Zombie).

**REQ-08** When the most recent publish date across all versions of a package is more than 730 days before the evaluation date, the system shall classify it as Tombstone (unless also Zombie).

**REQ-09** When OSV returns at least one advisory affecting the locked version AND the package is a Ghost or Tombstone, the system shall classify it as Zombie.

**REQ-10** When a package has an OSV advisory but is neither a Ghost nor a Tombstone, the system shall classify it as Alive (advisory recorded but not a zombie).

**REQ-11** When a publish date is missing or set in the future, the system shall treat it as "unknown" and shall not crash.

**REQ-12** A package with no OSV advisory shall never be classified as Zombie.

---

## API — POST /api/haunt

**REQ-13** The Worker shall accept `POST /api/haunt` with a JSON body `{ "packages": [{ "name": string, "version": string }] }`.

**REQ-14** When the request contains more than 2,000 packages, the system shall respond 400 with a human-readable error.

**REQ-15** The system shall call deps.dev, OSV and npm registry with a 5-second timeout per call; on timeout it shall record the failure, mark affected graves, and return partial results with HTTP 200.

**REQ-16** The system shall cache results in `caches.default` for 6 hours, keyed on the sorted `name@version` list.

**REQ-17** Each result entry shall include a `sources` field listing which upstream APIs answered (`depsdev`, `osv`, `npm`) and which failed.

**REQ-18** The Worker shall respond with `Content-Type: application/json` and CORS headers that allow any origin.

---

## Graveyard UI

**REQ-19** The page shall display each package as a grave in one of four visual plots: Ghost, Tombstone, Zombie, Alive.

**REQ-20** The height of each tombstone visual element shall be proportional to the years since the last release.

**REQ-21** The fog overlay opacity shall increase with the share of risky packages (Ghost + Tombstone + Zombie).

**REQ-22** Ghost drift animation shall appear only on packages classified as Ghost.

**REQ-23** Zombie hand animation shall appear only on packages classified as Zombie.

**REQ-24** Each grave shall open an evidence panel showing: classification label, deprecation message (if any), last publish date, advisory IDs with links (if any), and a recommended next step.

**REQ-25** A "Report" button shall export all findings as Markdown.

**REQ-26** Direct dependencies shall render in the front rows of the graveyard; transitive dependencies further back.

---

## Accessibility

**REQ-27** The page shall include a plain table view containing all the same data as the graveyard view, toggled by a control.

**REQ-28** Every interactive element shall be reachable by keyboard and show a visible focus indicator.

**REQ-29** When `prefers-reduced-motion: reduce` is active, all CSS and JS animations shall be disabled.

**REQ-30** Each classification shall be communicated by an icon, a word label, and colour — not by colour alone.

**REQ-31** The page shall be functional and readable at a viewport width of 360 px.

---

## Known test fixture

**REQ-32** `request@2.88.2` shall be classified as Zombie: it is deprecated, published 2020-02-11 (>730 days ago as of 2026-11-05), and has advisory GHSA-p8p7-x288-28g6.
