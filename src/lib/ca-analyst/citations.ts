import type { MatrixRow } from "../lookup-verdict.ts";

/**
 * The sources a lookup actually cites, in the order they appear on the page.
 *
 * Kept framework-free and out of the component for the same reason as
 * validate-request.ts: anything importing React or lucide cannot be loaded by a
 * bare-node check, and a derived list that no check can reach is exactly how the
 * first version shipped wrong.
 *
 * It must mirror TreatmentSummary's render condition EXACTLY. That component
 * returns early for a row with no rule and renders no citation at all, so
 * walking every row produced references at the foot of the investigation that
 * nothing on the page linked to.
 */
export function collectCitedSources(rows: readonly MatrixRow[]): string[] {
  const seen: string[] = [];
  for (const row of rows) {
    if (!row.rulePresent) continue;
    for (const treatment of row.treatments) {
      if (treatment.sourceRef && !seen.includes(treatment.sourceRef)) seen.push(treatment.sourceRef);
    }
    if (row.sourceRef && !seen.includes(row.sourceRef)) seen.push(row.sourceRef);
  }
  return seen;
}
