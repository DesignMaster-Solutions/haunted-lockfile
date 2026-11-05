# Tech steering — Haunted Lockfile

## Runtime
- **Cloudflare Worker** (TypeScript, Wrangler v3, no framework).
- `account_id = "1ed921eb42c9296a7db12104be5455c9"`, worker name `haunted-lockfile`.
- One entry point: `src/worker.ts`. Serves static HTML on `GET /` and the API on `POST /api/haunt`.

## Front end
- Single HTML file inlined into the Worker response (no CDN, no bundler for the page).
- Pure TypeScript compiled to the Worker; browser-side code is vanilla JS embedded in the HTML.
- Lockfile parsed entirely in the browser. Only `name@version` pairs leave the device.

## Data sources (public, no API key)
| Source | Endpoint |
|---|---|
| deps.dev v3 | `GET https://api.deps.dev/v3/systems/npm/packages/{encodedName}` |
| OSV | `POST https://api.osv.dev/v1/querybatch` |
| npm registry | `GET https://registry.npmjs.org/{name}/{version}` |

Scoped package names are percent-encoded: `@scope/name` → `%40scope%2Fname`.

## Worker constraints
- Max 2,000 packages per request (reject with 400 above that).
- 5 s timeout per upstream HTTP call (use `AbortController` with a 5000 ms signal).
- Results cached in `caches.default` for 6 h (cache key = sorted `name@version` list SHA-256).
- Partial results allowed: if one source fails, mark each affected grave and return the rest.
- No KV, no D1, no Durable Objects, no secrets, no user data stored.

## Testing
- **Vitest** for unit tests; **fast-check** for property-based tests.
- Real API answers saved under `test/fixtures/` (JSON files); tests are fully offline.
- Every test must be seen to fail once (mutate the code) before it is accepted.

## Tooling
- `npm test` → vitest
- `npm run typecheck` → `tsc --noEmit`
- `npx wrangler dev` → local dev server
