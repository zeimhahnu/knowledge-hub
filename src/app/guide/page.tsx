import type { Metadata } from "next";
import Link from "next/link";

import glossary from "@/data/glossary.json";

export const metadata: Metadata = {
  title: "Glossary | Index Vendor Intelligence",
  description:
    "Plain-language explanations for corporate-action and index-treatment terms used in the coverage matrix.",
};

const sections = [
  { heading: "Return measures", ids: ["price-return-index", "total-return-index", "net-total-return-index"] },
  { heading: "Price and rights mechanics", ids: ["paf", "terp", "in-the-money", "out-of-the-money", "dividend-size-threshold"] },
  { heading: "Share and investability measures", ids: ["nos", "fif", "dif"] },
] as const;

export default function GuidePage() {
  const entries = new Map(glossary.map((entry) => [entry.id, entry]));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-14">
        <header className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Reading guide</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Corporate-action glossary
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Plain-language explanations for the terms that appear in vendor treatment text.
            Select a linked term in the lookup table to jump directly to its explanation.
          </p>
        </header>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.heading} aria-labelledby={`${section.heading}-heading`}>
              <h2
                id={`${section.heading}-heading`}
                className="border-b border-border pb-3 text-xl font-semibold tracking-tight"
              >
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4">
                {section.ids.map((id) => {
                  const entry = entries.get(id);
                  if (!entry) return null;
                  return (
                    <article
                      key={entry.id}
                      id={entry.id}
                      className="scroll-mt-6 rounded-2xl border border-border bg-card/70 p-5 shadow-sm"
                    >
                      <h3 className="text-lg font-semibold tracking-tight">{entry.term}</h3>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/90">
                        {entry.short}
                      </p>
                      <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
                        {entry.long}
                      </p>
                      {entry.sourceRef && (
                        <p className="mt-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                          Source: {entry.sourceRef}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Need the underlying vendor rule? Return to the <Link className="text-primary underline underline-offset-2" href="/">lookup</Link> and open the cited source reference.
        </p>
      </div>
    </main>
  );
}
