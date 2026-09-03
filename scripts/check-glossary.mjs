import { readFileSync } from "node:fs";

const glossary = JSON.parse(readFileSync(new URL("../src/data/glossary.json", import.meta.url)));
const rules = JSON.parse(readFileSync(new URL("../src/data/rules.json", import.meta.url))).rules;
const required = new Set([
  "paf",
  "terp",
  "nos",
  "fif",
  "dif",
  "price-return-index",
  "total-return-index",
  "net-total-return-index",
  "in-the-money",
  "out-of-the-money",
  "dividend-size-threshold",
]);

const byLabel = new Map();
for (const entry of glossary) {
  for (const label of [entry.term, ...entry.aliases]) byLabel.set(label.toLowerCase(), entry);
}
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matcher = new RegExp(
  `\\b(?:${[...byLabel.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})\\b`,
  "giu",
);
function linkedIds(text) {
  const ids = [];
  const seen = new Set();
  for (const match of text.matchAll(matcher)) {
    const entry = byLabel.get(match[0].toLowerCase());
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      ids.push(entry.id);
    }
  }
  return ids;
}

for (const id of required) {
  const entry = glossary.find((candidate) => candidate.id === id);
  if (!entry || !entry.short || !entry.long) throw new Error(`Missing glossary content: ${id}`);
}
const realTreatment = rules.find((rule) => rule.treatment?.includes("PAF"))?.treatment;
if (!realTreatment || !linkedIds(realTreatment).includes("paf")) {
  throw new Error("PAF was not found in a real rules.json treatment");
}
if (linkedIds("PAFormula is not PAFish") .includes("paf")) {
  throw new Error("PAF substring false positive");
}
if (linkedIds("PAF appears twice: PAF") .filter((id) => id === "paf").length !== 1) {
  throw new Error("Repeated PAF was linked more than once");
}

console.log("OK");
