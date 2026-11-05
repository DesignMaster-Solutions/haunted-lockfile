# Haunted Lockfile

Your dependencies, as a graveyard. Drop in a `package-lock.json` and see which packages are dead, which are
ghosts and which are zombies, with the evidence behind each grave and what to do next.

**Status: in progress.** Built with Kiro for Kiroween 2026 (Costume Contest category). Not ready for use yet.

## Why

Most projects keep shipping packages that nobody maintains anymore. An abandoned package gets no security fixes,
and a deprecated one is a warning nobody reads in a CI log. Example, checked on 5 November 2026: `request@2.88.2`
is the default version on npm, was published on 11 February 2020, is marked deprecated ("request has been
deprecated, see https://github.com/request/request/issues/3142") and has an open advisory, GHSA-p8p7-x288-28g6.
It still sits in many lockfiles.

## What it shows (v1 scope)

Each locked npm package lands in one of four plots, decided only from public data:

| Plot | Rule |
|---|---|
| Ghost | the locked version is marked deprecated on npm |
| Tombstone | the package has had no release for more than 730 days |
| Zombie | an OSV advisory affects the locked version **and** the package is a ghost or a tombstone |
| Alive | none of the above |

Every grave carries its evidence: release dates, the deprecation message, advisory ids, each with a link to the
source. The spooky design does a job: the height of a tombstone is the years since the last release, the fog over
the graveyard thickens with the share of risky packages, and a zombie's hand only rises when an advisory is real.
A plain table view, keyboard navigation and reduced motion are part of v1, not extras.

## Data sources (public, no key)

- [deps.dev API v3](https://docs.deps.dev/api/v3/): versions, publish dates, deprecation, project links.
- [OSV.dev](https://osv.dev/): advisories that affect a given package version.
- [npm registry](https://registry.npmjs.org/): deprecation messages per version.

The lockfile is parsed in the browser. Only package names and versions go to a small Cloudflare Worker that calls
the three sources and caches the answers. Nothing is stored about the user or the project.

## Out of scope for v1

Other ecosystems (PyPI, Cargo), automatic fix pull requests, accounts.

## How to run

```bash
npm install
npm test          # vitest — must all pass before you touch anything
npm run typecheck # tsc --noEmit
npx wrangler dev  # local dev server at http://localhost:8787
```

Drop this repo's own `package-lock.json`, or any lockfile that contains `request@2.88.2`, to see
a zombie in the graveyard right away.

## Live URL

<!-- Will be filled in after deploy: https://haunted-lockfile.<account>.workers.dev -->
_Not yet deployed._

## How Kiro was used

**Spec-driven from the start.** The whole project was built using Kiro's agent mode on
macOS, following the spec-driven workflow:

- **Steering docs** (`.kiro/steering/`): three short, concrete files — `product.md`, `tech.md`,
  `structure.md` — established the product goal, the Cloudflare Worker stack, the data sources,
  and the file layout before a single line of code was written.

- **Requirements** (`.kiro/specs/haunted-lockfile/requirements.md`): acceptance criteria in EARS
  notation (REQ-01 through REQ-32), including the known real-world zombie case
  (`request@2.88.2`, GHSA-p8p7-x288-28g6).

- **Design doc** (`.kiro/specs/haunted-lockfile/design.md`): data-flow diagram, TypeScript
  interfaces, the `classify()` decision tree, Worker batching strategy, graveyard rendering
  rules, the CSS palette, and the accessibility checklist — all agreed before implementation.

- **Tasks** (`.kiro/specs/haunted-lockfile/tasks.md`): a ten-step ordered task list that
  Kiro worked through top-to-bottom, checking each item off as code was written and tests passed.

- **Hooks** (`.kiro/hooks/`): two `.kiro.hook` JSON files that fire `npm test` and
  `npm run typecheck` automatically every time a `.ts` file in `src/` or `test/` is saved.

- **Property-based tests**: [fast-check](https://github.com/dubzzz/fast-check) properties
  verify that the classifier always returns exactly one of the four plots for any input, that
  a package with no advisory is never a zombie, and that no date string — however malformed or
  set in the future — ever causes a crash.

- **Real-API fixtures**: the `test/fixtures/` directory holds JSON saved from actual calls to
  deps.dev, OSV querybatch, OSV `/v1/vulns/{id}`, and the npm registry for `request@2.88.2`,
  making every test fully offline.

- **Mutation testing discipline**: every test was first seen to fail (by temporarily mutating
  the implementation), then seen to pass with the correct code.

## License

MIT, see [LICENSE](LICENSE).
