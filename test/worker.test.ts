import { describe, it, expect, vi } from "vitest";
import worker from "../src/worker.js";
import { parseLockfile, keyToPackageName } from "../src/parseLockfile.js";
import requestLockfile from "./fixtures/request-lock.json";

// ── Mock the Cloudflare globals ──────────────────────────────────────────────

const cachesStub = {
  default: {
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockImplementation(() => Promise.resolve()),
  },
};

const cryptoStub = {
  subtle: {
    digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer),
  },
};

vi.stubGlobal("caches", cachesStub);
vi.stubGlobal("crypto", cryptoStub);

// ── Tests ────────────────────────────────────────────────────────────────────

describe("worker — GET /parse.js", () => {
  it("serves the real parseLockfile and keyToPackageName functions as JavaScript", async () => {
    const req = new Request("https://example.com/parse.js", { method: "GET" });
    const res = await worker.fetch(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/javascript; charset=utf-8");

    const code = await res.text();
    
    // The response should include both function definitions as strings
    expect(code).toContain("keyToPackageName");
    expect(code).toContain("parseLockfile");
    expect(code).toContain("function");
  });

  it("served parser evaluates and works identically to the module", async () => {
    const req = new Request("https://example.com/parse.js", { method: "GET" });
    const res = await worker.fetch(req);
    const code = await res.text();

    // Evaluate the served code and extract the functions
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const evalContext = new Function(`
      ${code}
      return { parseLockfile, keyToPackageName };
    `)() as { 
      parseLockfile: typeof parseLockfile; 
      keyToPackageName: typeof keyToPackageName;
    };

    const servedParseLockfile = evalContext.parseLockfile;
    const servedKeyToPackageName = evalContext.keyToPackageName;

    // Test keyToPackageName
    expect(servedKeyToPackageName("node_modules/foo")).toBe(
      keyToPackageName("node_modules/foo")
    );
    expect(servedKeyToPackageName("node_modules/@scope/bar")).toBe(
      keyToPackageName("node_modules/@scope/bar")
    );
    expect(servedKeyToPackageName("node_modules/foo/node_modules/bar")).toBe(
      keyToPackageName("node_modules/foo/node_modules/bar")
    );

    // Test parseLockfile with the real fixture
    const moduleResult = parseLockfile(requestLockfile);
    const servedResult = servedParseLockfile(requestLockfile);

    expect(servedResult.packages).toEqual(moduleResult.packages);
    expect(servedResult.errors).toEqual(moduleResult.errors);
  });
});
