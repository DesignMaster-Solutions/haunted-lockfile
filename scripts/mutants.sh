#!/bin/zsh
# Each mutant breaks one rule; the suite must go red. Restores the file after each.
cd "$(dirname "$0")/.."
m() { # file, sed expr, label
  cp "$1" "$1.mut"; sed -i '' "$2" "$1"
  if cmp -s "$1" "$1.mut"; then echo "NOOP  $3"; else
    out=$(npx vitest run 2>&1 | grep -E "Tests +[0-9]"); echo "$( echo $out | grep -q failed && echo RED || echo GREEN)  $3 :: $out"; fi
  mv "$1.mut" "$1"
}
m src/classify.ts 's/if (hasAdvisory && (isDeprecated || isStale))/if (hasAdvisory)/' "zombie without ghost/tombstone"
m src/classify.ts 's/const STALE_DAYS = 730;/const STALE_DAYS = 7300;/' "tombstone threshold 730 days"
m src/classify.ts 's/isStale = daysSinceRelease > STALE_DAYS;/isStale = false;/' "tombstone never set"
m src/classify.ts 's/if (lockedVersionData?.isDeprecated)/if (depsdev.versions.some(v => v.isDeprecated))/' "deprecation from any version (false ghost)"
m src/classify.ts 's/v.publishedAt !== null \&\& !v.isDeprecated/v.publishedAt !== null/' "next step suggests deprecated version"
m src/classify.ts 's/.filter((t) => !isNaN(t) \&\& t <= now)/.filter((t) => true)/' "future/invalid dates"
m src/parseLockfile.ts 's/if (pkg\["link"\] === true) continue;//' "skip link:true"
m src/parseLockfile.ts 's/if (!key.startsWith("node_modules\/")) continue;//' "skip workspace keys"
m src/parseLockfile.ts 's/const isDirect = directNames.has(name) \&\& key === `node_modules\/${name}`;/const isDirect = directNames.has(name);/' "nested copy is not direct"
m src/parseLockfile.ts 's/if (seen.has(id)) continue;//' "dedupe name@version"
m src/haunt.ts 's/if (rawPackages.length > MAX_PACKAGES_PER_REQUEST)/if (false)/' "413 above 10 per request"
m src/haunt.ts 's/if (!lockedVersionData) return true; \/\/ locked/if (!lockedVersionData) return false; \/\/ locked/' "npm fallback when deps.dev lacks version"
m src/worker.ts 's/${keyToPackageName.toString()}\\n//' "served parser complete"
