"use client";

import { useEffect, useRef, useState } from "react";
import { BotIcon, XIcon } from "lucide-react";

import { CaAnalystPanel } from "@/components/lookup/ca-analyst-panel";
import type { AnalystLookupContext } from "@/lib/ca-analyst/types";

/**
 * CA Analyst as a side dock rather than another column.
 *
 * The analyst is a conversation ABOUT the matrix, so it must not push the
 * matrix off screen: this is a non-modal drawer. The page stays scrollable
 * and readable underneath, because the questions worth asking are the ones
 * you think of while looking at the rows.
 */
export function CaAnalystDock({ context }: { context: AnalystLookupContext }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Returning focus to the launcher keeps keyboard users where they left off.
  useEffect(() => {
    if (!open) launcherRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="ca-analyst-dock"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-border bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <BotIcon className="h-4 w-4" aria-hidden />
        {open ? "Hide CA Analyst" : "Ask CA Analyst"}
      </button>

      <aside
        id="ca-analyst-dock"
        role="dialog"
        aria-label="CA Analyst"
        aria-hidden={!open}
        hidden={!open}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col border-l border-border bg-background shadow-2xl sm:w-[440px]"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            {context.ticker} · {context.eventType}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close CA Analyst"
            className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <XIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <CaAnalystPanel context={context} />
        </div>
      </aside>
    </>
  );
}
