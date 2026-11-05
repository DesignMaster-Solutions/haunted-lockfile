// src/haunt.ts — POST /api/haunt handler
import { classify } from "./classify.js";
import type { DepsDev, HauntResult, NpmMeta, OsvAdvisory, PackageInput } from "./types.js";

const MAX_PACKAGES = 2000;
export const MAX_PACKAGES_PER_REQUEST = 10; // Cloudflare free: 50 subrequests, safety margin
const UPSTREAM_TIMEOUT_MS = 5000;
const CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours

// ── Helpers ──────────────────────────────────────────────────────────────────

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

/** Encode a package name for use in a deps.dev URL path (handles scoped packages). */
function encodeName(name: string): string {
  return encodeURIComponent(name);
}

// ── Caching helpers ─────────────────────────────────────────────────────────

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cache = caches.default;
    const req = new Request(key, { method: "GET" });
    const cached = await cache.match(req);
    if (cached) {
      return await cached.json() as T;
    }
  } catch {
    // Cache read failure — proceed without cache
  }
  return null;
}

async function putCached<T>(key: string, value: T): Promise<void> {
  try {
    const cache = caches.default;
    const req = new Request(key, { method: "GET" });
    const res = new Response(JSON.stringify(value), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    });
    await cache.put(req, res);
  } catch {
    // Cache write failure — not critical
  }
}

// ── deps.dev ─────────────────────────────────────────────────────────────────

async function fetchDepsdev(name: string): Promise<DepsDev | null> {
  const cacheKey = `https://haunted-lockfile-cache.internal/depsdev/${encodeName(name)}`;
  
  // Check cache first
  const cached = await getCached<DepsDev>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.deps.dev/v3/systems/npm/packages/${encodeName(name)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, unknown>;
    const versions: DepsDev["versions"] = [];

    const rawVersions = data["versions"];
    if (Array.isArray(rawVersions)) {
      for (const v of rawVersions as unknown[]) {
        if (v === null || typeof v !== "object") continue;
        const vObj = v as Record<string, unknown>;
        
        // versionKey is a nested object: { system: "npm", name: "...", version: "..." }
        const vkRaw = vObj["versionKey"];
        const versionStr =
          vkRaw !== null && typeof vkRaw === "object" && !Array.isArray(vkRaw)
            ? (vkRaw as Record<string, unknown>)["version"]
            : null;
        
        const publishedAt = typeof vObj["publishedAt"] === "string" ? vObj["publishedAt"] : null;
        const isDeprecated = vObj["isDeprecated"] === true;
        const deprecatedReason = typeof vObj["deprecatedReason"] === "string" ? vObj["deprecatedReason"] : undefined;
        
        if (typeof versionStr === "string") {
          versions.push({ version: versionStr, publishedAt, isDeprecated, deprecatedReason });
        }
      }
    }

    const latestPublishedAt =
      versions
        .filter((v) => v.publishedAt !== null)
        .sort((a, b) => {
          const ta = new Date(a.publishedAt as string).getTime();
          const tb = new Date(b.publishedAt as string).getTime();
          return tb - ta;
        })[0]?.publishedAt ?? null;

    const result: DepsDev = { latestPublishedAt, versions };
    
    // Cache the result
    await putCached(cacheKey, result);
    
    return result;
  } catch {
    return null;
  }
}

// ── OSV ──────────────────────────────────────────────────────────────────────

/**
 * Step 1: querybatch — returns only vuln IDs per package.
 * Step 2: for each unique ID, GET /v1/vulns/{id} for severity + summary.
 * Since MAX_PACKAGES_PER_REQUEST is 10, we never exceed OSV's 1000-query limit.
 */
