"use client";

import { createPortal } from "react-dom";
import { type AnimationEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BotIcon, XIcon } from "lucide-react";

import { CaAnalystPanel } from "@/components/lookup/ca-analyst-panel";
import type { AnalystLookupContext } from "@/lib/ca-analyst/types";

const subscribeToMount = () => () => undefined;
const getClientMount = () => true;
const getServerMount = () => false;

/**
 * CA Analyst as a side dock rather than another column.
 *
 * The analyst is a conversation ABOUT the matrix, so it must not push the
 * matrix off screen: this is a non-modal drawer. The page stays scrollable
 * and readable underneath, because the questions worth asking are the ones
 * you think of while looking at the rows.
 */
export function CaAnalystDock({ context }: { context: AnalystLookupContext }) {
  const mounted = useSyncExternalStore(subscribeToMount, getClientMount, getServerMount);
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const closeDock = useCallback(() => {
    setOpen(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRendered(false);
      setClosing(false);
    } else {
      setClosing(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      composerRef.current?.focus({ preventScroll: true });
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDock, open]);

  // Returning focus to the launcher keeps keyboard users where they left off.
  useEffect(() => {
    if (!open && !rendered) launcherRef.current?.focus({ preventScroll: true });
  }, [open, rendered]);

  const toggleDock = () => {
    if (open) {
      closeDock();
      return;
    }
    setClosing(false);
    setRendered(true);
    setOpen(true);
  };

  const finishAnimation = (event: AnimationEvent<HTMLElement>) => {
    if (event.animationName === "ca-dock-enter") {
      composerRef.current?.focus({ preventScroll: true });
    }
    if (event.animationName === "ca-dock-exit") {
      setRendered(false);
      setClosing(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={toggleDock}
        aria-expanded={open}
        aria-controls="ca-analyst-dock"
        className="box-border fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-border bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <BotIcon className="h-4 w-4" aria-hidden />
        {open ? "Hide CA Analyst" : "Ask CA Analyst"}
      </button>

      <aside
        id="ca-analyst-dock"
        role="dialog"
        aria-label="CA Analyst"
        aria-hidden={!rendered}
        hidden={!rendered}
        data-closing={closing || undefined}
        onAnimationEnd={finishAnimation}
        className="ca-dock box-border fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col border-l border-border bg-background shadow-2xl sm:w-[440px]"
      >
        <div className="ca-brand-rule shrink-0" aria-hidden />
        <div className="ca-dock-step ca-dock-step-1 flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            {context.ticker} · {context.eventType}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={() => {
              closeDock();
            }}
            aria-label="Close CA Analyst"
            className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <XIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="ca-dock-scroll flex-1 overflow-y-auto p-4 pb-24">
          <CaAnalystPanel context={context} composerRef={composerRef} />
        </div>
      </aside>
    </>,
    document.body,
  );
}
