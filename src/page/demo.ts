// src/page/demo.ts — the "try the demo lockfile" sample: a small legacy Express API.
// Picked so a first-time visitor sees all four plots (checked against the live /api/haunt on 2026-11-06):
// zombie: request, uuid@3, minimist@1.2.5, hoek@4 · ghost: left-pad, querystring, har-validator
// tombstone: inherits, is-number, isarray · alive: express, lodash, moment, ms, chalk
const DIRECT: Record<string, string> = {
  express: "4.21.2", request: "2.88.2", uuid: "3.4.0", moment: "2.29.1",
  lodash: "4.17.21", chalk: "5.3.0", "left-pad": "1.3.0",
};
const TRANSITIVE: Record<string, string> = {
  minimist: "1.2.5", hoek: "4.2.0", querystring: "0.2.0", "har-validator": "5.1.5",
  inherits: "2.0.4", "is-number": "7.0.0", isarray: "1.0.0", ms: "2.1.3",
};

const packages: Record<string, unknown> = {
  "": { name: "legacy-orders-api", version: "1.4.0", dependencies: { ...DIRECT } },
};
for (const [name, version] of Object.entries({ ...DIRECT, ...TRANSITIVE })) {
  packages[`node_modules/${name}`] = { version };
}

export const DEMO_LOCKFILE = { name: "legacy-orders-api", version: "1.4.0", lockfileVersion: 3, requires: true, packages };
