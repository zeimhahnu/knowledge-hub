import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const pages = [
  "src/app/page.tsx",
  "src/app/guide/page.tsx",
  "src/app/lookup/[ticker]/page.tsx",
  "src/app/settings/page.tsx",
  "src/app/upload/page.tsx",
  "src/app/vendors/page.tsx",
  "src/app/vendors/event-extraction/page.tsx",
  "src/app/vendors/iso-taxonomy/page.tsx",
  "src/app/review/page.tsx",
];
const problems = [];

for (const relative of pages) {
  const file = fs.readFileSync(path.join(root, relative), "utf8");
  if (!file.includes("@/components/ui/band")) problems.push(`${relative}: missing shared Band import`);
  if (!file.includes("@/components/ui/surface")) problems.push(`${relative}: missing shared Surface import`);
  if (/rounded-(?:2xl|xl|\[2rem\])\s+border\s+border-border\s+bg-card/.test(file)) {
    problems.push(`${relative}: hand-rolled card detected; use Surface`);
  }
  if (/uppercase tracking-\[|text-sm font-semibold uppercase/.test(file)) {
    problems.push(`${relative}: hand-rolled eyebrow detected; use Eyebrow`);
  }
  if (/<h1[^>]*className="[^"]*(?:text-3xl|text-4xl)[^"]*font-(?:bold|semibold)/.test(file)) {
    problems.push(`${relative}: hand-rolled display heading detected; use SectionHeader`);
  }
}

assert.equal(problems.length, 0, problems.join("\n"));
console.log(`check-design-system: PASS (${pages.length} pages use shared bands, surfaces, and heading grammar)`);
