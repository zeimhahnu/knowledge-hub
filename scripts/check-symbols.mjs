import assert from "node:assert/strict";
import { mapYahooSuggestions, validateSymbolQuery } from "../src/lib/symbol-search.ts";

const fixture = {
  quotes: [
    { symbol: "TSCO.L", shortname: "Tesco PLC", longname: "Tesco PLC", exchDisp: "London" },
    { symbol: "7203.T", longname: "Toyota Motor Corporation", exchDisp: "Tokyo", typeDisp: "Equity" },
    { symbol: "1155.KL", exchDisp: "Kuala Lumpur" },
  ],
};
const suggestions = mapYahooSuggestions(fixture);
assert.deepEqual(suggestions[0], { symbol: "TSCO.L", name: "Tesco PLC", exchange: "London", type: "Unknown type" });
assert.deepEqual(suggestions[1], { symbol: "7203.T", name: "Toyota Motor Corporation", exchange: "Tokyo", type: "Equity" });
assert.deepEqual(suggestions[2], { symbol: "1155.KL", name: "1155.KL", exchange: "Kuala Lumpur", type: "Unknown type" });
assert.deepEqual(mapYahooSuggestions({ quotes: [] }), []);
assert.equal(validateSymbolQuery("x".repeat(41)), null);
console.log("OK");
