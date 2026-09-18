import { promises as fs } from "fs";
import path from "path";

import { RouteShell } from "@/components/route-shell";
import { Band } from "@/components/ui/band";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { VendorReferenceNav } from "@/components/vendor-reference-nav";

export default async function EventExtractionPage() {
  const filePath = path.join(
    process.cwd(),
    "src/app/vendors/event-extraction.md"
  );
  const raw = await fs.readFile(filePath, "utf-8");
  const content = raw.replace(/^---[\s\S]*?---\n/, "");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* This page shipped with no nav at all, so reaching it was a dead end. */}
      <Band tone="dark">
        <RouteShell wide className="space-y-8">
          <SectionHeader
            eyebrow="Vendor reference"
            title="Event parameters"
            description="The fields each vendor publishes per event type, and what the lookup reads from them."
          />
          <VendorReferenceNav current="parameters" />
        </RouteShell>
      </Band>

      <Band tone="light" className="min-h-screen">
      <main>
        <RouteShell>
        <Surface as="article" className="p-5 sm:p-8">
        <div
          className="prose max-w-none"
          style={{ color: "var(--body-copy)", lineHeight: "1.75" }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
        </Surface>
        </RouteShell>
      </main>
      </Band>
    </div>
  );
}

function renderMarkdown(md: string): string {
  let html = md;

  // Headers
  html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:1.5rem;font-weight:800;margin:0 0 1.5rem;color:var(--foreground);border-bottom:1px solid var(--border);padding-bottom:0.75rem;">$1</h2>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="font-size:1.2rem;font-weight:700;margin:2rem 0 0.75rem;color:var(--foreground);">$1</h3>');
  html = html.replace(/^### (.+)$/gm, '<h4 style="font-size:1rem;font-weight:600;margin:1.5rem 0 0.5rem;color:var(--primary);">$1</h4>');
  html = html.replace(/^#### (.+)$/gm, '<h5 style="font-size:0.9rem;font-weight:600;margin:1rem 0 0.25rem;color:var(--foreground);">$1</h5>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--muted);padding:0.125rem 0.375rem;border-radius:0.25rem;font-size:0.85em;font-family:monospace;">$1</code>');

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
    table += `<thead><tr style="background:var(--muted);">`;
    table += headerCells.map((c) => `<th style="padding:0.5rem 0.75rem;text-align:left;font-weight:600;color:var(--primary);border-bottom:1px solid var(--border);white-space:nowrap;">${inline(c)}</th>`).join("");
    table += `</tr></thead><tbody>`;
    bodyRows.forEach(row => {
      const cells = row.slice(1, -1).split("|").map(c => c.trim());
      table += `<tr style="border-bottom:1px solid var(--border);">`;
      table += cells.map((c) => `<td style="padding:0.4rem 0.75rem;vertical-align:top;color:var(--muted-foreground);white-space:nowrap;">${inline(c)}</td>`).join("");
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
    .replace(/`([^`]+)`/g, "<code style='background:var(--muted);padding:0.125rem 0.375rem;border-radius:0.25rem;font-size:0.85em;font-family:monospace;'>$1</code>");
}
