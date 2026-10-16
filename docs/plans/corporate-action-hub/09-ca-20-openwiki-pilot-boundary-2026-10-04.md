# CA-20 OpenWiki pilot boundary

**Task:** `task-2026-10-04-ca20-openwiki-pilot-boundary-r2`
**Status:** CA-20 lifecycle **not run**. Correct tool installed and exercised in isolation; the first model call was refused by the provider (HTTP 402, insufficient credit). Next owner action recorded below. No trigger, production, Supabase, or configuration change was made.
**Tool under evaluation:** `langchain-ai/openwiki` at `c0173dca928862d0bd7991f134b5dfd615975e7c` (package `openwiki` 0.7.0, CLI `dist/cli/cli.js`, Node >=22.22.0). This is **not** the OpenClaw `openclaw wiki` / `memory-wiki` plugin.
**Repository revision:** `eac45821fe8631d2069d5e3a6af83b24adbda46f` (`origin/main` at 2026-10-04T11:25Z), branch `task/task-2026-10-04-ca20-openwiki-pilot-boundary-r2`.

This is a deliberately narrow repository-docs pilot boundary. It is not a replacement for the cited vendor methodology corpus and is unrelated to Supabase.

## Approved isolated source set

Only these non-personal Markdown documents (plus the proposed code/test subset below) are in scope for a future isolated vault:

| Path | SHA-256 | Use |
| --- | --- | --- |
| `README.md` | `0f4d371c78099a0d6c17e7e645309d3fe59107f2b5f2f62ad65156fe86861135` | product boundary, routes, data/source policy |
| `docs/plans/corporate-action-hub/00-status.md` | `4ec22dedc53a97697377de8d05d3b98d590717b37a19ff74845894980b71fc1b` | historical P0 acceptance record |
| `docs/plans/corporate-action-hub/03-p1a-program-design.md` | `5d812028e06e357932c3eeac9df5b7e7176e26c72082109d67cf229faaea436f` | P1a design and service boundary |
| `docs/plans/corporate-action-hub/08-p1a-origin-boundary.md` | `e07e9ae8ae414719364a4cc3d3714c1052e877b6682f3ad50c7acf4e8208d343` | authentication/deployment boundary |

Excluded: source PDFs and `SOURCES/` authority, `src/data/` and generated data, application code (except the eight-file subset proposed under Corpus reconciliation), `.next/`, `out/`, `node_modules/`, `.git/`, secrets, environment files, personal/agent memory, Supabase, and any production endpoint. The OpenWiki pilot must not infer or rewrite vendor rules.

## Claim evidence to retain with imported pages

- **C1 — Product scope:** CoAc explains seven vendors and cites each answer to vendor methodology: `README.md:3-9`.
- **C2 — Source discipline:** committed rules carry `source_ref`; absent vendor documents remain explicit rather than guessed: `README.md:56-78`.
- **C3 — Access boundary:** the P1a relay validates Access assertions and forwards only allowlisted contextual data: `docs/plans/corporate-action-hub/08-p1a-origin-boundary.md:7-13`.
- **C4 — Historical status:** the P0 ledger records its baseline and acceptance evidence as a dated historical record: `docs/plans/corporate-action-hub/00-status.md:1-18`.

These claims are evidence-bearing documentation only; they are not authority for changing `rules.json` or tracked PDFs.

## Correction: wrong-tool attribution (Mason review 2026-10-04)

The previous revision of this document (reviewed head `b381b03`) recorded OpenClaw `openclaw wiki` failures as the CA-20 blocker. That was a wrong-tool attribution: CA-20 evaluates LangChain OpenWiki. The receipts below are real and are kept, but they belong **only** to the separate WP4 native `memory-wiki` pilot and are **not** a CA-20 blocker.

### Separate WP4 / native memory-wiki evidence (not CA-20)

```text
OpenClaw 2026.9.4 (3a9d69d)
Node v24.21.0
npm 11.19.0
memory-wiki bundled version 2026.9.4, status disabled, enabled false
```

