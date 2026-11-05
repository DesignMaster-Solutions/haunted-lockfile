import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { parseLockfile } from "../src/parseLockfile.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const v3Lockfile = {
  lockfileVersion: 3,
  name: "test-project",
  packages: {
    "": {
      name: "test-project",
      version: "1.0.0",
      dependencies: { request: "^2.88.2" },
      devDependencies: { vitest: "^2.0.0" },
    },
    "node_modules/request": {
      version: "2.88.2",
      resolved: "https://registry.npmjs.org/request/-/request-2.88.2.tgz",
    },
    "node_modules/vitest": {
      version: "2.1.8",
      resolved: "https://registry.npmjs.org/vitest/-/vitest-2.1.8.tgz",
    },
    "node_modules/request/node_modules/qs": {
      version: "6.5.3",
      resolved: "https://registry.npmjs.org/qs/-/qs-6.5.3.tgz",
    },
    "node_modules/@scope/pkg": {
      version: "1.2.3",
      resolved: "https://registry.npmjs.org/@scope/pkg/-/pkg-1.2.3.tgz",
    },
  },
};

const v2Lockfile = {
  lockfileVersion: 2,
  name: "test-project",
  dependencies: {
    request: {
      version: "2.88.2",
      resolved: "https://registry.npmjs.org/request/-/request-2.88.2.tgz",
      dependencies: {
        qs: { version: "6.5.3" },
      },
    },
    lodash: { version: "4.17.21" },
  },
};

// ── v3 parsing ────────────────────────────────────────────────────────────────

describe("parseLockfile — v3", () => {
  it("extracts all packages", () => {
    const { packages, errors } = parseLockfile(v3Lockfile);
    expect(errors).toHaveLength(0);
    const names = packages.map((p) => p.name);
    expect(names).toContain("request");
    expect(names).toContain("vitest");
    expect(names).toContain("qs");
    expect(names).toContain("@scope/pkg");
  });

  it("marks direct dependencies correctly", () => {
    const { packages } = parseLockfile(v3Lockfile);
    const request = packages.find((p) => p.name === "request");
    const vitest = packages.find((p) => p.name === "vitest");
    const qs = packages.find((p) => p.name === "qs");
    expect(request?.isDirect).toBe(true);
    expect(vitest?.isDirect).toBe(true);
    expect(qs?.isDirect).toBe(false); // nested
  });

  it("deduplicates name@version pairs", () => {
    // Duplicate entry with same version
    const withDup = {
      ...v3Lockfile,
      packages: {
        ...v3Lockfile.packages,
        "node_modules/request/node_modules/form-data": { version: "2.88.2" }, // same version as request but different name
        "node_modules/another-copy-of-request": { version: "2.88.2" }, // same version, last node_modules/ segment is "another-copy-of-request"
      },
    };
    const { packages } = parseLockfile(withDup);
    const requestEntries = packages.filter((p) => p.name === "request");
    expect(requestEntries).toHaveLength(1);
  });

  it("accepts a JSON string as input", () => {
    const { packages, errors } = parseLockfile(JSON.stringify(v3Lockfile));
    expect(errors).toHaveLength(0);
    expect(packages.length).toBeGreaterThan(0);
  });
});

// ── v2 parsing ────────────────────────────────────────────────────────────────

describe("parseLockfile — v2", () => {
  it("extracts packages including nested deps", () => {
    const { packages, errors } = parseLockfile(v2Lockfile);
    expect(errors).toHaveLength(0);
    const names = packages.map((p) => p.name);
    expect(names).toContain("request");
    expect(names).toContain("qs");
    expect(names).toContain("lodash");
  });

  it("marks direct dependencies correctly", () => {
    const { packages } = parseLockfile(v2Lockfile);
    const request = packages.find((p) => p.name === "request");
    const qs = packages.find((p) => p.name === "qs");
    expect(request?.isDirect).toBe(true);
    expect(qs?.isDirect).toBe(false);
  });
});

// ── Error handling (REQ-05) ───────────────────────────────────────────────────

describe("parseLockfile — error handling", () => {
  it("returns an error for invalid JSON string, does not throw", () => {
    expect(() => {
      const result = parseLockfile("{ not valid json }");
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.packages).toHaveLength(0);
    }).not.toThrow();
  });

  it("returns an error for a JSON array, does not throw", () => {
    const result = parseLockfile([1, 2, 3]);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns an error for null, does not throw", () => {
    const result = parseLockfile(null);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns an error for empty object, does not throw", () => {
    const result = parseLockfile({});
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("reports unsupported lockfileVersion but does not throw", () => {
    const result = parseLockfile({ lockfileVersion: 1, dependencies: {} });
    // version 1 is unsupported — should produce a warning but not crash
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns an error for a plain string (not JSON)", () => {
    const result = parseLockfile("hello world");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.packages).toHaveLength(0);
  });
});

// ── Property-based tests ──────────────────────────────────────────────────────

