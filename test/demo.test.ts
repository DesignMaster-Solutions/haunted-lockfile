import { describe, it, expect } from "vitest";
import { parseLockfile } from "../src/parseLockfile.js";
import { DEMO_LOCKFILE } from "../src/page/demo.js";
import { clientScript } from "../src/page/client.js";

describe("demo lockfile", () => {
  it("parses into 15 packages, 7 of them direct, so the demo fills all four plots", () => {
    const r = parseLockfile(DEMO_LOCKFILE);
    expect(r.errors).toEqual([]);
    expect(r.packages).toHaveLength(15);
    expect(r.packages.filter((p) => p.isDirect).map((p) => p.name).sort()).toEqual(
      ["chalk", "express", "left-pad", "lodash", "moment", "request", "uuid"],
    );
  });

  it("is the one inlined in the page script", () => {
    expect(clientScript).toContain(JSON.stringify(DEMO_LOCKFILE));
  });
});
