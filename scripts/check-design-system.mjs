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

const headingSizes = new Map([
  ["ca-display-title", "40px"],
  ["ca-section-title", "22px"],
  ["text-2xl", "24px"],
  ["text-xl", "20px"],
  ["text-lg", "18px"],
]);

function resolvedHeadingSize(className) {
  return className.split(/\s+/).map((token) => headingSizes.get(token)).find(Boolean) ?? null;
}

function headingsIn(file) {
  const headings = [];
  for (const match of file.matchAll(/<SectionHeader\b([\s\S]*?)(?:\/>)|<SectionHeader\b([\s\S]*?)>/g)) {
    const props = match[1] ?? match[2] ?? "";
    const tag = props.match(/\btitleAs="(h[123])"/)?.[1] ?? "h1";
    headings.push({ tag, size: tag === "h1" ? "40px" : "22px" });
  }
  for (const match of file.matchAll(/<(h[12])\b[^>]*className="([^"]*)"/g)) {
    headings.push({ tag: match[1], size: resolvedHeadingSize(match[2]) });
  }
  return headings;
}

function assertPaletteChipClasses(source, relative) {
  const chipSources = [
    ...source.matchAll(/(?:chip|cls):\s*"([^"]+)"/g),
    ...source.matchAll(/className="([^"]*rounded-(?:full|\[4px\])[^"]*)"/g),
  ].map((match) => match[1]);
  const forbidden = /(?:bg|text|border)-\[(?:#|rgb|hsl|oklch)|(?:bg|text|border)-(?:amber|teal|cyan|orange|red|green|blue|purple|pink|indigo|emerald)-\d/;
  for (const className of chipSources) {
    if (forbidden.test(className)) problems.push(`${relative}: rendered chip uses a colour outside the palette (${className})`);
  }
}

for (const relative of pages) {
  const file = fs.readFileSync(path.join(root, relative), "utf8");
  if (!file.includes("@/components/ui/band") && !file.includes('<Band')) problems.push(`${relative}: missing shared Band import`);
  if (!file.includes("@/components/ui/surface") && !file.includes("<Surface")) problems.push(`${relative}: missing shared Surface import`);
  if (!file.includes('tone="dark"')) problems.push(`${relative}: missing dark opening band`);
  if (!file.includes('tone="light"')) problems.push(`${relative}: missing light work band`);
  if (/<Band\b[^>]*className="[^"]*\b!?py-/.test(file)) problems.push(`${relative}: band overrides the shared 80px rhythm`);
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

  const headings = headingsIn(file);
  for (const h1 of headings.filter((heading) => heading.tag === "h1")) {
    for (const h2 of headings.filter((heading) => heading.tag === "h2")) {
      if (h1.size === null || h2.size === null) {
        problems.push(`${relative}: h1/h2 heading size is not part of the type ramp`);
      } else if (h1.size === h2.size) {
        problems.push(`${relative}: h1 and h2 resolve to the same font-size (${h1.size})`);
      }
    }
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

  assertPaletteChipClasses(file, relative);
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
if (!/\.ca-display-title\s*\{[^}]*font-size:\s*40px;[^}]*font-weight:\s*500;[^}]*letter-spacing:\s*-0\.8px;[^}]*line-height:\s*48px;/.test(css)) {
  problems.push("globals.css: display type ramp is not 40px/48px/500/-0.8px");
}
if (!/\.ca-section-title\s*\{[^}]*font-size:\s*22px;[^}]*font-weight:\s*500;[^}]*letter-spacing:\s*-0\.22px;[^}]*line-height:\s*25\.3px;/.test(css)) {
  problems.push("globals.css: section type ramp is not 22px/25.3px/500/-0.22px");
}

const lookup = fs.readFileSync(path.join(root, "src/components/lookup/lookup-view.tsx"), "utf8");
if (/<span[^>]*className="[^"]*(?:chart-3|chart-4|destructive)[^"]*"[^>]*>\s*\{totals\.dataStatesTreatment\} states a treatment/s.test(lookup)) {
  problems.push("lookup-view.tsx: states-a-treatment chip uses a semantic accent colour");
}
if (/<span[^>]*className="[^"]*(?:chart-3|chart-4|destructive)[^"]*"[^>]*>\s*\{totals\.dataSilent\} silent/s.test(lookup)) {
  problems.push("lookup-view.tsx: silent chip uses a semantic accent colour");
}
if (/rounded-full[^"\n]*(?:text|bg|border)-(?:amber|teal|cyan|orange|red|green|blue|purple|pink)-\d/.test(lookup)) {
  problems.push("lookup-view.tsx: rendered chip uses a raw hue instead of a palette token");
}
if (/Finding so far|TOTAL_CHIPS|dataStatesTreatment|dataSilent/.test(lookup)) {
  problems.push("lookup-view.tsx: redundant finding summary or chip row still rendered");
}
if (!/This is not a final verdict while/.test(lookup)) {
  problems.push("lookup-view.tsx: incomplete-verdict notice is not next to investigation progress");
}

assert.equal(problems.length, 0, problems.join("\n"));
console.log(`check-design-system: PASS (${pages.length} core pages have dark/light bands, together palette, and type-ramp headlines)`);
