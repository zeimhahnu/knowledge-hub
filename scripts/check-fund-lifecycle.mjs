#!/usr/bin/env node
/**
 * A closed fund must never be offered as though it were current.
 *
 * FLRU (Franklin FTSE Russia) sits in the catalog under `/products/`, was
 * enriched like any other fund, and resolved to full 3-D rules -- so the fund
 * picker offered it exactly like a live product. Franklin's own SAI says it was
 * delisted from NYSE Arca on 2022-12-27 and is liquidating.
 *
 * Sitemap placement is not a liveness signal, and this is the guard that says so.
 * A closed fund still RESOLVES on purpose: its index rules were correct while it
 * traded, and a practitioner may be investigating a historical event. What must
 * not happen is resolving silently.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { franklinSnapshot, resolveFundRules } from "../src/lib/fund-master.ts";

const rules = JSON.parse(readFileSync("src/data/rules.json", "utf8"));
const flatRules = [];
(function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (node && typeof node === "object") {
    if (node.event_type && node.vendor) flatRules.push(node);
    return Object.values(node).forEach(walk);
  }
})(rules);

const closed = franklinSnapshot.records.filter((r) => r.lifecycle?.status === "closed");
const live = franklinSnapshot.records.filter((r) => !r.lifecycle);

assert.ok(closed.length > 0, "no closed fund in the snapshot - this guard has nothing to prove");

for (const fund of closed) {
  // The lifecycle claim must carry its evidence. A status with no source is a
  // rumour, and removing a fund from a practitioner's reach on a rumour is worse
  // than leaving it.
  assert.ok(fund.lifecycle.effective && /^\d{4}-\d{2}-\d{2}$/.test(fund.lifecycle.effective),
    `${fund.ticker}: lifecycle needs an effective date`);
  assert.ok(fund.lifecycle.reason && fund.lifecycle.reason.length > 10,
    `${fund.ticker}: lifecycle needs a reason`);
  assert.ok(Array.isArray(fund.lifecycle.source_urls) && fund.lifecycle.source_urls.length > 0,
    `${fund.ticker}: a closure claim must cite a source`);
  for (const url of fund.lifecycle.source_urls) {
    assert.ok(/^https:\/\//.test(url), `${fund.ticker}: lifecycle source must be an https URL`);
  }

  const { resolution } = resolveFundRules(fund.ticker, franklinSnapshot, flatRules);
  assert.equal(resolution.mode, "fund-resolved",
    `${fund.ticker}: a closed fund should still resolve - its rules were valid while it traded`);
  assert.ok(resolution.warnings.length > 0,
    `${fund.ticker} is CLOSED but resolved with no warning - the picker would offer it as current`);
  assert.ok(/closed/i.test(resolution.warnings[0]),
    `${fund.ticker}: the warning must say it is closed, got "${resolution.warnings[0]}"`);
  assert.ok(resolution.warnings[0].includes(fund.lifecycle.effective),
    `${fund.ticker}: the warning must carry the effective date`);
}

// And a live fund must NOT be warned about, or the signal becomes noise.
for (const fund of live.slice(0, 8)) {
  const { resolution } = resolveFundRules(fund.ticker, franklinSnapshot, flatRules);
  if (resolution.mode === "fund-resolved") {
    assert.equal(resolution.warnings.length, 0,
      `${fund.ticker} is live but carries a warning: "${resolution.warnings[0]}"`);
  }
}

console.log(
  `check-fund-lifecycle: ok (${closed.length} closed, ${live.length} live, closed funds resolve WITH a warning)`,
);
