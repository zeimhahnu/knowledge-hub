#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("src/data/rules.json", "utf8"));
const threeD = data.rules.filter((r) => r.index_type === "market-cap-weighted");
assert.ok(threeD.length >= 3, "current 3-D branches must include the prior FTSE fixture and VettaFi weighting branches");
const ftse = threeD.find((r) => r.vendor === "ftse" && r.event_type === "stock-split");
assert.ok(ftse); assert.equal(ftse.coverage, "product-specific"); assert.ok(ftse.source_urls.length);
assert.equal(data.rules.some((r) => r.vendor === "vettafi"), true, "VettaFi is published in the behavioral corpus");
assert.equal(data.rules.some((r) => r.vendor === "vettafi" && r.event_type === "special-dividend" && r.index_type === "non-market-cap-weighted"), true, "VettaFi non-market-cap branch is represented");
assert.equal(data.rules.some((r) => r.vendor === "solactive" && ["market-cap-weighted", "non-market-cap-weighted"].includes(r.index_type)), false, "Solactive framework rows do not claim a weighting branch");
const source = fs.readFileSync("src/lib/fund-master.ts", "utf8");
assert.equal(/fetch\s*\(/.test(source), false, "fund resolver has no network path");
const appFiles = ["src/lib/lookup-verdict.ts", "src/components/lookup/lookup-view.tsx"];
for (const file of appFiles) assert.equal(fs.readFileSync(file, "utf8").includes("franklintempleton.com"), false, `${file} must not embed acquisition URLs`);
console.log("check-3d-rules: PASS (3-D precedence fixture, P0 fallback path, VettaFi/Solactive guard, no runtime fetch)");
