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
      expect(m[1]).toBe(`${results[i]!.name}@1.0.0`);
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

describe("zombie hand and labels", () => {
  const svg = scene.buildGraveyardScene(results, 360);

  it("animates the hand by pixels: in SVG a % translate is a share of the whole viewBox and drops it rows below", async () => {
    const { styles } = await import("../src/page/styles.js");
    const rise = styles.match(/@keyframes zombie-rise\s*\{[\s\S]*?\n\s*\}\s*\n/)![0];
    expect(rise).not.toMatch(/translateY\([^)]*%\)/);
  });

  it("keeps the whole hand above its grave's name label", () => {
    const graves = svg.split('class="grave-item"').slice(1);
    for (const g of graves.filter((s) => s.includes("zombie-hand"))) {
      const nameY = Number(g.match(/<text x="[\d.]+" y="([\d.]+)"[^>]*font-family="SF Mono/)![1]);
      const hand = g.slice(g.indexOf("zombie-hand"));
      const bottoms = [
        ...[...hand.matchAll(/<rect x="[\d.-]+" y="([\d.-]+)" width="[\d.]+" height="([\d.]+)"/g)].map((m) => Number(m[1]) + Number(m[2])),
        ...[...hand.matchAll(/cy="([\d.-]+)" rx="[\d.]+" ry="([\d.]+)"/g)].map((m) => Number(m[1]) + Number(m[2])),
      ];
      expect(bottoms.length).toBeGreaterThan(0);
      expect(Math.max(...bottoms)).toBeLessThanOrEqual(nameY - 11);
    }
  });

  it("gives grave labels a dark halo so they read through the fog", () => {
    const labels = [...svg.matchAll(/<text x="[\d.]+" y="[\d.]+"([^>]*)font-family="SF Mono/g)];
    expect(labels.length).toBe(151);
    for (const m of labels) expect(m[1]).toMatch(/paint-order="stroke"/);
  });
});
