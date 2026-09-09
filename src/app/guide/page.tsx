import type { Metadata } from "next";
import Link from "next/link";

import glossary from "@/data/glossary.json";
import { RouteShell } from "@/components/route-shell";
import { Band } from "@/components/ui/band";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";

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
      <Band tone="dark">
      <RouteShell>
        <SectionHeader eyebrow="Reading guide" title="Corporate-action glossary" description="Plain-language explanations for the terms that appear in vendor treatment text. Select a linked term in the lookup table to jump directly to its explanation." className="max-w-2xl" />
      </RouteShell>
      </Band>
      <Band tone="light" className="min-h-screen">
      <RouteShell>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.heading} aria-labelledby={`${section.heading}-heading`}>
              <h2
                id={`${section.heading}-heading`}
                className="ca-section-title border-b border-border pb-3"
              >
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4">
                {section.ids.map((id) => {
                  const entry = entries.get(id);
                  if (!entry) return null;
                  return (
                    <Surface
                      as="article"
                      key={entry.id}
                      id={entry.id}
                      className="scroll-mt-6 p-5"
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
                    </Surface>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Need the underlying vendor rule? Return to the <Link className="text-primary underline underline-offset-2" href="/">lookup</Link> and open the cited source reference.
        </p>
      </RouteShell>
      </Band>
    </main>
  );
}