async function fetchOsvBatch(packages: PackageInput[]): Promise<Map<number, OsvAdvisory[]>> {
  const queries = packages.map((p) => ({
    package: { name: p.name, ecosystem: "npm" },
    version: p.version,
  }));

  const idsByIndex = new Map<number, string[]>();
  
  try {
    const res = await fetchWithTimeout("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries }),
    });

    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      const rawResults = data["results"];
      if (Array.isArray(rawResults)) {
        for (let i = 0; i < (rawResults as unknown[]).length; i++) {
          const entry = (rawResults as unknown[])[i];
          const ids: string[] = [];
          if (entry !== null && typeof entry === "object") {
            const entryObj = entry as Record<string, unknown>;
            const vulns = entryObj["vulns"];
            if (Array.isArray(vulns)) {
              for (const vuln of vulns as unknown[]) {
                if (vuln !== null && typeof vuln === "object") {
                  const v = vuln as Record<string, unknown>;
                  if (typeof v["id"] === "string") ids.push(v["id"]);
                }
              }
            }
          }
          idsByIndex.set(i, ids);
        }
      }
    }
  } catch {
    // querybatch failed — mark all indexes as empty
    for (let i = 0; i < queries.length; i++) {
      if (!idsByIndex.has(i)) {
        idsByIndex.set(i, []);
      }
    }
  }

  // Collect unique IDs across all packages
  const allIds = new Set<string>();
  for (const ids of idsByIndex.values()) {
    for (const id of ids) allIds.add(id);
  }

  // Step 2: fetch details for each unique advisory (with caching, max 25 concurrent)
  const advisoryCache = new Map<string, OsvAdvisory>();
  const idList = [...allIds];
  const BATCH = 25;
  for (let i = 0; i < idList.length; i += BATCH) {
    const slice = idList.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (id) => {
        const adv = await fetchOsvAdvisory(id);
        advisoryCache.set(id, adv);
      })
    );
  }

  // Build final result map
  const result = new Map<number, OsvAdvisory[]>();
  for (const [idx, ids] of idsByIndex.entries()) {
    result.set(idx, ids.map((id) => advisoryCache.get(id) ?? { id, url: `https://osv.dev/vulnerability/${id}` }));
  }
  return result;
}

