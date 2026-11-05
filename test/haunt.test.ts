import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleHaunt } from "../src/haunt.js";
import depsdevFixture from "./fixtures/depsdev-request.json";
import osvQuerybatchFixture from "./fixtures/osv-request.json";
import osvAdvisoryFixture from "./fixtures/osv-advisory-request.json";
import npmFixture from "./fixtures/npm-request.json";
import requestLockfile from "./fixtures/request-lock.json";

// ── Mock the Cloudflare globals (caches, crypto) ──────────────────────────────

// caches.default stub — no-op cache (always misses, put returns Promise)
const cachesStub = {
  default: {
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockImplementation(() => Promise.resolve()),
  },
};

// crypto.subtle.digest stub — returns a fixed hash buffer so tests are deterministic
const cryptoStub = {
  subtle: {
    digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer),
  },
};

// Make them available globally (Cloudflare Worker globals not present in Node)
vi.stubGlobal("caches", cachesStub);
vi.stubGlobal("crypto", cryptoStub);

// ── Mock fetch ────────────────────────────────────────────────────────────────

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeFetchMock(
  handlers: Record<string, unknown>
): (url: string | URL | Request, init?: RequestInit) => Promise<Response> {
  return async (url: string | URL | Request) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    for (const [pattern, body] of Object.entries(handlers)) {
      if (urlStr.includes(pattern)) {
        return makeJsonResponse(body);
      }
    }
    return new Response("not found", { status: 404 });
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, method = "POST"): Request {
  return new Request("https://example.com/api/haunt", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("handleHaunt — validation", () => {
  it("rejects more than MAX_PACKAGES_PER_REQUEST packages with HTTP 413", async () => {
    // 2001 packages in one request hits the per-request limit first
    const packages = Array.from({ length: 2001 }, (_, i) => ({
      name: `pkg-${i}`,
      version: "1.0.0",
    }));
    const req = makeRequest({ packages });
    const res = await handleHaunt(req);
    expect(res.status).toBe(413);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/too many packages/i);
  });

  it("rejects non-POST with 405", async () => {
    const req = new Request("https://example.com/api/haunt", { method: "GET" });
    const res = await handleHaunt(req);
    expect(res.status).toBe(405);
  });

  it("rejects invalid JSON body with 400", async () => {
    const req = new Request("https://example.com/api/haunt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json }",
    });
    const res = await handleHaunt(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 with empty results for empty packages array", async () => {
    const req = makeRequest({ packages: [] });
    const res = await handleHaunt(req);
    expect(res.status).toBe(200);
    const body = await res.json() as { results: unknown[] };
    expect(body.results).toHaveLength(0);
  });

  it("responds to CORS preflight OPTIONS with 204", async () => {
    const req = new Request("https://example.com/api/haunt", { method: "OPTIONS" });
    const res = await handleHaunt(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("handleHaunt — request@2.88.2 is a zombie", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      makeFetchMock({
        "api.deps.dev": depsdevFixture,
        "api.osv.dev/v1/querybatch": osvQuerybatchFixture,
        "api.osv.dev/v1/vulns/GHSA-p8p7-x288-28g6": osvAdvisoryFixture,
        "registry.npmjs.org": npmFixture,
      })
    );
    cachesStub.default.match.mockResolvedValue(undefined); // cache miss
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("classifies request@2.88.2 as zombie with correct details", async () => {
    const req = makeRequest({
      packages: [{ name: "request", version: "2.88.2", isDirect: true }],
    });
    const res = await handleHaunt(req);
    expect(res.status).toBe(200);

    const body = await res.json() as { results: Array<{
      plot: string;
      name: string;
      version: string;
      advisories: Array<{ id: string; severity?: string; summary?: string }>;
      deprecationMessage?: string;
      lastPublishedAt?: string;
    }> };
    
    expect(body.results).toHaveLength(1);
    const result = body.results[0];
    
    expect(result?.plot).toBe("zombie");
    expect(result?.name).toBe("request");
    expect(result?.version).toBe("2.88.2");
    expect(result?.deprecationMessage).toContain("deprecated");
    expect(result?.lastPublishedAt).toBe("2020-02-11T16:35:36.000Z");
    expect(result?.advisories).toHaveLength(1);
    expect(result?.advisories[0]?.id).toBe("GHSA-p8p7-x288-28g6");
    expect(result?.advisories[0]?.severity).toBe("MODERATE");
    expect(result?.advisories[0]?.summary).toBe("Server-Side Request Forgery in Request");
  });

  it("includes CORS headers in the response", async () => {
    const req = makeRequest({
      packages: [{ name: "request", version: "2.88.2" }],
    });
    const res = await handleHaunt(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("handleHaunt — partial results when a source fails", () => {
  beforeEach(() => {
    // deps.dev fails, OSV succeeds, npm succeeds
    vi.stubGlobal("fetch", async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : (url as Request).url;
      if (urlStr.includes("api.deps.dev")) {
        throw new Error("Network error");
      }
      if (urlStr.includes("api.osv.dev/v1/querybatch")) {
        return makeJsonResponse({ results: [{ vulns: [] }] });
      }
      if (urlStr.includes("api.osv.dev/v1/vulns/")) {
        return makeJsonResponse(osvAdvisoryFixture);
      }
      if (urlStr.includes("registry.npmjs.org")) {
        return makeJsonResponse({ name: "some-pkg", version: "1.0.0" });
      }
      return new Response("not found", { status: 404 });
    });
    cachesStub.default.match.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns HTTP 200 with partial results when deps.dev is unavailable", async () => {
    const req = makeRequest({
      packages: [{ name: "some-pkg", version: "1.0.0", isDirect: true }],
    });
    const res = await handleHaunt(req);
    // Partial results — still 200
    expect(res.status).toBe(200);
    const body = await res.json() as { results: Array<{ sources: { depsdev: boolean } }> };
    expect(body.results).toHaveLength(1);
    // sources.depsdev should be false because the call failed
    expect(body.results[0]?.sources?.depsdev).toBe(false);
  });
});

// ── Defect tests (code review items) ────────────────────────────────────────

describe("handleHaunt — defect fixes", () => {
  beforeEach(() => {
    cachesStub.default.match.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defect 1: uses per-version deprecation from deps.dev, not package-wide", async () => {
    // Package with mixed deprecation: 2.88.2 is deprecated, but not all versions
    vi.stubGlobal("fetch", makeFetchMock({
      "api.deps.dev": {
        versions: [
          {
            versionKey: { system: "npm", name: "test-pkg", version: "2.0.0" },
            publishedAt: "2026-01-01T00:00:00Z",
            isDeprecated: false,
          },
          {
            versionKey: { system: "npm", name: "test-pkg", version: "1.0.0" },
            publishedAt: "2023-01-01T00:00:00Z",
            isDeprecated: true,
            deprecatedReason: "Version 1.x is deprecated, use 2.x",
          },
        ],
      },
      "api.osv.dev/v1/querybatch": { results: [{ vulns: [] }] },
    }));

    const req = makeRequest({
      packages: [{ name: "test-pkg", version: "1.0.0", isDirect: true }],
    });
    const res = await handleHaunt(req);
    expect(res.status).toBe(200);

    const body = await res.json() as { results: Array<{ plot: string; deprecationMessage?: string }> };
    expect(body.results[0]?.plot).toBe("ghost");
    expect(body.results[0]?.deprecationMessage).toBe("Version 1.x is deprecated, use 2.x");
  });

  it("defect 2: only calls npm registry as fallback when deps.dev doesn't have the version", async () => {
    const fetchSpy = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : (url as Request).url;
      if (urlStr.includes("api.deps.dev")) {
        return makeJsonResponse({
          versions: [
            {
              versionKey: { system: "npm", name: "pkg", version: "1.0.0" },
              publishedAt: "2026-01-01T00:00:00Z",
              isDeprecated: true,
              deprecatedReason: "From deps.dev",
            },
          ],
        });
      }
      if (urlStr.includes("api.osv.dev/v1/querybatch")) {
        return makeJsonResponse({ results: [{ vulns: [] }] });
      }
      if (urlStr.includes("registry.npmjs.org")) {
        // This should NOT be called since deps.dev has the version
        return makeJsonResponse({ deprecated: "From npm" });
      }
      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchSpy);

    const req = makeRequest({
      packages: [{ name: "pkg", version: "1.0.0", isDirect: true }],
    });
    await handleHaunt(req);

    // Verify npm registry was NOT called
    const npmCalls = (fetchSpy.mock.calls as Array<[string | URL | Request]>).filter((call) => {
      const url = typeof call[0] === "string" ? call[0] : call[0] instanceof URL ? call[0].href : (call[0] as Request).url;
      return url.includes("registry.npmjs.org");
    });
    expect(npmCalls.length).toBe(0);
  });

  it("defect 2: calls npm registry when deps.dev doesn't have the locked version", async () => {
    const fetchSpy = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : (url as Request).url;
      if (urlStr.includes("api.deps.dev")) {
        return makeJsonResponse({
          versions: [
            {
              versionKey: { system: "npm", name: "pkg", version: "2.0.0" },
              publishedAt: "2026-01-01T00:00:00Z",
              isDeprecated: false,
            },
          ],
        });
      }
      if (urlStr.includes("api.osv.dev/v1/querybatch")) {
        return makeJsonResponse({ results: [{ vulns: [] }] });
      }
      if (urlStr.includes("registry.npmjs.org")) {
        return makeJsonResponse({ deprecated: "From npm registry" });
      }
      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchSpy);

    const req = makeRequest({
      packages: [{ name: "pkg", version: "1.0.0", isDirect: true }],
    });
    const res = await handleHaunt(req);
    const body = await res.json() as { results: Array<{ sources: { npm: boolean } }> };

    // Verify npm was called and source is marked true
    const npmCalls = (fetchSpy.mock.calls as Array<[string | URL | Request]>).filter((call) => {
      const url = typeof call[0] === "string" ? call[0] : call[0] instanceof URL ? call[0].href : (call[0] as Request).url;
      return url.includes("registry.npmjs.org");
    });
    expect(npmCalls.length).toBe(1);
    expect(body.results[0]?.sources.npm).toBe(true);
  });

  it("defect 3: fetches OSV advisory details with severity and summary", async () => {
    vi.stubGlobal("fetch", makeFetchMock({
      "api.deps.dev": depsdevFixture,
      "api.osv.dev/v1/querybatch": osvQuerybatchFixture,
      "api.osv.dev/v1/vulns/GHSA-p8p7-x288-28g6": osvAdvisoryFixture,
    }));

    const req = makeRequest({
      packages: [{ name: "request", version: "2.88.2", isDirect: true }],
    });
    const res = await handleHaunt(req);
    const body = await res.json() as { results: Array<{ advisories: Array<{ id: string; severity?: string; summary?: string }> }> };

    expect(body.results[0]?.advisories[0]?.id).toBe("GHSA-p8p7-x288-28g6");
    expect(body.results[0]?.advisories[0]?.severity).toBe("MODERATE");
    expect(body.results[0]?.advisories[0]?.summary).toBe("Server-Side Request Forgery in Request");
  });

  it("defect 5: suggests alternative for request@2.88.2 (all versions deprecated)", async () => {
    vi.stubGlobal("fetch", makeFetchMock({
      "api.deps.dev": depsdevFixture, // All versions are deprecated
      "api.osv.dev/v1/querybatch": osvQuerybatchFixture,
      "api.osv.dev/v1/vulns/GHSA-p8p7-x288-28g6": osvAdvisoryFixture,
    }));

    const req = makeRequest({
      packages: [{ name: "request", version: "2.88.2", isDirect: true }],
    });
    const res = await handleHaunt(req);
    const body = await res.json() as { results: Array<{ nextStep: string }> };

    expect(body.results[0]?.nextStep).toContain("alternative");
  });

  it("defect 5: suggests upgrade when newer non-deprecated version exists", async () => {
    vi.stubGlobal("fetch", makeFetchMock({
      "api.deps.dev": {
        versions: [
          {
            versionKey: { system: "npm", name: "pkg", version: "2.0.0" },
            publishedAt: "2026-01-01T00:00:00Z",
            isDeprecated: false,
          },
          {
            versionKey: { system: "npm", name: "pkg", version: "1.0.0" },
            publishedAt: "2023-01-01T00:00:00Z",
            isDeprecated: true,
          },
        ],
      },
      "api.osv.dev/v1/querybatch": { results: [{ vulns: [] }] },
    }));

    const req = makeRequest({
      packages: [{ name: "pkg", version: "1.0.0", isDirect: true }],
    });
    const res = await handleHaunt(req);
    const body = await res.json() as { results: Array<{ nextStep: string }> };

    expect(body.results[0]?.nextStep).toContain("2.0.0");
  });

  it("mutant 2: suggest non-deprecated version when newest version is deprecated", async () => {
    vi.stubGlobal("fetch", makeFetchMock({
      "api.deps.dev": {
        versions: [
          {
            versionKey: { system: "npm", name: "pkg", version: "3.0.0" },
            publishedAt: "2026-03-01T00:00:00Z",
            isDeprecated: true, // newest is deprecated
          },
          {
            versionKey: { system: "npm", name: "pkg", version: "2.0.0" },
            publishedAt: "2026-01-01T00:00:00Z",
            isDeprecated: false, // but this one is not
          },
          {
            versionKey: { system: "npm", name: "pkg", version: "1.0.0" },
            publishedAt: "2023-01-01T00:00:00Z",
            isDeprecated: true,
          },
        ],
      },
      "api.osv.dev/v1/querybatch": { results: [{ vulns: [] }] },
    }));

    const req = makeRequest({
      packages: [{ name: "pkg", version: "1.0.0", isDirect: true }],
    });
    const res = await handleHaunt(req);
    const body = await res.json() as { results: Array<{ nextStep: string }> };

    // Should suggest 2.0.0 (non-deprecated), not 3.0.0 (deprecated)
    expect(body.results[0]?.nextStep).toContain("2.0.0");
    expect(body.results[0]?.nextStep).not.toContain("3.0.0");
  });
});

describe("handleHaunt — per-request package limit", () => {
  it("rejects requests with more than MAX_PACKAGES_PER_REQUEST packages with HTTP 413", async () => {
    // MAX_PACKAGES_PER_REQUEST should be exported from haunt.ts
    const { MAX_PACKAGES_PER_REQUEST } = await import("../src/haunt.js");
    
    const packages = [];
    for (let i = 0; i < MAX_PACKAGES_PER_REQUEST + 1; i++) {
      packages.push({ name: `pkg-${i}`, version: "1.0.0", isDirect: false });
    }

    const req = makeRequest({ packages });
    const res = await handleHaunt(req);
    
    expect(res.status).toBe(413);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/too many packages/i);
    expect(body.error).toContain(String(MAX_PACKAGES_PER_REQUEST));
  });

  it("accepts requests with exactly MAX_PACKAGES_PER_REQUEST packages", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchMock({
        "api.deps.dev": { versions: [] },
        "api.osv.dev/v1/querybatch": { results: [] },
        "registry.npmjs.org": {},
      })
    );
    cachesStub.default.match.mockResolvedValue(undefined);

    const { MAX_PACKAGES_PER_REQUEST } = await import("../src/haunt.js");
    
    const packages = [];
    for (let i = 0; i < MAX_PACKAGES_PER_REQUEST; i++) {
      packages.push({ name: `pkg-${i}`, version: "1.0.0", isDirect: false });
    }

    const req = makeRequest({ packages });
    const res = await handleHaunt(req);
    
    expect(res.status).toBe(200);
  });
});

describe("handleHaunt — OSV querybatch: one call per request", () => {
  beforeEach(() => {
    cachesStub.default.match.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("makes exactly one OSV querybatch call per request", async () => {
    let querybatchCallCount = 0;
    
    const fetchSpy = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : (url as Request).url;
      
      if (urlStr.includes("api.deps.dev")) {
        return makeJsonResponse({ versions: [] });
      }
      
      if (urlStr.includes("api.osv.dev/v1/querybatch")) {
        querybatchCallCount++;
        const reqUrl = url as Request;
        const body = await reqUrl.json() as { queries: unknown[] };
        const queryCount = body.queries.length;
        
        // Since MAX_PACKAGES_PER_REQUEST is 10, we never exceed it
        expect(queryCount).toBeLessThanOrEqual(10);
        
        const results = Array.from({ length: queryCount }, () => ({ vulns: [] }));
        return makeJsonResponse({ results });
      }
      
      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchSpy);

    // Create a request with 10 packages (the per-request max)
    const packages = [];
    for (let i = 0; i < 10; i++) {
      packages.push({ name: `pkg-${i}`, version: "1.0.0", isDirect: false });
    }

    const req = makeRequest({ packages });
    const res = await handleHaunt(req);
    
    expect(res.status).toBe(200);
    
    // With 10 packages, we should get exactly 1 querybatch call (not chunked)
    expect(querybatchCallCount).toBe(1);
  });
});
