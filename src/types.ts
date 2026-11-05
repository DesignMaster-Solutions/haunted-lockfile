// src/types.ts — shared TypeScript interfaces for Haunted Lockfile

export type Plot = "ghost" | "tombstone" | "zombie" | "alive";

export interface PackageInput {
  name: string;
  version: string;
  isDirect: boolean;
}

// Normalised subset of a deps.dev package response
export interface DepsDev {
  /** ISO-8601 publish date of the most recently published version, or null if unknown */
  latestPublishedAt: string | null;
  /** All versions with their publish dates and deprecation status */
  versions: { version: string; publishedAt: string | null; isDeprecated: boolean; deprecatedReason?: string }[];
}

export interface OsvAdvisory {
  id: string;
  severity?: string;
  url?: string;
  summary?: string;
}

// Normalised subset of an npm registry version response
export interface NpmMeta {
  /** The deprecation message if set, otherwise undefined */
  deprecated?: string;
}

export interface Sources {
  depsdev: boolean;
  osv: boolean;
  npm: boolean;
}

export interface HauntResult {
  name: string;
  version: string;
  isDirect: boolean;
  plot: Plot;
  deprecationMessage?: string;
  lastPublishedAt?: string; // ISO-8601
  daysSinceRelease?: number;
  advisories: OsvAdvisory[];
  nextStep: string;
  sources: Sources;
}

export interface ParseResult {
  packages: PackageInput[];
  errors: string[];
}

// Shape of the POST /api/haunt request body
export interface HauntRequest {
  packages: { name: string; version: string }[];
}