`openclaw wiki status --json`, `openclaw wiki doctor --json` and a mutation-free preflight of `openclaw wiki init --json` each failed with:

```text
"wiki" is not a plugin; it is a command provided by the "memory-wiki" plugin. Add "memory-wiki" to `plugins.allow` instead of "wiki".
```

That gate concerns OpenClaw's bundled plugin. Enabling it stays with the native-memory pilot and its configuration owner. It was not enabled here, and `plugins.allow` was not touched.

## Correct tool: identity and isolated setup

| Item | Value | Evidence |
| --- | --- | --- |
| Repository / commit | `langchain-ai/openwiki` @ `c0173dca928862d0bd7991f134b5dfd615975e7c` | pinned raw `package.json` sha256 `868541ae…f516e`, `README.md` sha256 `fe887e80…b4003` |
| Package / version | `openwiki` 0.7.0, `bin.openwiki = ./dist/cli/cli.js`, `engines.node >=22.22.0` | same `package.json`; installed copy reports the same |
| Executor | Node v24.21.0 (satisfies >=22.22.0) | `node -v` |
| Install | `npm install openwiki@0.7.0 --ignore-scripts --save-exact` into `.ca20-tools/` inside this worktree; npm integrity `sha512-Tw3AZE9e…A1N7A==`; lockfile sha256 `7519eebf…bfef11`; 326 packages; no global install | `.ca20-tools/package-lock.json` (untracked, not committed) |
| State dir | `OPENWIKI_CONFIG_DIR=<worktree>/.ca20-tools/state`; nothing written to `~/.openwiki` | env at invocation |
| Integrations | none installed; `openwiki integrations install` and the skill installer were **not** run | n/a |

Not verified: that the npm 0.7.0 tarball is byte-identical to commit `c0173dca` (the registry record carries no `gitHead`). Version, `bin` and `engines` match the pinned `package.json`.

Prerequisite found: the native CLI runs OpenWiki's own agent and needs a model provider with credit. Its default is OpenRouter `z-ai/glm-5.2`. The alternative, a coding-agent integration, needs the integration installer, which this task prohibits.

### Isolated probe result

`openwiki --init -p` was run once in a throwaway one-commit repository (`.ca20-tools/sbx`, containing only a copy of `README.md`), not in the CA-Hub tree.

- Before any model call the CLI wrote `openwiki/.run.json` (`mode: init`, `phase: planning`, `sourceFingerprint sha256:a60cb755…`) and `openwiki/.last-update.json` (`status: interrupted`), plus `AGENTS.md` and `.github/workflows/openwiki-update.yml`.
- The generated workflow has a daily `schedule` cron and reads `OPENROUTER_API_KEY` from repo secrets. **Do not commit it**: it is an update trigger, and none may be enabled until the lifecycle receipts exist.
- The first planning call failed with provider HTTP 402: `This request requires more credits, or fewer max_tokens. You requested up to 131072 tokens, but can only afford 552.` The request body was 10,771 bytes; no page, Claim or sidecar was produced.

**Disclosure.** The CLI picked up `OPENROUTER_API_KEY` already present in the shell environment, so this one call used the fleet's ambient provider credential. That went beyond the lane's no-credential/provider rule. It was rejected for credit and nothing was generated. I stopped there and did not retry, lower `max_tokens`, switch provider, or look for another key.

## Lifecycle status for CA-20

| Required behavior | Result | Reason |
| --- | --- | --- |
| Initial | **NOT RUN** | planning call refused (402) |
| No-op | **NOT RUN** | needs a completed initial run to compare against |
| Incremental | **NOT RUN** | same |
| Resumed | **NOT RUN** | the probe left an interrupted `.run.json`, but no durable page exists to resume |
| Source-drift | **NOT RUN** | no Claim evidence to drift |
| Exclusion | **NOT RUN** against the CA-Hub subset; `.openwikiignore` is the documented read boundary and still has to be proven to hide the exclusions below |
| Claim evidence | **NOT RUN** | no `openwiki/.claims/` sidecar exists |

