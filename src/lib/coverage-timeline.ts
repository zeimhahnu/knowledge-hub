import {
  daysOut,
  deriveVendorGroups,
  type LookupVerdict,
} from "./lookup-verdict.ts";
import { getLeadDays, type SettingsStorage } from "./coverage-settings.ts";
import { vendorLabel, type VendorId } from "./vendors.ts";

export type TimelineRowState =
  | "published"
  | "overdue"
  | "not-yet-due"
  | "no-horizon"
  | "not-checked"
  | "not-applicable";

export interface TimelineAxis {
  minDay: number;
  maxDay: number;
  todayDay: 0;
  exDateDay: number;
  todayPercent: number;
  exDatePercent: number;
}

export interface TimelineBand {
  startDay: number;
  endDay: number;
  startPercent: number;
  endPercent: number;
  widthPercent: number;
}

export interface TimelineRow {
  vendor: VendorId;
  label: string;
  state: TimelineRowState;
  status: string;
  leadDays: number | null;
  leadSource: "user-set" | "stated" | "unset";
  daysOut: number;
  markerDay: number | null;
  markerPercent: number | null;
  band: TimelineBand | null;
}

export interface CoverageTimelineModel {
  axis: TimelineAxis;
  rows: TimelineRow[];
  todayLabel: string;
  exDateLabel: string;
}

const percentAt = (day: number, minDay: number, maxDay: number): number =>
  ((day - minDay) / (maxDay - minDay)) * 100;

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

function statusFor(
  state: TimelineRowState,
  daysUntilWindow: number | null,
): string {
  switch (state) {
    case "published":
      return "Published — observation confirmed";
    case "overdue":
      return "Overdue — checked absent";
    case "not-yet-due":
      if (daysUntilWindow === null) return "Not yet due";
      return `Not yet due — due in ${daysUntilWindow} day${daysUntilWindow === 1 ? "" : "s"}`;
    case "no-horizon":
      return "No horizon — timing unassessed";
    case "not-checked":
      return "Not checked — observation needed";
    case "not-applicable":
      return "Not applicable";
  }
}

/**
 * Build the shared-axis model for the publication-horizon figure.
 *
 * All timing inputs stay on the existing boundaries: `deriveVendorGroups`
 * classifies the observation, `getLeadDays` resolves the horizon, and
 * `daysOut` anchors every band to the ex-date. This module only turns those
 * facts into coordinates for the view.
 */
export function buildCoverageTimelineModel({
  verdict,
  eventType,
  exDate,
  today,
  storage,
}: {
  verdict: LookupVerdict;
  eventType: string;
  exDate: Date;
  today: Date;
  storage?: SettingsStorage;
}): CoverageTimelineModel {
  const exDateDay = daysOut(exDate, today);
  const groups = deriveVendorGroups(verdict);
  const supplied = new Set(groups.supplied.map((row) => row.vendor));
  const expectedAbsent = new Set(groups.expectedAbsent.map((row) => row.vendor));
  const notYetDue = new Set(groups.notYetDue.map((row) => row.vendor));
  const unchecked = new Set(groups.unchecked.map((row) => row.vendor));

  const preliminary = verdict.rows.map((row): Omit<TimelineRow, "markerPercent" | "band"> & {
    bandStartDay: number | null;
    bandEndDay: number | null;
    daysUntilWindow: number | null;
  } => {
    const lead = getLeadDays(row.vendor, eventType, storage);
    const hasHorizon = row.applicable && lead.value !== null && lead.source !== "unset";
    const state: TimelineRowState = !row.applicable
      ? "not-applicable"
      : !hasHorizon
        ? "no-horizon"
        : supplied.has(row.vendor)
          ? "published"
          : expectedAbsent.has(row.vendor)
            ? "overdue"
            : notYetDue.has(row.vendor)
              ? "not-yet-due"
              : unchecked.has(row.vendor)
                ? "not-checked"
                : "no-horizon";
    const bandStartDay = hasHorizon ? exDateDay - lead.value! : null;
    const bandEndDay = hasHorizon ? exDateDay : null;
    const markerDay = state === "published" || state === "overdue" || state === "not-yet-due" ? 0 : null;

    return {
      vendor: row.vendor,
      label: vendorLabel(row.vendor),
      state,
      status: statusFor(state, bandStartDay === null ? null : Math.max(0, bandStartDay)),
      leadDays: lead.value,
      leadSource: lead.source,
      daysOut: exDateDay,
      markerDay,
      bandStartDay,
      bandEndDay,
      daysUntilWindow: bandStartDay === null ? null : Math.max(0, bandStartDay),
    };
  });

  const domainDays = [0, exDateDay, ...preliminary.flatMap((row) =>
    row.bandStartDay === null || row.bandEndDay === null
      ? []
      : [row.bandStartDay, row.bandEndDay],
  )];
  let minDay = Math.min(...domainDays);
  let maxDay = Math.max(...domainDays);
  if (minDay === maxDay) {
    minDay -= 1;
    maxDay += 1;
  }

  const toPercent = (day: number): number => percentAt(day, minDay, maxDay);
  const rows = preliminary.map(({ bandStartDay, bandEndDay, daysUntilWindow, ...row }) => ({
    ...row,
    status: statusFor(row.state, daysUntilWindow),
    markerPercent: row.markerDay === null ? null : toPercent(row.markerDay),
    band:
      bandStartDay === null || bandEndDay === null
        ? null
        : {
            startDay: bandStartDay,
            endDay: bandEndDay,
            startPercent: toPercent(bandStartDay),
            endPercent: toPercent(bandEndDay),
            widthPercent: toPercent(bandEndDay) - toPercent(bandStartDay),
          },
  }));

  return {
    axis: {
      minDay,
      maxDay,
      todayDay: 0,
      exDateDay,
      todayPercent: toPercent(0),
      exDatePercent: toPercent(exDateDay),
    },
    rows,
    todayLabel: isoDate(today),
    exDateLabel: isoDate(exDate),
  };
}
