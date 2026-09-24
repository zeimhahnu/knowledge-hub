"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fieldControlClassName } from "@/components/ui/field";
import { CANONICAL_EVENTS, eventDateLabel } from "@/lib/event-taxonomy";
import { buildLookupUrl } from "@/lib/lookup-url";

/** Change the event type or date in place. The URL is the lookup's state, so applying navigates. */
export function EventEditor({ ticker, company, eventType, exDate }: {
  ticker: string;
  company: string | null;
  eventType: string;
  exDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextEvent, setNextEvent] = useState(eventType);
  const [nextDate, setNextDate] = useState(exDate);
  const href = buildLookupUrl(ticker, nextEvent, nextDate, company);
  const unchanged = nextEvent === eventType && nextDate === exDate;

  function cancel() {
    setNextEvent(eventType);
    setNextDate(exDate);
    setOpen(false);
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!href || unchanged) return;
    setOpen(false);
    router.push(href);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-[4px] border border-border px-3 py-1 text-xs font-medium text-accent outline-none transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <PencilIcon className="h-3.5 w-3.5" aria-hidden />
        Edit event
      </button>
    );
  }

  return (
    <form onSubmit={apply} aria-label="Edit event type and date" className="flex w-full flex-wrap items-end gap-3 pt-2">
      <label className="grid min-w-56 gap-1 text-xs font-medium text-muted-foreground">
        Event type
        <select value={nextEvent} onChange={(e) => setNextEvent(e.target.value)} className={fieldControlClassName()}>
          {CANONICAL_EVENTS.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        {eventDateLabel(nextEvent)}
        <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={fieldControlClassName("ca-date-control py-2")} />
      </label>
      <Button type="submit" disabled={!href || unchanged}>Update lookup</Button>
      <Button type="button" variant="ghost" onClick={cancel}>Cancel</Button>
    </form>
  );
}
