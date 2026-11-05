// src/classify.ts — pure function, no network calls
import type { DepsDev, HauntResult, NpmMeta, OsvAdvisory, PackageInput, Plot } from "./types.js";

const STALE_DAYS = 730;

/**
 * Classify a package into one of four plots and build its HauntResult.
 *
 * @param pkg      - name, version, isDirect from the lockfile
 * @param depsdev  - normalised deps.dev data (or null if the call failed)
 * @param advisories - OSV advisories for this package@version (empty if call failed)
 * @param npm      - npm registry metadata for this version (or null if call failed)
 * @param now      - the evaluation date (pass Date.now() in production; injectable for tests)
 * @param sources  - which upstream sources successfully responded
 */
export function classify(
  pkg: PackageInput,
  depsdev: DepsDev | null,
  advisories: OsvAdvisory[],
  npm: NpmMeta | null,
  now: number,
  sources: { depsdev: boolean; osv: boolean; npm: boolean }
): HauntResult {
  // ── Deprecation ─────────────────────────────────────────────────────────────
  // First try npm registry, then deps.dev for the LOCKED version
  let deprecationMessage: string | undefined = npm?.deprecated;
  
  if (!deprecationMessage && depsdev) {
    const lockedVersionData = depsdev.versions.find(v => v.version === pkg.version);
    if (lockedVersionData?.isDeprecated) {
      deprecationMessage = lockedVersionData.deprecatedReason || "Marked as deprecated on deps.dev.";
    }
  }
  
  const isDeprecated = deprecationMessage !== undefined;

  // ── Staleness ───────────────────────────────────────────────────────────────
  let lastPublishedAt: string | undefined;
  let daysSinceRelease: number | undefined;
  let isStale = false;

  if (depsdev) {
    const validDates = depsdev.versions
      .filter((v) => v.publishedAt !== null)
      .map((v) => new Date(v.publishedAt as string).getTime())
      .filter((t) => !isNaN(t) && t <= now); // ignore future / invalid dates

    if (validDates.length > 0) {
      const latestMs = Math.max(...validDates);
      lastPublishedAt = new Date(latestMs).toISOString();
      daysSinceRelease = Math.floor((now - latestMs) / (1000 * 60 * 60 * 24));
      isStale = daysSinceRelease > STALE_DAYS;
    }
  }

  // ── Plot ────────────────────────────────────────────────────────────────────
  const hasAdvisory = advisories.length > 0;
  let plot: Plot;

  // REQ-10: zombie requires advisory AND (ghost OR tombstone)
  if (hasAdvisory && (isDeprecated || isStale)) {
    plot = "zombie";
  } else if (isDeprecated) {
    plot = "ghost";
  } else if (isStale) {
    plot = "tombstone";
  } else {
    plot = "alive";
  }

  // ── Next step ───────────────────────────────────────────────────────────────
  const nextStep = buildNextStep(plot, pkg.name, pkg.version, depsdev);

  return {
    name: pkg.name,
    version: pkg.version,
    isDirect: pkg.isDirect,
    plot,
    deprecationMessage,
    lastPublishedAt,
    daysSinceRelease,
    advisories,
    nextStep,
    sources,
  };
}

function buildNextStep(plot: Plot, name: string, lockedVersion: string, depsdev: DepsDev | null): string {
  if (plot === "alive") {
    return "No action needed.";
  }

  // Try to find a newer, non-deprecated version from deps.dev
  if (depsdev && depsdev.versions.length > 0) {
    // Filter to published, non-deprecated versions newer than the locked one
    const candidates = depsdev.versions
      .filter((v) => v.publishedAt !== null && !v.isDeprecated)
      .map((v) => ({
        version: v.version,
        publishedAt: new Date(v.publishedAt as string).getTime(),
      }))
      .filter((v) => !isNaN(v.publishedAt));

    if (candidates.length > 0) {
      // Sort by publish date, newest first
      candidates.sort((a, b) => b.publishedAt - a.publishedAt);
      const newest = candidates[0];
      
      // Check if it's actually newer than locked version (simple string comparison as fallback)
      if (newest && newest.version !== lockedVersion) {
        return `Consider upgrading to ${name}@${newest.version}.`;
      }
    }
  }

  return `Look for a maintained alternative to ${name}.`;
}
