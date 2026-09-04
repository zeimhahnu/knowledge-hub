#!/usr/bin/env node
import assert from "node:assert/strict";
import { deriveVendorGroups, computeLookupVerdict } from "../src/lib/lookup-verdict.ts";
import { setVendorDefault } from "../src/lib/coverage-settings.ts";
const store = (() => { const m = new Map(); return { getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k) }; })();
const today = new Date("2026-09-01T12:00:00Z");
const mark = state => ({ state, checkedAt: today.toISOString() });
const lookup = exDate => computeLookupVerdict({ ticker:"ABC", eventType:"cash-dividend", exDate:new Date(exDate), today, storage:store, getConfirmation:v=>v === "ftse" ? mark("absent") : null, isPresentAtVendor:()=>false });
setVendorDefault("ftse", 5, store);
const early = deriveVendorGroups(lookup("2026-09-10"));
assert.deepEqual(early.expectedAbsent, []);
assert.equal(early.notYetDue.some(r=>r.vendor === "ftse"), true);
assert.equal(early.totals?.missing, undefined);
const boundary = deriveVendorGroups(lookup("2026-09-06"));
assert.deepEqual(boundary.expectedAbsent.map(r=>r.vendor), ["ftse"]);
assert.equal(boundary.expectedAbsent[0]?.leadDays, 5);
assert.deepEqual(boundary.supplied, []);
assert.deepEqual(boundary.unchecked.length + boundary.timingUnassessed.length + boundary.notApplicable.length, 6);
console.log("OK — two-group derivation, horizon boundary, and auxiliary states pass");