describe("parseLockfile — property-based", () => {
  it("never throws on any input", () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => parseLockfile(input)).not.toThrow();
      })
    );
  });

  it("never throws on any string input", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = parseLockfile(s);
        // Either packages or errors should always be arrays
        expect(Array.isArray(result.packages)).toBe(true);
        expect(Array.isArray(result.errors)).toBe(true);
      })
    );
  });

  it("deduplicates: all returned name@version pairs are unique", () => {
    // Build a v3 lockfile with potentially duplicate entries
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
            version: fc.stringMatching(/^\d+\.\d+\.\d+$/),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (pkgs) => {
          const packages: Record<string, { version: string }> = {};
          for (const p of pkgs) {
            packages[`node_modules/${p.name}`] = { version: p.version };
          }
          const lockfile = { lockfileVersion: 3, packages: { "": {}, ...packages } };
          const result = parseLockfile(lockfile);
          const ids = result.packages.map((p) => `${p.name}@${p.version}`);
          const uniqueIds = new Set(ids);
          expect(ids.length).toBe(uniqueIds.size);
        }
      )
    );
  });

  it("mutant 4: same package at same version in two locations only appears once", () => {
    const lockfile = {
      lockfileVersion: 3,
      packages: {
        "": {
          name: "test",
          version: "1.0.0",
        },
        "node_modules/pkg": {
          version: "1.0.0",
        },
        "node_modules/a/node_modules/pkg": {
          version: "1.0.0", // same pkg@1.0.0 nested
        },
      },
    };

    const result = parseLockfile(lockfile);
    const pkgs = result.packages.filter((p) => p.name === "pkg");
    
    expect(pkgs).toHaveLength(1);
    expect(pkgs[0]?.version).toBe("1.0.0");
  });
});

// ── Defect tests (code review items) ────────────────────────────────────────

describe("parseLockfile — defect fixes", () => {
  it("defect 6: skips workspace packages (not under node_modules/)", () => {
    const lockfile = {
      lockfileVersion: 3,
      packages: {
        "": {
          name: "my-workspace",
          version: "1.0.0",
          dependencies: { "real-dep": "^1.0.0" },
        },
        "packages/my-lib": {
          name: "@workspace/my-lib",
          version: "1.0.0",
        },
        "node_modules/real-dep": {
          version: "1.0.0",
        },
      },
    };

    const result = parseLockfile(lockfile);
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]?.name).toBe("real-dep");
    expect(result.errors).toHaveLength(0);
  });

  it("defect 6: skips packages with link:true (symlinked workspace packages)", () => {
    const lockfile = {
      lockfileVersion: 3,
      packages: {
        "": {
          name: "my-workspace",
          version: "1.0.0",
          dependencies: { "@workspace/my-lib": "^1.0.0", "real-dep": "^1.0.0" },
        },
        "node_modules/@workspace/my-lib": {
          resolved: "packages/my-lib",
          link: true,
        },
        "node_modules/real-dep": {
          version: "1.0.0",
        },
      },
    };

    const result = parseLockfile(lockfile);
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]?.name).toBe("real-dep");
    expect(result.errors).toHaveLength(0);
  });

  it("defect 6: direct deps are only those at top level of node_modules/", () => {
    const lockfile = {
      lockfileVersion: 3,
      packages: {
        "": {
          name: "test",
          version: "1.0.0",
          dependencies: { "pkg-a": "^1.0.0" },
        },
        "node_modules/pkg-a": {
          version: "1.0.0",
        },
        "node_modules/pkg-a/node_modules/pkg-b": {
          version: "2.0.0",
        },
      },
    };

    const result = parseLockfile(lockfile);
    expect(result.packages).toHaveLength(2);
    const pkgA = result.packages.find((p) => p.name === "pkg-a");
    const pkgB = result.packages.find((p) => p.name === "pkg-b");
    expect(pkgA?.isDirect).toBe(true);
    expect(pkgB?.isDirect).toBe(false);
  });

  it("mutant 3: nested b and root b at different versions — only root is direct", () => {
    const lockfile = {
      lockfileVersion: 3,
      packages: {
        "": {
          name: "test",
          version: "1.0.0",
          dependencies: { "b": "^2.0.0" },
        },
        "node_modules/b": {
          version: "2.0.0", // root b at 2.0.0
        },
        "node_modules/a": {
          version: "1.0.0",
        },
        "node_modules/a/node_modules/b": {
          version: "1.0.0", // nested b at 1.0.0
        },
      },
    };

    const result = parseLockfile(lockfile);
    expect(result.packages).toHaveLength(3);
    
    const rootB = result.packages.find((p) => p.name === "b" && p.version === "2.0.0");
    const nestedB = result.packages.find((p) => p.name === "b" && p.version === "1.0.0");
    
    expect(rootB?.isDirect).toBe(true); // only node_modules/b is direct
    expect(nestedB?.isDirect).toBe(false); // node_modules/a/node_modules/b is not direct
  });
});
