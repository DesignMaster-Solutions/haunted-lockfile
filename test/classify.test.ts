import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { classify } from "../src/classify.js";
import type { DepsDev, NpmMeta, OsvAdvisory, PackageInput } from "../src/types.js";
import depsdevFixture from "./fixtures/depsdev-request.json";
import osvAdvisoryFixture from "./fixtures/osv-advisory-request.json";
import npmFixture from "./fixtures/npm-request.json";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePkg(overrides?: Partial<PackageInput>): PackageInput {
  return { name: "foo", version: "1.0.0", isDirect: false, ...overrides };
}

function makeDepsdev(overrides?: Partial<DepsDev>): DepsDev {
  // Use a date that is recent (within 730 days of NOW = 2026-11-05)
  const recentDate = "2026-01-01T00:00:00Z"; // ~310 days before NOW
  return {
    latestPublishedAt: recentDate,
    versions: [{ version: "1.0.0", publishedAt: recentDate, isDeprecated: false }],
    ...overrides,
  };
}

const noAdvisories: OsvAdvisory[] = [];
const oneAdvisory: OsvAdvisory[] = [{ id: "GHSA-xxxx-xxxx-xxxx", url: "https://osv.dev/vulnerability/GHSA-xxxx-xxxx-xxxx" }];
const sources = { depsdev: true, osv: true, npm: true };

// A fixed "now" so tests are deterministic: 2026-11-05
const NOW = new Date("2026-11-05T12:00:00Z").getTime();

// ── REQ-32: request@2.88.2 is a Zombie ──────────────────────────────────────

describe("request@2.88.2 (REQ-32)", () => {
  it("classifies as zombie", () => {
    const pkg: PackageInput = { name: "request", version: "2.88.2", isDirect: true };

    // Build DepsDev from the real fixture
    const depsdev: DepsDev = {
      latestPublishedAt: "2020-02-11T16:35:36Z",
      versions: depsdevFixture.versions.map((v) => ({
        version: v.versionKey.version,
        publishedAt: v.publishedAt,
        isDeprecated: v.isDeprecated,
        deprecatedReason: v.deprecatedReason,
      })),
    };

    const advisory: OsvAdvisory = {
      id: osvAdvisoryFixture.id,
      summary: osvAdvisoryFixture.summary,
      severity: osvAdvisoryFixture.database_specific.severity,
      url: `https://osv.dev/vulnerability/${osvAdvisoryFixture.id}`,
    };

    const npm: NpmMeta = { deprecated: npmFixture.deprecated };

    const result = classify(pkg, depsdev, [advisory], npm, NOW, sources);

    expect(result.plot).toBe("zombie");
    expect(result.deprecationMessage).toMatch(/deprecated/i);
    expect(result.advisories).toHaveLength(1);
    expect(result.advisories[0]?.id).toBe("GHSA-p8p7-x288-28g6");
    expect(result.daysSinceRelease).toBeGreaterThan(730);
  });
});

// ── Unit tests for each plot ─────────────────────────────────────────────────

describe("classify — alive", () => {
  it("returns alive for a recent, non-deprecated, advisory-free package", () => {
    const result = classify(makePkg(), makeDepsdev(), noAdvisories, { deprecated: undefined }, NOW, sources);
    expect(result.plot).toBe("alive");
  });

  it("returns alive when only OSV hits but package is not ghost/tombstone", () => {
    // REQ-10: advisory with no ghost/tombstone → still alive (not zombie)
    const result = classify(makePkg(), makeDepsdev(), oneAdvisory, null, NOW, sources);
    expect(result.plot).toBe("alive");
  });
});

