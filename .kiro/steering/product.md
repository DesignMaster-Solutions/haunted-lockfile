# Product steering — Haunted Lockfile

## Purpose
Developers drop or paste an npm `package-lock.json` and see every locked package
classified as one of four plots in an interactive graveyard:

| Plot | Rule |
|---|---|
| Ghost | locked version is marked deprecated on npm |
| Tombstone | no release for more than 730 days |
| Zombie | OSV advisory **and** (ghost or tombstone) |
| Alive | none of the above |

## Target user
Any developer who wants a fast, memorable audit of dead or risky dependencies
before a release, without installing anything locally.

## Design principle
The haunting does a job: tombstone height encodes years since last release, fog
density encodes the share of risky packages, ghosts drift only for deprecated
packages, a zombie hand rises only for real advisories. The visual is never just
decoration — every effect maps to a data dimension.

## Accessibility is v1, not a bonus
Plain table view with identical data, full keyboard navigation, `prefers-reduced-motion`
turns all animation off, colour is never the only signal (icon + word accompany each plot),
360 px minimum width.

## Out of scope for v1
PyPI / Cargo support, automatic fix pull requests, user accounts, any server-side
storage of lockfile contents.
