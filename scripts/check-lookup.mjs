#!/usr/bin/env node
import assert from "node:assert/strict";
import { caevForEventType, daysOut, computeLookupVerdict, deriveVendorGroups, getScopeVendors, setScopeVendors } from "../src/lib/lookup-verdict.ts";
import { setVendorDefault } from "../src/lib/coverage-settings.ts";
const storage = (() => { const m=new Map(); return { getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k) }; })();
const today=new Date("2026-09-01T12:00:00Z");
assert.equal(caevForEventType("cash-dividend"), "DVOP");
assert.equal(daysOut(new Date("2026-09-03"), today), 2);
setScopeVendors(["msci"], storage);
assert.equal(getScopeVendors(storage).length, 7, "legacy scope cannot hide vendors");
setVendorDefault("ftse", 5, storage);
const checkedAbsent={state:"absent", checkedAt:today.toISOString()};
const verdict=ex=>computeLookupVerdict({ticker:"ABC",eventType:"cash-dividend",exDate:new Date(ex),today,storage,getConfirmation:v=>v==="ftse"?checkedAbsent:null,isPresentAtVendor:()=>false});
const early=deriveVendorGroups(verdict("2026-09-10"));
assert.deepEqual(early.expectedAbsent, []);
assert.equal(early.notYetDue.some(r=>r.vendor==="ftse"), true);
const boundary=deriveVendorGroups(verdict("2026-09-06"));
assert.deepEqual(boundary.expectedAbsent.map(r=>r.vendor), ["ftse"]);
console.log("OK — lookup primitives, legacy scope ignore, two groups, and horizon boundary pass");
