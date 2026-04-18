import { promises as fs } from "fs";
import path from "path";

export default async function EventExtractionPage() {
  const filePath = path.join(
    process.cwd(),
    "src/app/vendors/event-extraction.md"
  );
  const raw = await fs.readFile(filePath, "utf-8");
  const content = raw.replace(/^---[\s\S]*?---\n/, "");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <a
              href="/vendors/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Index Vendor Intelligence</span>
              <span className="sm:hidden">Back</span>
            </a>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileTextIcon className="h-3.5 w-3.5 text-primary" />
              <span>Event Parameters</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <div
          className="prose prose-invert max-w-none"
          style={{
            color: "oklch(0.93 0.01 260)",
            lineHeight: "1.75",
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      </main>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
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
