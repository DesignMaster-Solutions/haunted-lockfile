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

## License

MIT, see [LICENSE](LICENSE).