describe("classify — ghost", () => {
  it("ghost when npm marks deprecated", () => {
    const result = classify(
      makePkg(),
      makeDepsdev(),
      noAdvisories,
      { deprecated: "Use X instead" },
      NOW,
      sources
    );
    expect(result.plot).toBe("ghost");
    expect(result.deprecationMessage).toBe("Use X instead");
  });

  it("ghost when depsdev marks the locked version as deprecated", () => {
    const result = classify(
      makePkg({ version: "1.0.0" }),
      makeDepsdev({
        versions: [
          { version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z", isDeprecated: true, deprecatedReason: "Use 2.0.0" }
        ]
      }),
      noAdvisories,
      null,
      NOW,
      sources
    );
    expect(result.plot).toBe("ghost");
    expect(result.deprecationMessage).toBe("Use 2.0.0");
  });
});

describe("classify — tombstone", () => {
  it("tombstone when last release > 730 days ago", () => {
    // 731 days before NOW
    const staleDate = new Date(NOW - 731 * 24 * 60 * 60 * 1000).toISOString();
    const result = classify(
      makePkg(),
      makeDepsdev({
        versions: [{ version: "1.0.0", publishedAt: staleDate, isDeprecated: false }],
        latestPublishedAt: staleDate,
      }),
      noAdvisories,
      null,
      NOW,
      sources
    );
    expect(result.plot).toBe("tombstone");
    expect(result.daysSinceRelease).toBeGreaterThanOrEqual(731);
  });

  it("alive when last release is exactly 730 days ago (boundary)", () => {
    const boundary = new Date(NOW - 730 * 24 * 60 * 60 * 1000).toISOString();
    const result = classify(
      makePkg(),
      makeDepsdev({ 
        versions: [{ version: "1.0.0", publishedAt: boundary, isDeprecated: false }], 
        latestPublishedAt: boundary 
      }),
      noAdvisories,
      null,
      NOW,
      sources
    );
    expect(result.plot).toBe("alive");
  });
});

describe("classify — zombie", () => {
  it("zombie when deprecated + advisory", () => {
    const result = classify(
      makePkg({ version: "1.0.0" }),
      makeDepsdev({ 
        versions: [{ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z", isDeprecated: true }]
      }),
      oneAdvisory,
      null,
      NOW,
      sources
    );
    expect(result.plot).toBe("zombie");
  });

  it("zombie when stale + advisory", () => {
    const staleDate = new Date(NOW - 800 * 24 * 60 * 60 * 1000).toISOString();
    const result = classify(
      makePkg(),
      makeDepsdev({ 
        versions: [{ version: "1.0.0", publishedAt: staleDate, isDeprecated: false }], 
        latestPublishedAt: staleDate 
      }),
      oneAdvisory,
      null,
      NOW,
      sources
    );
    expect(result.plot).toBe("zombie");
  });
});

// ── Edge cases (REQ-11) ───────────────────────────────────────────────────────

describe("classify — edge cases", () => {
  it("does not crash when depsdev is null", () => {
    expect(() => classify(makePkg(), null, noAdvisories, null, NOW, sources)).not.toThrow();
  });

  it("does not crash when all dates are missing", () => {
    const noDatesDepsdev: DepsDev = { latestPublishedAt: null, versions: [] };
    expect(() => classify(makePkg(), noDatesDepsdev, noAdvisories, null, NOW, sources)).not.toThrow();
  });

  it("ignores future publish dates when computing staleness (REQ-11)", () => {
    const futureDate = new Date(NOW + 365 * 24 * 60 * 60 * 1000).toISOString();
    // Only version is in the future — should be treated as unknown, not stale
    const result = classify(
      makePkg(),
      { latestPublishedAt: futureDate, versions: [{ version: "1.0.0", publishedAt: futureDate, isDeprecated: false }] },
      noAdvisories,
      null,
      NOW,
      sources
    );
    // No valid past dates → not stale, not deprecated → alive
    expect(result.plot).toBe("alive");
    expect(result.daysSinceRelease).toBeUndefined();
  });

  it("handles invalid date strings without crashing", () => {
    const badDepsdev: DepsDev = {
      latestPublishedAt: "not-a-date",
      versions: [{ version: "1.0.0", publishedAt: "not-a-date", isDeprecated: false }],
    };
    expect(() => classify(makePkg(), badDepsdev, noAdvisories, null, NOW, sources)).not.toThrow();
  });
});

// ── Property-based tests (REQ-06, REQ-12) ────────────────────────────────────

describe("classify — property-based", () => {
  // REQ-06: always exactly one plot
  it("always returns exactly one of the four plots", () => {
    const plotSet = new Set<string>(["alive", "ghost", "tombstone", "zombie"]);

    fc.assert(
      fc.property(
        fc.record({
          isDeprecated: fc.boolean(),
          // publishedAt as days-before-now (0 = today, 2000 = very old)
          daysBefore: fc.option(fc.integer({ min: 0, max: 2000 }), { nil: null }),
          hasAdvisory: fc.boolean(),
          npmDeprecated: fc.option(fc.string({ minLength: 1 }), { nil: null }),
        }),
        ({ isDeprecated, daysBefore, hasAdvisory, npmDeprecated }) => {
          const publishedAt =
            daysBefore !== null
              ? new Date(NOW - daysBefore * 24 * 60 * 60 * 1000).toISOString()
              : null;

          const depsdev: DepsDev = {
            latestPublishedAt: publishedAt,
            versions: publishedAt ? [{ version: "1.0.0", publishedAt, isDeprecated }] : [],
          };
          const npm: NpmMeta | null = npmDeprecated ? { deprecated: npmDeprecated } : null;
          const advisories = hasAdvisory ? oneAdvisory : noAdvisories;

          const result = classify(makePkg(), depsdev, advisories, npm, NOW, sources);
          expect(plotSet.has(result.plot)).toBe(true);
        }
      )
    );
  });

  // REQ-12: no advisory → never zombie
  it("a package with no advisory is never classified as zombie", () => {
    fc.assert(
      fc.property(
        fc.record({
          isDeprecated: fc.boolean(),
          daysBefore: fc.option(fc.integer({ min: 0, max: 2000 }), { nil: null }),
        }),
        ({ isDeprecated, daysBefore }) => {
          const publishedAt =
            daysBefore !== null
              ? new Date(NOW - daysBefore * 24 * 60 * 60 * 1000).toISOString()
              : null;
          const depsdev: DepsDev = {
            latestPublishedAt: publishedAt,
            versions: publishedAt ? [{ version: "1.0.0", publishedAt, isDeprecated }] : [],
          };

          const result = classify(makePkg(), depsdev, [], null, NOW, sources);
          expect(result.plot).not.toBe("zombie");
        }
      )
    );
  });

  // Dates in the future never crash (REQ-11)
  it("never crashes on arbitrary ISO strings", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constantFrom(
              "2099-01-01T00:00:00Z",
              "1970-01-01T00:00:00Z",
              "not-a-date",
              "",
              "2024-02-29T00:00:00Z"
            )
          )
        ),
        (publishedAts) => {
          const versions = publishedAts.map((p, i) => ({ version: `1.${i}.0`, publishedAt: p, isDeprecated: false }));
          const depsdev: DepsDev = { latestPublishedAt: null, versions };
          expect(() => classify(makePkg(), depsdev, [], null, NOW, sources)).not.toThrow();
        }
      )
    );
  });
});
