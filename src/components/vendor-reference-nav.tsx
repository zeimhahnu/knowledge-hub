import Link from "next/link";
import { BookOpenIcon, FileTextIcon, LayersIcon, NetworkIcon } from "lucide-react";

/**
 * One nav for every vendor-reference page.
 *
 * Each page used to hand-roll its own copy, and they had drifted into three
 * different navs: the taxonomy page carried four items, ISO CAEV carried three
 * (no Glossary), and Event Parameters carried none at all -- so arriving there
 * was a dead end with no way back. Glossary was local state on one page, which
 * is why it disappeared the moment you left it.
 *
 * Every section is a real route here, so each one is linkable, survives a
 * refresh, and is reachable from all the others.
 */
export type VendorReferenceSection = "taxonomy" | "iso" | "parameters" | "glossary";

const SECTIONS: Array<{
  id: VendorReferenceSection;
  href: string;
  label: string;
  Icon: typeof NetworkIcon;
}> = [
  { id: "taxonomy", href: "/vendors/", label: "Event taxonomy", Icon: LayersIcon },
  { id: "iso", href: "/vendors/iso-taxonomy/", label: "ISO CAEV Taxonomy", Icon: NetworkIcon },
  { id: "parameters", href: "/vendors/event-extraction/", label: "Event Parameters", Icon: FileTextIcon },
  { id: "glossary", href: "/vendors/glossary/", label: "Glossary", Icon: BookOpenIcon },
];

export function VendorReferenceNav({ current }: { current: VendorReferenceSection }) {
  return (
    <nav
      aria-label="Vendor reference"
      className="flex flex-wrap items-center gap-x-6 border-t border-border pt-2"
    >
      {SECTIONS.map(({ id, href, label, Icon }) => {
        const active = id === current;
        return (
          <Link
            key={id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-2 border-b-2 px-1 py-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            <Icon aria-hidden className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
