"use client";

import { Tooltip } from "@base-ui/react/tooltip";

interface Props {
  term: string;
  definition: string;
  children: React.ReactNode;
}

export function GlossaryTerm({ term, definition, children }: Props) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        type="button"
        delay={180}
        closeDelay={80}
        className="inline cursor-help border-0 border-b border-dotted border-muted-foreground/60 bg-transparent p-0 text-left font-[inherit] text-[inherit] leading-[inherit] underline-offset-2 hover:border-primary/60 focus-visible:rounded-sm focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={8} className="z-50">
          <Tooltip.Popup className="max-w-[min(280px,calc(100vw-1.5rem))] rounded-xl border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg outline-none">
            <p className="mb-1 text-[13px] font-semibold leading-tight">{term}</p>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              {definition}
            </p>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
