#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("src/data/rules.json", "utf8"));
const threeD = data.rules.filter((r) => r.index_type === "market-cap-weighted");
assert.equal(threeD.length, 1, "one reviewed 3-D fixture is expected");
assert.equal(threeD[0].vendor, "ftse"); assert.equal(threeD[0].event_type, "stock-split");
assert.equal(threeD[0].coverage, "product-specific"); assert.ok(threeD[0].source_urls.length);
assert.equal(data.rules.some((r) => /vettafi/i.test(r.vendor)), false, "VettaFi excluded");
assert.equal(data.rules.some((r) => r.vendor === "solactive" && r.index_type !== "*"), false, "Solactive is not universalized");
const source = fs.readFileSync("src/lib/fund-master.ts", "utf8");
assert.equal(/fetch\s*\(/.test(source), false, "fund resolver has no network path");
const appFiles = ["src/lib/lookup-verdict.ts", "src/components/lookup/lookup-view.tsx"];
for (const file of appFiles) assert.equal(fs.readFileSync(file, "utf8").includes("franklintempleton.com"), false, `${file} must not embed acquisition URLs`);
console.log("check-3d-rules: PASS (3-D precedence fixture, P0 fallback path, VettaFi/Solactive guard, no runtime fetch)");
