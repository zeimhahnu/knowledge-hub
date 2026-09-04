import { promises as fs } from "fs";
import path from "path";

import { SurfaceSection } from "@/components/surface-section";
import { RouteShell } from "@/components/route-shell";

export default async function EventExtractionPage() {
  const filePath = path.join(
    process.cwd(),
    "src/app/vendors/event-extraction.md"
  );
  const raw = await fs.readFile(filePath, "utf-8");
  const content = raw.replace(/^---[\s\S]*?---\n/, "");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <RouteShell className="py-8">
        <SurfaceSection padding="tight">
        <div
          className="prose prose-invert max-w-none"
          style={{
            color: "oklch(0.93 0.01 260)",
            lineHeight: "1.75",
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
        </SurfaceSection>
        </RouteShell>
      </main>
    </div>
  );
}

function renderMarkdown(md: string): string {
  let html = md;

  // Headers
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:1.5rem;font-weight:800;margin:0 0 1.5rem;color:oklch(0.93 0.01 260);border-bottom:1px solid oklch(0.25 0.015 260);padding-bottom:0.75rem;">$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.2rem;font-weight:700;margin:2rem 0 0.75rem;color:oklch(0.93 0.01 260);">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:1rem;font-weight:600;margin:1.5rem 0 0.5rem;color:oklch(0.72 0.19 250);">$1</h3>');
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size:0.9rem;font-weight:600;margin:1rem 0 0.25rem;color:oklch(0.93 0.01 260);">$1</h4>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:oklch(0.2 0.015 260);padding:0.125rem 0.375rem;border-radius:0.25rem;font-size:0.85em;font-family:monospace;">$1</code>');

  // Bullet lists
  html = html.replace(/^- (.+)$/gm, "<li style='margin-bottom:0.25rem;'>$1</li>");
  html = html.replace(/(<li[^>]*>.*<\/li>)+/g, (match) => `<ul style='margin:0.5rem 0 1rem 1.5rem;padding:0;list-style:disc;'>${match}</ul>`);

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li style='margin-bottom:0.25rem;'>$1</li>");
  html = html.replace(/(<li[^>]*>.*<\/li>)+/g, (match) => `<ol style='margin:0.5rem 0 1rem 1.5rem;padding:0;list-style:decimal;'>${match}</ol>`);

  // Tables — parse each markdown table
  const tableBlockRegex = /^(\|.+\|\n)+(---.*)?\n((?:\|.+\|\n?)+)/gm;
  html = html.replace(tableBlockRegex, (match) => {
    const rows = match.trim().split("\n").filter(r => r.startsWith("|") && !r.match(/^\|[-: ]+\|$/));
    if (rows.length === 0) return match;
    const headerCells = rows[0].slice(1, -1).split("|").map(c => c.trim());
    const bodyRows = rows.slice(1);
    let table = `<table style="width:100%;border-collapse:collapse;font-size:0.8rem;margin-bottom:1.5rem;overflow-x:auto;display:block;">`;
    table += `<thead><tr style="background:oklch(0.2 0.015 260);">`;
    table += headerCells.map((c) => `<th style="padding:0.5rem 0.75rem;text-align:left;font-weight:600;color:oklch(0.72 0.19 250);border-bottom:1px solid oklch(0.25 0.015 260);white-space:nowrap;">${inline(c)}</th>`).join("");
    table += `</tr></thead><tbody>`;
    bodyRows.forEach(row => {
      const cells = row.slice(1, -1).split("|").map(c => c.trim());
      table += `<tr style="border-bottom:1px solid oklch(0.2 0.015 260);">`;
      table += cells.map((c) => `<td style="padding:0.4rem 0.75rem;vertical-align:top;color:oklch(0.75 0.01 260);white-space:nowrap;">${inline(c)}</td>`).join("");
      table += `</tr>`;
    });
    table += `</tbody></table>`;
    return table;
  });

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, "</p><p style='margin-bottom:0.75rem;'>");

  return `<div style="font-size:0.9rem;">${html}</div>`;
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code style='background:oklch(0.2 0.015 260);padding:0.125rem 0.375rem;border-radius:0.25rem;font-size:0.85em;font-family:monospace;'>$1</code>");
}
