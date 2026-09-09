import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const pages = [
  "src/app/page.tsx",
  "src/app/guide/page.tsx",
  "src/components/lookup/lookup-view.tsx",
  "src/app/settings/page.tsx",
  "src/app/upload/page.tsx",
  "src/app/review/page.tsx",
  "src/app/vendors/page.tsx",
  "src/app/vendors/iso-taxonomy/page.tsx",
];
const problems = [];

for (const relative of pages) {
  const file = fs.readFileSync(path.join(root, relative), "utf8");
  if (!file.includes("@/components/ui/band") && !file.includes('<Band')) problems.push(`${relative}: missing shared Band import`);
  if (!file.includes("@/components/ui/surface") && !file.includes("<Surface")) problems.push(`${relative}: missing shared Surface import`);
  if (!file.includes('tone="dark"')) problems.push(`${relative}: missing dark opening band`);
  if (!file.includes('tone="light"')) problems.push(`${relative}: missing light work band`);
  if (/rounded-(?:2xl|xl|\[2rem\])\s+border\s+border-border\s+bg-card/.test(file)) {
    problems.push(`${relative}: hand-rolled card detected; use Surface`);
  }
  if (/<(?:p|span)[^>]*className="[^"]*(?:uppercase tracking-\[|text-sm font-semibold uppercase)/.test(file) && !file.includes("ca-eyebrow")) {
    problems.push(`${relative}: hand-rolled eyebrow detected; use Eyebrow`);
  }
  if (/<h1[^>]*className="(?![^"]*ca-display-title)[^"]*(?:text-3xl|text-4xl|font-(?:bold|semibold|700|800))/.test(file)) {
    problems.push(`${relative}: hand-rolled headline detected; use the type ramp`);
  }
  if (/oklch\([^)]*(?:250|260)/.test(file) || /bg-\[[^\]]*oklch/.test(file)) {
    problems.push(`${relative}: raw oklch blue token used in a page or CTA`);
  }

  if (relative.startsWith("src/app/vendors/")) {
    if (/\b(?:blue|green|amber|yellow|emerald|teal|cyan|indigo|purple|pink|orange|red)-\d/.test(file)) {
      problems.push(`${relative}: legacy hue-specific accent class detected; use system tokens`);
    }
    if (/\b(?:bg|text|border)-(?:blue|green|amber|yellow|emerald|teal|cyan|indigo|purple|pink|orange|red)-/.test(file)) {
      problems.push(`${relative}: hand-rolled hue accent detected; map meaning to system accent or surface`);
    }
    if (/min-w-\[|overflow-x-auto/.test(file)) {
      problems.push(`${relative}: horizontal overflow escape hatch detected; use responsive table/card grammar`);
    }
  }
}

const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
const expectedPalette = [
  "--background: #010120",
  "--card: #313641",
  "--border: #313641",
  "--primary: #ffffff",
  "--background: #ffffff",
  "--foreground: #000000",
  "--border: #e4e4e4",
  "--primary: #000000",
  "#fc4c02",
  "#ef2cc1",
  "#bdbbff",
  "#c8f6f9",
];
for (const token of expectedPalette) {
  if (!css.includes(token)) problems.push(`globals.css: missing together palette token ${token}`);
}
if (/--primary:\s*oklch\(/.test(css)) problems.push("globals.css: CTA primary still uses an oklch token");

assert.equal(problems.length, 0, problems.join("\n"));
console.log(`check-design-system: PASS (${pages.length} core pages have dark/light bands, together palette, and type-ramp headlines)`);
