# Structure steering — Haunted Lockfile

```
haunted-lockfile/
├── .kiro/
│   ├── steering/         # product.md  tech.md  structure.md
│   ├── specs/haunted-lockfile/
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   └── hooks/
│       ├── test-on-save.sh       # run vitest when src/**/*.ts changes
│       └── typecheck-on-save.sh  # run tsc --noEmit when src/**/*.ts changes
├── src/
│   ├── worker.ts         # Cloudflare Worker entry point
│   ├── page.ts           # returns the full HTML string
│   ├── haunt.ts          # POST /api/haunt handler
│   ├── classify.ts       # classify(pkg, depsdev, osv, npm, now) → Plot
│   ├── parseLockfile.ts  # parseLockfile(json) → ParseResult
│   └── types.ts          # shared TypeScript interfaces
├── test/
│   ├── classify.test.ts
│   ├── parseLockfile.test.ts
│   ├── haunt.test.ts
│   └── fixtures/
│       ├── depsdev-request.json
│       ├── osv-request.json
│       └── npm-request.json
├── wrangler.toml
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

## Key invariants
- `parseLockfile` and `classify` are pure functions with no network calls — easy to test.
- All network I/O lives in `haunt.ts`, making mocking straightforward.
- The HTML page is a self-contained string returned by `page.ts`; no file-system reads at runtime.
