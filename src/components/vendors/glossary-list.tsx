"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import type { GEntry } from "@/lib/glossary";

/**
 * The glossary is reached mid-investigation to settle one word, so finding a
 * term is the whole job.
 *
 * The first version was a 35-card grid: 3,476px of wall, card heights ranging
 * 106-184px, and no way to search. Uniform cards were doing the page's
 * structural work, which is the lazy container - and for reference prose, a card
 * border per term adds 35 rectangles that carry no information.
 *
 * This is a definition list instead: one measured column, hairline rules, and
 * typographic hierarchy doing the separating. Every term is anchorable, because
 * the taxonomy page links the same vocabulary and a definition you can deep-link
 * to is worth more than one you have to scroll for.
 */
export function slugForTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matches(entry: GEntry, needle: string): boolean {
  if (!needle) return true;
  const hay = `${entry.term} ${entry.definition} ${entry.detail ?? ""}`.toLowerCase();
  // Every word must appear somewhere, so "special stoxx" finds the STOXX rule
  // for special dividends without demanding the exact phrase.
  return needle
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

export function GlossaryList({ entries }: { entries: readonly GEntry[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(
    () => entries.filter((entry) => matches(entry, query.trim())),
    [entries, query],
  );

  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-3">
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a term, or search the definitions"
            aria-label="Filter glossary terms"
            aria-describedby="glossary-count"
            className="ca-control ca-search-control py-3 pr-20 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <p id="glossary-count" aria-live="polite" className="text-sm text-muted-foreground">
          {query
            ? // the noun agrees with the TOTAL, not the match count: "1 of 35 terms"
              `${shown.length} of ${entries.length} ${entries.length === 1 ? "term" : "terms"}`
            : `${entries.length} terms, in the order they tend to come up during an investigation.`}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="max-w-2xl text-sm text-muted-foreground">
          Nothing matches <span className="font-medium text-foreground">{query}</span>. The
          glossary covers vendor treatment language, not ticker or event lookups — try the{" "}
          <span className="font-medium text-foreground">Event taxonomy</span> tab for those.
        </p>
      ) : (
        <dl className="max-w-3xl">
          {shown.map((entry, index) => (
            <div
              key={entry.term}
              id={slugForTerm(entry.term)}
              className={`scroll-mt-28 py-6 ${index > 0 ? "border-t border-border" : "pt-0"}`}
            >
              <dt className="text-base font-medium tracking-[-0.01em] text-foreground">
                <a
                  href={`#${slugForTerm(entry.term)}`}
                  className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-border"
                >
                  {entry.term}
                </a>
              </dt>
              <dd className="mt-2 space-y-2">
                <p className="text-[0.95rem] leading-relaxed text-foreground/90">
                  {entry.definition}
                </p>
                {entry.detail && (
                  <p className="text-sm leading-relaxed text-muted-foreground">{entry.detail}</p>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
