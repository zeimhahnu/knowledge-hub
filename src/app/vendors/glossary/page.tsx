import { RouteShell } from "@/components/route-shell";
import { Band } from "@/components/ui/band";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { VendorReferenceNav } from "@/components/vendor-reference-nav";
import { GLOSSARY } from "@/lib/glossary";

export const metadata = {
  title: "Glossary · Vendor reference",
  description:
    "Definitions for the corporate-action terms used across the vendor methodology pages and the lookup.",
};

/**
 * The glossary as a place rather than a toggle.
 *
 * It was local state on the event-taxonomy page, so it existed only there and
 * closed itself whenever the practitioner moved to another reference section --
 * exactly when a definition is most likely to be needed. As a route it is
 * linkable, survives a refresh, and can be opened in a second tab beside a
 * lookup that is still in progress.
 */
export default function GlossaryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Band tone="dark">
        <RouteShell wide className="space-y-8">
          <SectionHeader
            eyebrow="Vendor reference"
            title="Glossary"
            description="The shared language behind the taxonomy, the methodology rules, and every lookup verdict."
          />
          <VendorReferenceNav current="glossary" />
        </RouteShell>
      </Band>

      <Band tone="light" className="min-h-screen">
        <main>
          <RouteShell wide className="space-y-6 py-10">
            <p className="text-sm text-muted-foreground">
              {GLOSSARY.length} terms, in the order they tend to come up during an
              investigation.
            </p>
            <dl className="grid gap-4 sm:grid-cols-2">
              {GLOSSARY.map((entry) => (
                <Surface key={entry.term} as="div" className="space-y-2 p-5">
                  <dt className="text-sm font-medium text-foreground">{entry.term}</dt>
                  <dd className="space-y-2">
                    <p className="text-sm text-muted-foreground">{entry.definition}</p>
                    {entry.detail && (
                      <p className="text-xs leading-relaxed text-muted-foreground/80">
                        {entry.detail}
                      </p>
                    )}
                  </dd>
                </Surface>
              ))}
            </dl>
          </RouteShell>
        </main>
      </Band>
    </div>
  );
}
