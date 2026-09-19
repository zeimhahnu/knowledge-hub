# Gate triage — 2026-09-19

## Result

The task brief says the repository contains 28 `scripts/check-*.mjs` files. The checked-out repository actually contains **51**. Per the instruction to omit none and invent none, this report measures every file returned by that glob rather than silently dropping 23 real gates.

| Bucket | Count |
|---|---:|
| PASSES | 49 |
| FAILS | 1 |
| BROKEN | 1 |
| VACUOUS | 0 |
| **Observed total** | **51** |

The requested 28-row total is therefore not consistent with the repository state. The four observed bucket counts sum to 51, not 28.

## Method

- Working tree: `knowledge-hub` at the task checkout, commit present before this report.
- Runtime: Node `v22.23.2`.
- Each `scripts/check-*.mjs` was invoked individually with Node; elapsed time is the wall-clock duration of that invocation in milliseconds.
- No application/server was started. This is intentional: `check-responsive.mjs` documents that it needs a server on `127.0.0.1:3100`; without one, that is a BROKEN gate in the current automation shape, not a code failure.
- `NO_PROXY` included `127.0.0.1,localhost` so local fixture servers were reached directly.
- No source, check, workflow, or configuration was changed by measurement.

## Per-script observations

| Script | Bucket | Exit | Runtime (ms) | Observation |
|---|---|---:|---:|---|
| `check-3d-rules.mjs` | PASSES | 0 | 56 |  |
| `check-access-replay.mjs` | FAILS | 1 | 244 | Six replay assertions failed with `CA05`, including the jti-less repeated-use and jti single-use cases; the check's local JWKS fixture started successfully. |
| `check-analyst-gating.mjs` | PASSES | 0 | 98 |  |
| `check-api-paths.mjs` | PASSES | 0 | 76 |  |
| `check-ca-analyst-context.mjs` | PASSES | 0 | 102 |  |
| `check-ca-analyst-relay-diagnostics.mjs` | PASSES | 0 | 95 |  |
| `check-ca-analyst-relay-validation.mjs` | PASSES | 0 | 163 |  |
| `check-ca-analyst-rules.mjs` | PASSES | 0 | 58 |  |
| `check-ca-analyst-stream.mjs` | PASSES | 0 | 107 |  |
| `check-caev-codes.mjs` | PASSES | 0 | 98 |  |
| `check-ca-origin-boundary.mjs` | PASSES | 0 | 118 |  |
| `check-catalog-selector.mjs` | PASSES | 0 | 160 |  |
| `check-citations.mjs` | PASSES | 0 | 162 |  |
| `check-coverage.mjs` | PASSES | 0 | 95 |  |
| `check-coverage-settings.mjs` | PASSES | 0 | 105 |  |
| `check-coverage-state.mjs` | PASSES | 0 | 145 |  |
| `check-coverage-timeline.mjs` | PASSES | 0 | 149 |  |
| `check-design-system.mjs` | PASSES | 0 | 59 |  |
| `check-divergence.mjs` | PASSES | 0 | 100 |  |
| `check-findings-language.mjs` | PASSES | 0 | 137 |  |
| `check-fixed-positioning.mjs` | PASSES | 0 | 60 |  |
| `check-franklin-catalog.mjs` | PASSES | 0 | 64 |  |
| `check-fund-lifecycle.mjs` | PASSES | 0 | 97 |  |
| `check-fund-master.mjs` | PASSES | 0 | 103 |  |
| `check-fund-rule-scope.mjs` | PASSES | 0 | 119 |  |
| `check-gates-selfcontained.mjs` | PASSES | 0 | 64 |  |
| `check-glossary.mjs` | PASSES | 0 | 67 |  |
| `check-homepage.mjs` | PASSES | 0 | 64 |  |
| `check-ingest-auth.mjs` | PASSES | 0 | 103 |  |
| `check-ingest-hash.mjs` | PASSES | 0 | 180 |  |
| `check-ingest-pipeline.mjs` | PASSES | 0 | 132 |  |
| `check-ingest-storage.mjs` | PASSES | 0 | 137 |  |
| `check-lookup-density.mjs` | PASSES | 0 | 55 |  |
| `check-lookup-groups.mjs` | PASSES | 0 | 157 |  |
| `check-lookup-layout.mjs` | PASSES | 0 | 58 |  |
| `check-lookup.mjs` | PASSES | 0 | 165 |  |
| `check-market-data-retirement.mjs` | PASSES | 0 | 100 |  |
| `check-motion.mjs` | PASSES | 0 | 76 |  |
| `check-news-issuer.mjs` | PASSES | 0 | 103 |  |
| `check-news-route.mjs` | PASSES | 0 | 161 |  |
| `check-news-validation.mjs` | PASSES | 0 | 105 |  |
| `check-qualifier.mjs` | PASSES | 0 | 161 |  |
| `check-responsive.mjs` | BROKEN | 1 | 4128 | 56 navigations failed with `ERR_CONNECTION_REFUSED` because nothing was listening on `127.0.0.1:3100`; the script explicitly requires that server. |
| `check-rules.mjs` | PASSES | 0 | 105 |  |
| `check-settings-save.mjs` | PASSES | 0 | 98 |  |
| `check-symbols.mjs` | PASSES | 0 | 99 |  |
| `check-typeahead.mjs` | PASSES | 0 | 103 |  |
| `check-upload.mjs` | PASSES | 0 | 98 |  |
| `check-vendor-confirmation.mjs` | PASSES | 0 | 161 |  |
| `check-vendor-entailment.mjs` | PASSES | 0 | 105 |  |
| `check-vendor-groups-rendered.mjs` | PASSES | 0 | 158 |  |

## VACUOUS review

No check was classified VACUOUS. The exit-0 checks each exercised source-backed assertions, fixture behavior, or structural invariants; none merely asserted a string that is unconditionally present without testing a meaningful condition.

## Findings

1. `check-access-replay.mjs` is a real FAIL: its self-contained cryptographic fixture runs, but the access replay contract currently returns `CA05` where the check expects valid repeated jti-less use and valid first-use jti verification.
2. `check-responsive.mjs` is BROKEN in this invocation mode: the check requires a running app server, while the repository's current `npm test` runner skips it rather than booting one.
3. The task brief and Track D disagree with the checkout: the brief says 28 checks, while the repository contains 51 and `scripts/run-checks.mjs` discovers all 51 (skipping only the server-dependent responsive check).
4. This report is measurement-only. It does not repair the failing or broken checks.
