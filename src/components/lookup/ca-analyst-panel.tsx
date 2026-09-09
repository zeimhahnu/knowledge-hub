"use client";

import { type FormEvent, type RefObject, useMemo, useRef, useState } from "react";
import { BotIcon, LoaderCircleIcon, SquareIcon } from "lucide-react";

import { SurfaceSection } from "@/components/surface-section";
import { AnalystStreamError, streamAnalystTurn } from "@/lib/ca-analyst/client";
import type { AnalystLookupContext, AnalystUiTurn } from "@/lib/ca-analyst/types";

const initialTurn: AnalystUiTurn = { answer: "", sources: [], status: "idle" };

function questionFor(context: AnalystLookupContext): string {
  const late = context.matrixRows.find((row) => row.state === "missing");
  if (late) return `Why is ${late.vendor} marked missing for this event?`;
  if (!context.news.validationRan) return "Why could news not be validated for this lookup?";
  return `Why is this vendor state not a discrepancy for ${context.ticker}?`;
}

export function CaAnalystPanel({
  context,
  composerRef,
}: {
  context: AnalystLookupContext;
  composerRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const [question, setQuestion] = useState("");
  const [turn, setTurn] = useState<AnalystUiTurn>(initialTurn);
  const controller = useRef<AbortController | null>(null);
  const suggestedQuestion = useMemo(() => questionFor(context), [context]);
  const busy = turn.status === "streaming";

  const ask = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    const next = new AbortController();
    controller.current?.abort();
    controller.current = next;
    setTurn({ answer: "", sources: [], status: "streaming", stage: "validating" });
    try {
      await streamAnalystTurn({ lookup: context, question: text }, (streamEvent) => {
        setTurn((current) => {
          if (streamEvent.type === "status") return { ...current, stage: streamEvent.stage };
          if (streamEvent.type === "delta") return { ...current, answer: `${current.answer}${streamEvent.text}` };
          if (streamEvent.type === "sources") return { ...current, sources: streamEvent.sources };
          if (streamEvent.type === "done") {
            return { answer: streamEvent.answer, sources: streamEvent.sources, modelTier: streamEvent.modelTier, status: "complete" };
          }
          return { answer: "", sources: [], status: "error", error: streamEvent };
        });
      }, next.signal);
    } catch (error) {
      const failure = error instanceof AnalystStreamError
        ? error
        : new AnalystStreamError("service_unavailable", "Analyst service unavailable.", true);
      setTurn({
        answer: "",
        sources: [],
        status: failure.code === "cancelled" ? "cancelled" : "error",
        error: { code: failure.code, message: failure.message, retryable: failure.retryable },
      });
    } finally {
      if (controller.current === next) controller.current = null;
    }
  };

  const cancel = () => controller.current?.abort();

  return (
    <SurfaceSection className="space-y-4" aria-labelledby="ca-analyst-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <BotIcon className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
          <div>
          <h2 id="ca-analyst-heading" className="ca-section-title">CA Analyst</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Context: {context.ticker} · {context.eventType} · ex-date {context.exDate} · {context.selectedVendors.length} selected vendor{context.selectedVendors.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
        {turn.modelTier && <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">{turn.modelTier} answer</span>}
      </div>

      <div className="ca-dock-step ca-dock-step-2 space-y-4">
        {!context.news.validationRan && (
          <p className="rounded-xl border border-chart-4/40 bg-chart-4/10 px-4 py-3 text-sm text-chart-4">
            News remains unavailable for this turn: {context.news.warning ?? "News validation did not run."}
          </p>
        )}
        {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircleIcon className="h-4 w-4" aria-hidden /> Analyst {turn.stage ?? "working"}…</p>}
        {turn.status === "cancelled" && <p role="status" className="text-sm text-muted-foreground">Analyst request cancelled.</p>}
        {turn.status === "error" && turn.error && (
          <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            <p>{turn.error.message}</p>
            {turn.error.retryable && <button type="button" onClick={() => void ask()} className="font-medium underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">Retry</button>}
          </div>
        )}
        {(turn.answer || turn.status === "complete") && (
          <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4" aria-live="polite">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{turn.answer}</p>
            {turn.sources.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">Sources ({turn.sources.length})</summary>
                <ul className="mt-3 space-y-2">
                  {turn.sources.map((source) => <li key={source.kind === "url" ? source.url : source.ref} className="rounded-lg border border-border bg-background/60 p-3 text-sm">
                    {source.kind === "url" ? <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring">{source.label}</a> : <span className="font-medium text-foreground">{source.label}</span>}
                    <span className="mt-1 block break-all text-xs text-muted-foreground">{source.kind === "url" ? source.url : source.ref}</span>
                  </li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <form className="ca-dock-step ca-dock-step-3 space-y-3" onSubmit={ask}>
        <label className="grid gap-1.5 text-sm" htmlFor="ca-analyst-question">
          <span className="font-medium">Ask about this lookup</span>
          <textarea
            ref={composerRef}
            id="ca-analyst-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value.slice(0, 1200))}
            maxLength={1200}
            rows={3}
            disabled={busy}
            placeholder={suggestedQuestion}
            className="resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || question.trim().length === 0} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
            Ask analyst
          </button>
          <button type="button" onClick={() => setQuestion(suggestedQuestion)} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
            Use suggestion
          </button>
          {busy && <button type="button" onClick={cancel} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"><SquareIcon className="h-3.5 w-3.5" aria-hidden /> Cancel</button>}
        </div>
      </form>
    </SurfaceSection>
  );
}
