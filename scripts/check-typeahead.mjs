import assert from "node:assert/strict";

const { shouldSuppressSearch } = await import("../src/components/home/symbol-typeahead-state.ts");

function settleSearch(value, lastSelectedSymbol) {
  let isOpen = false;
  if (!shouldSuppressSearch(value, lastSelectedSymbol)) isOpen = true;
  return isOpen;
}

// Model the selection callback followed by the value effect settling 250ms later.
assert.equal(settleSearch("AAPL", "AAPL"), false, "select-then-settle must leave the suggestions list closed");
// A real keystroke clears the ref in the component, so a new query searches normally.
assert.equal(settleSearch("AAP", null), true, "typing after a selection must reopen suggestions");
console.log("check-typeahead: selection stays closed after settle; new input reopens suggestions");
