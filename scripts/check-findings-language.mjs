import rules from "../src/data/rules.json" with { type: "json" };
import { buildProposedRules } from "../src/lib/ingest.ts";
import { leadFindingForRule, normalizeTreatmentText } from "../src/lib/finding-language.ts";

const extracted = buildProposedRules(
  "fixture-vendor",
  "2. Cash Dividend\nAn ordinary cash dividend receives no price adjustment.\n\n3. Special Cash Dividend\nA special dividend receives a PAF.",
  "fixture.pdf",
);
const extractedCash = extracted.find((rule) => rule.event_type === "cash-dividend");
if (extractedCash?.treatment !== "An ordinary cash dividend receives no price adjustment.") {
  console.error("extraction artefacts were not stripped from proposed treatment");
  process.exit(1);
}
if (normalizeTreatmentText("2. Cash Dividend An ordinary cash dividend receives no price adjustment.", "cash-dividend").startsWith("2.")) {
  console.error("read normalisation left a leading section number");
  process.exit(1);
}

const failures = [];
const curatedEventTypes = new Set(rules.rules.map((rule) => rule.event_type));

for (const eventType of curatedEventTypes) {
  const rows = rules.rules.filter((rule) => rule.event_type === eventType);
  for (const rule of rows) {
    const finding = leadFindingForRule({
      eventType: rule.event_type,
      indexType: rule.index_type,
      conditions: rule.conditions,
      confidence: rule.confidence,
      treatment: rule.treatment,
    });
    if (!finding.leadAnswer.trim()) failures.push(`${rule.vendor}/${eventType}: empty lead answer`);
    if (finding.leadAnswer.length > 140) failures.push(`${rule.vendor}/${eventType}: lead answer is ${finding.leadAnswer.length} chars`);
    if (/^\s*\d+(?:\.\d+)*[.)]?\s/.test(finding.leadAnswer)) failures.push(`${rule.vendor}/${eventType}: lead answer starts with a section number`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`OK — ${curatedEventTypes.size} curated event types checked`);
