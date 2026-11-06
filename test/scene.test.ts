import { describe, it, expect } from "vitest";
import { sceneRenderer } from "../src/page/scene.js";

// The scene code ships as a string inlined into the page; evaluate it the same way.
const scene = new Function(
  `const escHtml = (s) => String(s); ${sceneRenderer}; return { buildGraveyardScene };`,
)() as { buildGraveyardScene: (r: unknown[], g: number) => string };

const plots = ["zombie", "ghost", "tombstone", "alive"] as const;
const results = Array.from({ length: 151 }, (_, i) => ({
  name: `pkg-${String(i).padStart(3, "0")}`,
  version: "1.0.0",
  plot: plots[i % 4],
  isDirect: i < 12,
  daysSinceRelease: (i * 97) % 4000,
  advisories: [],
}));

describe("graveyard layout", () => {
  const svg = scene.buildGraveyardScene(results, 360);

  it("renders one grave per package, in input order (click handler maps grave i to results[i])", () => {
    const ids = [...svg.matchAll(/class="grave-item" data-index="(\d+)"/g)].map((m) => Number(m[1]));
    expect(ids).toEqual(results.map((_, i) => i));
    for (const [i, m] of [...svg.matchAll(/<title>([^<]+)<\/title>/g)].entries()) {
      expect(m[1]).toBe(`${results[i].name}@1.0.0`);
    }
  });

  it("never puts two graves on the same spot (151 packages)", () => {
    const labels = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*font-family="SF Mono/g)];
    const spots = new Set(labels.map((m) => `${m[1]},${m[2]}`));
    expect(labels.length).toBe(151);
    expect(spots.size).toBe(151);
  });

  it("grows the scene to fit every row", () => {
    const [, h] = svg.match(/viewBox="0 0 1000 ([\d.]+)"/)!;
    expect(Number(h)).toBeGreaterThanOrEqual(360 + 15 * 240);
  });

});
