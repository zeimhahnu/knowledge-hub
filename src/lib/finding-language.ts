import { canonicalEventById } from "./event-taxonomy.ts";

export type FindingConditions = Readonly<Record<string, string | number | boolean>> | null;

export type FindingRule = {
  eventType: string;
  indexType?: string;
  conditions?: FindingConditions;
  confidence?: string;
  treatment?: string | null;
};

export type LeadFinding = {
  leadAnswer: string;
  reason: string;
};

const EVENT_HEADINGS = [
  "Cash Dividend",
  "Special Cash Dividend",
  "Stock Dividend",
  "Bonus Issue",
  "Stock Split / Consolidation",
  "Spin-Off / Demerger",
  "Rights Issue",
  "Secondary Offering",
  "Private Placement",
  "Return of Capital",
  "Mergers & Acquisitions",
  "Tender Offers",
  "Bankruptcy / Delisting",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

/** Remove extraction-only section labels while leaving the methodology wording intact. */
export function normalizeTreatmentText(text: string, eventType?: string): string {
  let normalized = text.replace(/\s+/g, " ").trim();
  const eventHeading = eventType ? canonicalEventById(eventType)?.name : undefined;
  const headings = eventHeading ? [eventHeading, ...EVENT_HEADINGS] : [...EVENT_HEADINGS];

  for (let pass = 0; pass < 3; pass += 1) {
    const numbered = /^\d+(?:\.\d+)*[.)]?\s+/.exec(normalized);
    if (numbered) {
      normalized = normalized.slice(numbered[0].length).trimStart();
      continue;
    }

    const heading = headings.find((candidate) => {
      const pattern = new RegExp(`^${escapeRegExp(candidate)}(?=\\s+[A-Z]|\\s*[:—-])`, "i");
      return pattern.test(normalized);
    });
    if (!heading) break;
    normalized = normalized.slice(heading.length).replace(/^\s*[:—-]?\s*/, "").trimStart();
  }

  return normalized;
}