async function fetchOsvAdvisory(id: string): Promise<OsvAdvisory> {
  const cacheKey = `https://haunted-lockfile-cache.internal/osv/${encodeURIComponent(id)}`;
  
  // Check cache first
  const cached = await getCached<OsvAdvisory>(cacheKey);
  if (cached) return cached;

  const fallback: OsvAdvisory = { id, url: `https://osv.dev/vulnerability/${id}` };
  
  try {
    const res = await fetchWithTimeout(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`);
    if (!res.ok) return fallback;
    const data = (await res.json()) as Record<string, unknown>;

    const summary = typeof data["summary"] === "string" ? data["summary"] : undefined;

    // Severity: look in database_specific.severity (a string) or severity[0].score
    let severity: string | undefined;
    const dbSpec = data["database_specific"];
    if (dbSpec !== null && typeof dbSpec === "object") {
      const sev = (dbSpec as Record<string, unknown>)["severity"];
      if (typeof sev === "string") severity = sev;
    }
    if (!severity) {
      const sevArr = data["severity"];
      if (Array.isArray(sevArr) && (sevArr as unknown[]).length > 0) {
        const first = (sevArr as unknown[])[0];
        if (first !== null && typeof first === "object") {
          const score = (first as Record<string, unknown>)["score"];
          if (typeof score === "string") severity = score;
        }
      }
    }

    const result: OsvAdvisory = { id, severity, summary, url: `https://osv.dev/vulnerability/${id}` };
    
    // Cache the result
    await putCached(cacheKey, result);
    
    return result;
  } catch {
    return fallback;
  }
}

// ── npm registry ─────────────────────────────────────────────────────────────

async function fetchNpm(name: string, version: string): Promise<NpmMeta | null> {
  const cacheKey = `https://haunted-lockfile-cache.internal/npm/${encodeName(name)}/${encodeURIComponent(version)}`;
  
  // Check cache first
  const cached = await getCached<NpmMeta>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const deprecated = typeof data["deprecated"] === "string" ? data["deprecated"] : undefined;
    
    const result: NpmMeta = { deprecated };
    
    // Cache the result
    await putCached(cacheKey, result);
    
    return result;
  } catch {
    return null;
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function handleHaunt(request: Request): Promise<Response> {
  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Body must be a JSON object" }, 400);
  }

  const bodyObj = body as Record<string, unknown>;
  const rawPackages = bodyObj["packages"];

  if (!Array.isArray(rawPackages)) {
    return json({ error: "Body must have a 'packages' array" }, 400);
  }

  if (rawPackages.length > MAX_PACKAGES_PER_REQUEST) {
    return json(
      { error: `Too many packages in one request: ${rawPackages.length} > ${MAX_PACKAGES_PER_REQUEST}` },
      413
    );
  }

  if (rawPackages.length > MAX_PACKAGES) {
    return json(
      { error: `Too many packages: ${rawPackages.length} > ${MAX_PACKAGES}` },
      400
    );
  }

  // Validate and coerce each entry
  const packages: PackageInput[] = [];
  for (const item of rawPackages as unknown[]) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const i = item as Record<string, unknown>;
    if (typeof i["name"] !== "string" || typeof i["version"] !== "string") continue;
    packages.push({
      name: i["name"],
      version: i["version"],
      isDirect: i["isDirect"] === true,
    });
  }

  if (packages.length === 0) {
    return json({ results: [] }, 200);
  }

  // ── Fetch upstream ───────────────────────────────────────────────────────
  const now = Date.now();

  // Fan out deps.dev calls (one per unique package name, max 25 concurrent)
  const uniqueNames = [...new Set(packages.map((p) => p.name))];
  const depsdevResults = new Map<string, DepsDev | null>();
  const DEPSDEV_BATCH = 25;
  for (let i = 0; i < uniqueNames.length; i += DEPSDEV_BATCH) {
    const slice = uniqueNames.slice(i, i + DEPSDEV_BATCH);
    const fetched = await Promise.all(slice.map((name) => fetchDepsdev(name)));
    for (let j = 0; j < slice.length; j++) {
      const name = slice[j];
      if (name !== undefined) {
        depsdevResults.set(name, fetched[j] ?? null);
      }
    }
  }

  // OSV querybatch + per-ID severity fetch (with chunking and caching)
  const osvByIndex = await fetchOsvBatch(packages);
  const osvOk = osvByIndex.size > 0 || packages.length === 0;

  // npm registry — only call as fallback when deps.dev didn't have the locked version or didn't answer
  const npmResults = new Map<string, NpmMeta | null>();
  const npmFetches = packages
    .filter((p) => {
      const depsdev = depsdevResults.get(p.name);
      if (!depsdev) return true; // deps.dev failed, try npm
      const lockedVersionData = depsdev.versions.find(v => v.version === p.version);
      if (!lockedVersionData) return true; // locked version not in deps.dev, try npm
      return false; // deps.dev has the locked version, don't call npm
    })
    .map(async (p) => {
      const meta = await fetchNpm(p.name, p.version);
      npmResults.set(`${p.name}@${p.version}`, meta);
    });
  await Promise.all(npmFetches);

  // ── Classify ─────────────────────────────────────────────────────────────
  const results: HauntResult[] = packages.map((pkg, i) => {
    const depsdev = depsdevResults.get(pkg.name) ?? null;
    const advisories = osvByIndex.get(i) ?? [];
    const npm = npmResults.get(`${pkg.name}@${pkg.version}`) ?? null;

    // sources.npm is true only if npm actually answered
    const npmCalled = npmResults.has(`${pkg.name}@${pkg.version}`);
    
    return classify(pkg, depsdev, advisories, npm, now, {
      depsdev: depsdev !== null,
      osv: osvOk,
      npm: npmCalled && npm !== null,
    });
  });

  // ── Return ────────────────────────────────────────────────────────────────
  const responseBody = JSON.stringify({ results });
  const response = new Response(responseBody, {
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
    },
  });

  return response;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}
