import Link from "next/link";

import glossary from "@/data/glossary.json";

type GlossaryEntry = (typeof glossary)[number];

interface Match {
  end: number;
  entry: GlossaryEntry;
  start: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const terms = glossary.flatMap((entry) =>
  [entry.term, ...entry.aliases]
    .filter(Boolean)
    .map((label) => ({ entry, label })),
);

const matcher = new RegExp(
  `\\b(?:${terms
    .map(({ label }) => escapeRegExp(label))
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
  "giu",
);

function firstDistinctMatches(text: string): Match[] {
  const matches: Match[] = [];
  const linkedIds = new Set<string>();

  for (const match of text.matchAll(matcher)) {
    const label = match[0];
    const start = match.index ?? 0;
    const term = terms.find(({ label: candidate }) =>
      candidate.toLowerCase() === label.toLowerCase(),
    );
    if (!term || linkedIds.has(term.entry.id)) continue;
    linkedIds.add(term.entry.id);
    matches.push({ start, end: start + label.length, entry: term.entry });
  }

  return matches;
}

export function GlossaryLinkedText({ text }: { text: string }) {
  const matches = firstDistinctMatches(text);
  if (matches.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) parts.push(text.slice(cursor, match.start));
    parts.push(
      <Link
        key={`${match.entry.id}-${match.start}`}
        href={`/guide/#${match.entry.id}`}
        title={match.entry.short}
        className="font-medium text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {text.slice(match.start, match.end)}
      </Link>,
    );
    cursor = match.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export { firstDistinctMatches };