function thresholdLabel(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

function statedFinding(rule: FindingRule): LeadFinding {
  const conditions = rule.conditions ?? {};
  const threshold = conditions.dividend_size_threshold_pct;
  const thresholdSide = conditions.threshold_side;
  if (typeof threshold === "number" && thresholdSide === "at_or_above") {
    const label = thresholdLabel(threshold);
    return {
      leadAnswer: `PAF applies at ${label} or above.`,
      reason: `Below ${label}, the event is treated as ordinary.`,
    };
  }
  if (typeof threshold === "number" && thresholdSide === "below") {
    const label = thresholdLabel(threshold);
    return {
      leadAnswer: `No PAF below ${label}.`,
      reason: `At or above ${label}, the rule switches to special treatment.`,
    };
  }

  switch (rule.eventType) {
    case "cash-dividend":
      if (rule.indexType === "price-return") {
        return {
          leadAnswer: "No PAF for the Price Return index.",
          reason: "Ordinary cash dividends do not change the price-return index.",
        };
      }
      if (rule.indexType === "total-return" || rule.indexType === "gross-total-return") {
        return {
          leadAnswer: "No price adjustment; the gross TR branch reinvests the dividend.",
          reason: "The dividend is reinvested without withholding tax in the gross Total Return branch.",
        };
      }
      if (rule.indexType === "net-total-return") {
        return {
          leadAnswer: "No price adjustment; NTR reinvests the dividend.",
          reason: "The dividend is reinvested in the Net Total Return index.",
        };
      }
      return {
        leadAnswer: "Treatment depends on the return index.",
        reason: "This vendor publishes separate rules for price, total, or net-total return.",
      };
    case "special-dividend":
      return {
        leadAnswer: "PAF applies when the dividend is classified as special.",
        reason: "The methodology uses event classification rather than a numeric threshold.",
      };
    case "rights-issue":
      if (conditions.rights_moneyness === "in-the-money") {
        return {
          leadAnswer: "PAF applies to in-the-money rights.",
          reason: "The subscription price is below market.",
        };
      }
      if (conditions.rights_moneyness === "out-of-the-money") {
        return {
          leadAnswer: "No PAF for out-of-the-money rights.",
          reason: "The subscription price is at or above market.",
        };
      }
      return {
        leadAnswer: "PAF depends on whether the rights are in the money.",
        reason: "The rule changes with rights moneyness.",
      };
    case "stock-dividend":
    case "bonus-issue":
    case "stock-split":
      return {
        leadAnswer: "PAF applies for the share-price adjustment.",
        reason: "Shares and price move together for this event.",
      };
    case "spin-off":
      return {
        leadAnswer: "Adjustment applies on the ex-date.",
        reason: "The spin-off is handled as an index event when it becomes effective.",
      };
    case "secondary-offering":
      return {
        leadAnswer: "Adjustment may apply to a secondary offering.",
        reason: "The vendor has a sourced share-change rule for this event.",
      };
    case "private-placement":
      return {
        leadAnswer: "Adjustment may apply to a private placement.",
        reason: "The vendor has a sourced share-change rule for this event.",
      };
    case "return-of-capital":
      return {
        leadAnswer: "Adjustment depends on how the return is classified.",
        reason: "The vendor distinguishes regular and special returns of capital.",
      };
    case "merger":
      return {
        leadAnswer: "Index treatment applies when the merger rule is triggered.",
        reason: "The vendor has a sourced rule for removing the target and handling the deal.",
      };
    case "tender-offer":
      return {
        leadAnswer: "Index treatment depends on the tender outcome.",
        reason: "The vendor applies its rule when the offer conditions are met.",
      };
    case "bankruptcy":
      return {
        leadAnswer: "Index treatment applies on deletion.",
        reason: "Bankruptcy or delisting triggers the vendor's removal rule.",
      };
    default:
      return {
        leadAnswer: "A sourced treatment applies to this event.",
        reason: "Open the methodology wording for the vendor's event conditions.",
      };
  }
}

export function leadFindingForRule(rule: FindingRule): LeadFinding {
  if (rule.confidence === "absent" || rule.treatment === null) {
    return {
      leadAnswer: "No stated treatment. The methodology does not address this event.",
      reason: "This is methodology silence, not evidence of no adjustment.",
    };
  }
  return statedFinding(rule);
}

export function leadFindingForRules(rules: readonly FindingRule[]): LeadFinding {
  if (rules.length === 0) {
    return {
      leadAnswer: "No sourced rule covers this event.",
      reason: "There is no curated methodology row to assess.",
    };
  }

  const statedRules = rules.filter(
    (rule) => rule.confidence !== "absent" && rule.treatment !== null,
  );
  if (statedRules.length === 0) return leadFindingForRule(rules[0]!);

  const indexTypes = new Set(statedRules.map((rule) => rule.indexType ?? "*"));
  const conditionKeys = new Set(
    statedRules.map((rule) => JSON.stringify(rule.conditions ?? {})),
  );
  if (rules[0]?.eventType === "cash-dividend" && indexTypes.size > 1) {
    return {
      leadAnswer: "No PAF in Price Return; gross TR/NTR reinvest the dividend.",
      reason: "The vendor publishes separate treatment by return index, including gross and net reinvestment branches.",
    };
  }
  if (rules[0]?.eventType === "rights-issue" && conditionKeys.size > 1) {
    return {
      leadAnswer: "PAF depends on whether the rights are in the money.",
      reason: "The rule changes with rights moneyness.",
    };
  }
  if (indexTypes.size > 1) {
    return {
      leadAnswer: "Treatment depends on the selected index branch.",
      reason: "The vendor publishes separate rules by return variant or weighting branch.",
    };
  }
  if (conditionKeys.size > 1) {
    return {
      leadAnswer: "Treatment depends on the event conditions.",
      reason: "The vendor publishes more than one structured variant for this event.",
    };
  }
  return leadFindingForRule(statedRules[0]!);
}
