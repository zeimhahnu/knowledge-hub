# CA-20 OpenWiki pilot boundary

**Task:** `task-2026-10-04-ca20-openwiki-pilot-boundary-r2`
**Status:** blocked at executor preflight; no vault, trigger, production, Supabase, or credential mutation was performed.
**Repository revision:** `eac45821fe8631d2069d5e3a6af83b24adbda46f` (`origin/main` at 2026-10-04T11:25Z), branch `task/task-2026-10-04-ca20-openwiki-pilot-boundary-r2`.

This is a deliberately narrow repository-docs pilot boundary. It is not a replacement for the cited vendor methodology corpus and is unrelated to Supabase.

## Approved isolated source set

Only these non-personal Markdown documents are in scope for a future isolated vault:

| Path | SHA-256 | Use |
| --- | --- | --- |
| `README.md` | `0f4d371c78099a0d6c17e7e645309d3fe59107f2b5f2f62ad65156fe86861135` | product boundary, routes, data/source policy |
| `docs/plans/corporate-action-hub/00-status.md` | `4ec22dedc53a97697377de8d05d3b98d590717b37a19ff74845894980b71fc1b` | historical P0 acceptance record |
| `docs/plans/corporate-action-hub/03-p1a-program-design.md` | `5d812028e06e357932c3eeac9df5b7e7176e26c72082109d67cf229faaea436f` | P1a design and service boundary |
| `docs/plans/corporate-action-hub/08-p1a-origin-boundary.md` | `e07e9ae8ae414719364a4cc3d3714c1052e877b6682f3ad50c7acf4e8208d343` | authentication/deployment boundary |

Excluded: source PDFs and `SOURCES/` authority, `src/data/` and generated data, application code, `.next/`, `out/`, `node_modules/`, `.git/`, secrets, environment files, personal/agent memory, Supabase, and any production endpoint. The OpenWiki pilot must not infer or rewrite vendor rules.

## Claim evidence to retain with imported pages

- **C1 — Product scope:** CoAc explains seven vendors and cites each answer to vendor methodology: `README.md:3-9`.
- **C2 — Source discipline:** committed rules carry `source_ref`; absent vendor documents remain explicit rather than guessed: `README.md:56-78`.
- **C3 — Access boundary:** the P1a relay validates Access assertions and forwards only allowlisted contextual data: `docs/plans/corporate-action-hub/08-p1a-origin-boundary.md:7-13`.
- **C4 — Historical status:** the P0 ledger records its baseline and acceptance evidence as a dated historical record: `docs/plans/corporate-action-hub/00-status.md:1-18`.

These claims are evidence-bearing documentation only; they are not authority for changing `rules.json` or tracked PDFs.

## Executor result and lifecycle boundary

Observed executor:

```text
OpenClaw 2026.9.4 (3a9d69d)
Node v24.21.0
npm 11.19.0
memory-wiki bundled version 2026.9.4, status disabled, enabled false
```

Read-only `openclaw wiki status --json`, `openclaw wiki doctor --json`, and a mutation-free preflight attempt of `openclaw wiki init --json` all failed before vault resolution with the same exact error:

```text
"wiki" is not a plugin; it is a command provided by the "memory-wiki" plugin. Add "memory-wiki" to `plugins.allow` instead of "wiki".
```

Therefore the blocker is upstream of every lifecycle operation:

| Required behavior | Result | Reason |
| --- | --- | --- |
| Initial import/init | **BLOCKED** | command resolution fails before vault initialization |
| No-op update | **BLOCKED / not run** | no initialized pilot vault and same command gate |
| Incremental update | **BLOCKED / not run** | no initialized pilot vault and same command gate |
| Resumed update | **BLOCKED / not run** | no interrupted run can exist without the executor |

No `plugins.enable`, gateway restart, config edit, `wiki init`, ingest, update trigger, or upload was performed. Enabling `memory-wiki` through the approved gateway/configuration owner is a prerequisite for the next step; it is intentionally outside this branch and task lane.

## Required next step after owner unblocks executor

Run the isolated vault only against the four files and this exact revision, then capture receipts for init, repeated unchanged import (no-op), one changed source (incremental), and an interrupted/resumed update. Run `wiki lint` and retain Claim evidence plus the exclusions above. Do not enable an update trigger until all four lifecycle receipts and exclusion checks exist.

## Required PR acceptance bullets

- Use only an approved non-personal CA-Hub repository-docs source set in an isolated pilot; record exact source/revision, tool/version/config, Claim evidence and exclusions.
- Exercise or prove the concrete blocker for initial, no-op, incremental and resumed update behavior. Do not enable an update trigger until those checks and exclusions are evidenced.
- Keep CA-20 distinct from Supabase: no Supabase provisioning/upload/spending, no generated replacement for vendor knowledge, no production service/config/model/provider/credential action.
- Use isolated origin/main worktree and branch + PR only; exact branch derived from task id; one PR with these bullets verbatim, no merge/deploy/restart.