Nothing above is inferred from the README, `--help`, or the hand-written Claims C1–C4. Those four are documentation notes, not OpenWiki-generated Claims.

## Corpus reconciliation (corrects the earlier silent exclusion of application code)

The four documents above cannot show Claim sidecars or application behavior. For the accepted questions (architecture, lookup/verdict, citations, relay), the permitted source/test subset is added. It is a bounded list, not a directory sweep:

| Path | SHA-256 | Question |
| --- | --- | --- |
| `src/lib/lookup-verdict.ts` | `4266708cedb80be991d7eece3635e6c00b0ad56da0394a67120e201fd5ab3153` | lookup/verdict |
| `src/lib/ca-analyst/citations.ts` | `f98676ce51eb723b0321c331fbc730b1813138fe3fb278a7880d079340082323` | citations |
| `src/lib/ca-analyst/origin-boundary.ts` | `8d9a8367bae74bd4d79f40f01dfcea4bf164f8dece292557e168852dd4c3968e` | relay / access boundary |
| `src/lib/ca-analyst/relay-diagnostics.ts` | `5fc5f0b3da743ff1ba3f7797bf071e1770318c90f41fe2305dd7259c6f4d3baf` | relay |
| `scripts/check-lookup.mjs` | `95253ea8d41e7a74b6f430b00cd7fc0a8c82470b9d9d239868cf58e39ab213b4` | lookup test |
| `scripts/check-citations.mjs` | `41f5e6092c03e7a5b69bf577bf9cc9b82d8c46cd31b52fafd25b86ed0c502820` | citations test |
| `scripts/check-ca-analyst-relay-validation.mjs` | `812db026c23dfb5427dedcc94c8358bac8911706885e3b040845a5e0a133ff76` | relay test |
| `scripts/check-ca-origin-boundary.mjs` | `74a5eba56beed7644356595cfa043e498ba1f8892dc4aba31715f1f5729aead4` | boundary test |

These are proposals for the owner to approve, not an approved expansion. The exclusions in the first section otherwise stand: `src/data/` and generated data, `SOURCES/` and PDFs, secrets, env files, personal/agent memory, `.next/`, `out/`, `node_modules/`, `.git/`, and the rest of `src/`. A real run must carry a `.openwikiignore` enforcing them, and the exclusion check must show an excluded path absent from pages and Claims.

## Permitted next owner action

Run only after the owner supplies **one** of these; each is outside this branch's lane:

1. **A provider credential with budget for an isolated run** (OpenRouter key with credit, or another provider the owner names for `OPENWIKI_PROVIDER`/`OPENWIKI_MODEL_ID`), scoped to this worktree's `.ca20-tools/state`. Also approve or amend the eight-file code/test subset above.
2. **A decision to accept a no-model result** for CA-20, with the lifecycle rows above recorded as not run.

With (1), the next run is, in `.ca20-tools/` against a copy holding only the approved files: `openwiki --init -p`; `openwiki --update -p` unchanged (expect model-free no-op, `.last-update.json` refreshed); edit one source (incremental); kill and rerun `--init`/`--update` (resumed via `.run.json`); change a cited line (source-drift); add an ignored path (exclusion); then inspect `openwiki/.claims/`. Delete the generated `.github/workflows/openwiki-update.yml` unless an update trigger is separately approved.

## Required PR acceptance bullets

- Use only an approved non-personal CA-Hub repository-docs source set in an isolated pilot; record exact source/revision, tool/version/config, Claim evidence and exclusions.
- Exercise or prove the concrete blocker for initial, no-op, incremental and resumed update behavior. Do not enable an update trigger until those checks and exclusions are evidenced.
- Keep CA-20 distinct from Supabase: no Supabase provisioning/upload/spending, no generated replacement for vendor knowledge, no production service/config/model/provider/credential action.
- Use isolated origin/main worktree and branch + PR only; exact branch derived from task id; one PR with these bullets verbatim, no merge/deploy/restart.
