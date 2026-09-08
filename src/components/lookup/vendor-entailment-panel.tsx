import type { VendorEntailment } from "@/lib/vendor-entailment";

const TONE: Record<VendorEntailment["verdict"], { ring: string; dot: string; label: string }> = {
  contradicted: { ring: "border-destructive/40 bg-destructive/10", dot: "bg-destructive", label: "Should have published" },
  consistent: { ring: "border-chart-3/40 bg-chart-3/10", dot: "bg-chart-3", label: "Absence explained" },
  indeterminate: { ring: "border-border bg-muted/40", dot: "bg-muted-foreground", label: "Cannot judge" },
};

/**
 * Why each absent vendor is, or is not, actually wrong.
 *
 * Deliberately three states. "Cannot judge" is a first-class answer here: a
 * silent methodology and an unresolved fund are unknowns, and showing them as
 * unknowns is the point - a confident wrong verdict is worse than no verdict.
 */
export function VendorEntailmentPanel({ results }: { results: VendorEntailment[] }) {
  if (!results.length) return null;
  const ranked = [...results].sort((a, b) => {
    const order = { contradicted: 0, consistent: 1, indeterminate: 2 };
    return order[a.verdict] - order[b.verdict];
  });

  return (
    <section aria-labelledby="entailment-heading" className="mt-6">
      <h3 id="entailment-heading" className="text-sm font-semibold tracking-tight">
        Cross-vendor reasoning
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Whether each absence is contradicted by what another vendor already published.
        {ranked[0]?.scope === "2-d" && " No fund resolved, so only index-agnostic rules are compared."}
      </p>
      <ul className="space-y-2">
        {ranked.map((result) => {
          const tone = TONE[result.verdict];
          return (
            <li key={`${result.vendor}-${result.verdict}`} className={`rounded-xl border px-4 py-3 ${tone.ring}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
                <span className="text-sm font-medium uppercase">{result.vendor}</span>
                <span className="text-xs text-muted-foreground">{tone.label}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{result.reason}</p>
              {result.ruleRefs.length > 0 && (
                <p className="mt-1.5 font-mono text-[11px] text-muted-foreground/80">
                  {result.ruleRefs.join(" · ")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
