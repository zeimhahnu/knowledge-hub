import { promises as fs } from "fs";
import path from "path";

export default async function IsoTaxonomyPage() {
  const filePath = path.join(
    process.cwd(),
    "src/app/vendors/iso-taxonomy.md"
  );
  const raw = await fs.readFile(filePath, "utf-8");

  // Strip frontmatter
  const content = raw.replace(/^---[\s\S]*?---\n/, "");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
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
              <NetworkIcon className="h-3.5 w-3.5 text-primary" />
              <span>ISO CAEV Taxonomy</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
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

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v4m-4.5 7.5 4.5-4.5m5 4.5-4.5-4.5" />
    </svg>
  );
}

function renderMarkdown(md: string): string {
  let html = md;

  // Tables
  html = html.replace(/^\|(.+)\|$/gm, (line) => {
    const cells = line.slice(1, -1).split("|").map((c: string) => c.trim());
    return `<tr>${cells.map((c: string) => `<td style="padding:0.5rem 1rem;border:1px solid oklch(0.25 0.015 260);">${inline(c)}</td>`).join("")}</tr>`;
  });
  html = html.replace(/(<tr>.*<\/tr>)+/g, (match) => `<table style="width:100%;border-collapse:collapse;margin-bottom:1rem;">${match}</table>`);

  // Headers
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.25rem;font-weight:700;margin:2rem 0 1rem;color:oklch(0.93 0.01 260);">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:1.1rem;font-weight:600;margin:1.5rem 0 0.75rem;color:oklch(0.93 0.01 260);">$1</h3>');
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size:1rem;font-weight:600;margin:1.25rem 0 0.5rem;color:oklch(0.93 0.01 260);">$1</h4>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:oklch(0.2 0.015 260);padding:0.125rem 0.375rem;border-radius:0.25rem;font-size:0.85em;font-family:monospace;">$1</code>');

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, "</p><p style='margin-bottom:1rem;'>");

  return `<p style='margin-bottom:1rem;'>${html}</p>`;
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code style='background:oklch(0.2 0.015 260);padding:0.125rem 0.375rem;border-radius:0.25rem;font-size:0.85em;font-family:monospace;'>$1</code>");
}
