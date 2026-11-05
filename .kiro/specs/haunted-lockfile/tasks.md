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
