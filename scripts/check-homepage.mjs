import assert from "node:assert/strict";
import { buildLookupUrl } from "../src/lib/lookup-url.ts";

assert.equal(
  buildLookupUrl("brk.b", "cash-dividend", "2026-09-30"),
  "/lookup/BRK.B?eventType=cash-dividend&exDate=2026-09-30",
);
assert.equal(
  buildLookupUrl("^gspc", "stock-split", "2026-10-01"),
  "/lookup/%5EGSPC?eventType=stock-split&exDate=2026-10-01",
);
assert.equal(
  buildLookupUrl("tsco.l", "share-buyback", "2026-10-01", " Tesco PLC "),
  "/lookup/TSCO.L?eventType=share-buyback&exDate=2026-10-01&company=Tesco%20PLC",
  "a picked company name travels in the URL so the lookup header can show it",
);
assert.equal(buildLookupUrl("", "cash-dividend", "2026-09-30"), null);
assert.equal(buildLookupUrl("AAPL", "", "2026-09-30"), null);
assert.equal(buildLookupUrl("AAPL", "cash-dividend", "2026-2-30"), null);
assert.equal(buildLookupUrl("AAPL", "cash-dividend", "2026-02-30"), null);

console.log("OK");
