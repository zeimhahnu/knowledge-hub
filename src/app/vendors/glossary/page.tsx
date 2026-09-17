import { RouteShell } from "@/components/route-shell";
import { Band } from "@/components/ui/band";
import { SectionHeader } from "@/components/ui/section-header";
import { VendorReferenceNav } from "@/components/vendor-reference-nav";
import { GlossaryList } from "@/components/vendors/glossary-list";
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
          {/* No extra vertical padding: .ca-band-light already supplies 80px, and
              adding py-10 on top produced a 120px dead band above the first line. */}
          <RouteShell wide>
            <GlossaryList entries={GLOSSARY} />
          </RouteShell>
        </main>
      </Band>
    </div>
  );
}
