// src/parseLockfile.ts — pure function, no network calls
import type { PackageInput, ParseResult } from "./types.js";

/**
 * Parse an npm package-lock.json (lockfileVersion 2 or 3) and return
 * a deduplicated list of {name, version, isDirect} entries.
 *
 * Never throws: all errors are returned in the `errors` array.
 */
export function parseLockfile(input: unknown): ParseResult {
  const errors: string[] = [];
  const packages: PackageInput[] = [];

  // Accept a raw string (paste) or an already-parsed object
  let json: unknown = input;
  if (typeof input === "string") {
    try {
      json = JSON.parse(input);
    } catch {
      errors.push("Input is not valid JSON.");
      return { packages, errors };
    }
  }

  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    errors.push("Input is not a JSON object.");
    return { packages, errors };
  }

  const obj = json as Record<string, unknown>;

  const lockfileVersion = obj["lockfileVersion"];
  if (lockfileVersion !== 2 && lockfileVersion !== 3) {
    errors.push(
      `Unsupported or missing lockfileVersion (got ${JSON.stringify(lockfileVersion)}). ` +
        "Only versions 2 and 3 are supported."
    );
    // Attempt to parse anyway if the packages key exists
  }

  // lockfileVersion 3: packages map, root entry is ""
  const packagesMap = obj["packages"];
  if (packagesMap !== null && typeof packagesMap === "object" && !Array.isArray(packagesMap)) {
    const map = packagesMap as Record<string, unknown>;

    // Collect direct dep names from the root entry
    const rootEntry = map[""];
    const directNames = new Set<string>();
    if (rootEntry !== null && typeof rootEntry === "object" && !Array.isArray(rootEntry)) {
      const rootObj = rootEntry as Record<string, unknown>;
      for (const depField of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
        const deps = rootObj[depField];
        if (deps !== null && typeof deps === "object" && !Array.isArray(deps)) {
          for (const name of Object.keys(deps as Record<string, unknown>)) {
            directNames.add(name);
          }
        }
      }
    }

    const seen = new Set<string>();
    for (const [key, value] of Object.entries(map)) {
      if (key === "") continue; // skip the root entry
      
      // Skip workspace packages (not under node_modules/)
      if (!key.startsWith("node_modules/")) continue;

      if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
      const pkg = value as Record<string, unknown>;
      
      // Skip symlinked workspace packages
      if (pkg["link"] === true) continue;

      // Keys are like "node_modules/foo" or "node_modules/@scope/foo"
      // or nested "node_modules/foo/node_modules/bar"
      const name = keyToPackageName(key);
      if (!name) {
        errors.push(`Could not extract package name from key: ${key}`);
        continue;
      }

      const version = typeof pkg["version"] === "string" ? pkg["version"] : null;
      if (!version) {
        errors.push(`Package ${name} is missing a version.`);
        continue;
      }

      const id = `${name}@${version}`;
      if (seen.has(id)) continue;
      seen.add(id);

      // Direct deps are those whose key is exactly node_modules/<name>
      const isDirect = directNames.has(name) && key === `node_modules/${name}`;

      packages.push({
        name,
        version,
        isDirect,
      });
    }

    return { packages, errors };
  }

  // lockfileVersion 2: legacy "dependencies" map (nested)
  const depsMap = obj["dependencies"];
  if (depsMap !== null && typeof depsMap === "object" && !Array.isArray(depsMap)) {
    // Collect top-level names as direct deps
    const directNames = new Set(Object.keys(depsMap as Record<string, unknown>));
    const seen = new Set<string>();

    function walkDeps(deps: Record<string, unknown>, isDirect: boolean): void {
      for (const [name, value] of Object.entries(deps)) {
        if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
        const pkg = value as Record<string, unknown>;

        const version = typeof pkg["version"] === "string" ? pkg["version"] : null;
        if (!version) {
          errors.push(`Package ${name} is missing a version.`);
          continue;
        }

        const id = `${name}@${version}`;
        if (!seen.has(id)) {
          seen.add(id);
          packages.push({ name, version, isDirect: isDirect && directNames.has(name) });
        }

        // Recurse into nested dependencies (hoisting conflicts in v2)
        const nested = pkg["dependencies"];
        if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
          walkDeps(nested as Record<string, unknown>, false);
        }
      }
    }

    walkDeps(depsMap as Record<string, unknown>, true);
    return { packages, errors };
  }

  errors.push("No 'packages' or 'dependencies' field found — is this a package-lock.json?");
  return { packages, errors };
}

/**
 * Convert a node_modules path key to a package name.
 * "node_modules/foo"                    → "foo"
 * "node_modules/@scope/foo"             → "@scope/foo"
 * "node_modules/foo/node_modules/bar"   → "bar"
 */
export function keyToPackageName(key: string): string | null {
  // Find the last occurrence of "node_modules/"
  const marker = "node_modules/";
  const idx = key.lastIndexOf(marker);
  if (idx === -1) return null;
  const rest = key.slice(idx + marker.length);
  if (!rest) return null;
  // rest is either "foo" or "@scope/foo"
  return rest;
}
