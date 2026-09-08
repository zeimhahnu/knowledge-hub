#!/usr/bin/env node
/**
 * Regression guard for the publication-horizon timeline.
 *
 * The fixtures exercise the REAL timeline model and its four meaningful
 * geometries. The final assertion deliberately corrupts a not-yet-due row;
 * the guard must catch that row pretending to be overdue.
 */
import assert from "node:assert/strict";
import { buildCoverageTimelineModel } from "../src/lib/coverage-timeline.ts";
import { STORAGE_KEY } from "../src/lib/coverage-settings.ts";

const day = (iso) => new Date(`${iso}T00:00:00.000Z`);

const storage = {
  getItem(key) {
    if (key !== STORAGE_KEY) return null;
    return JSON.stringify({
      schema: 1,
      vendorDefaults: { msci: 5, sp: 5, ftse: 5 },
      overrides: {},
    });
  },
  setItem() {},
  removeItem() {},
};

const row = (vendor, state, confirmationState) => ({
  vendor,
  dataCoverage: "states-treatment",
  state,
  applicable: true,
  assessed: state !== "not-assessed" && state !== "not-checked",
  confirmation: confirmationState
    ? { state: confirmationState, checkedAt: "2026-09-01T00:00:00.000Z" }
    : null,
  leadDays: null,
  source: null,
  treatment: "fixture",
  sourceRef: null,
  rulePresent: true,
  treatmentStated: true,
  treatments: [],
});

const verdictFor = (fixtureRow) => ({
  rows: [fixtureRow],
  totals: {
    dataStatesTreatment: 1,
    dataSilent: 0,
    dataNotCovered: 0,
    applicable: fixtureRow.applicable ? 1 : 0,
    assessed: fixtureRow.assessed ? 1 : 0,
    covered: fixtureRow.state === "covered" ? 1 : 0,
    missing: fixtureRow.state === "missing" ? 1 : 0,
    notYetDue: fixtureRow.state === "not-yet-due" ? 1 : 0,
    unchecked: fixtureRow.state === "not-checked" ? 1 : 0,
    notAssessed: fixtureRow.state === "not-assessed" ? 1 : 0,
    notApplicable: fixtureRow.applicable ? 0 : 1,
  },
  empty: !fixtureRow.assessed,
});

function modelFor(fixtureRow, exDate, today) {
  return buildCoverageTimelineModel({
    verdict: verdictFor(fixtureRow),
    eventType: "special-dividend",
    exDate: day(exDate),
    today: day(today),
    storage,
  });
}

function assertGeometry(model, expectedState) {
  const [timelineRow] = model.rows;
  assert.equal(timelineRow?.state, expectedState);
  assert.equal(model.axis.todayPercent >= 0 && model.axis.todayPercent <= 100, true);
  assert.equal(model.axis.exDatePercent >= 0 && model.axis.exDatePercent <= 100, true);

  if (expectedState === "published") {
    assert.ok(timelineRow.band, "published has a band");
    assert.notEqual(timelineRow.markerDay, null, "published has an observation marker");
    assert.ok(timelineRow.band.widthPercent > 0, "published band has width");
  } else if (expectedState === "overdue") {
    assert.ok(timelineRow.band, "overdue has a closed band");
    assert.notEqual(timelineRow.markerDay, null, "overdue has an observation marker");
    assert.ok(timelineRow.markerDay > timelineRow.band.endDay, "overdue marker is past the band end");
  } else if (expectedState === "not-yet-due") {
    assert.ok(timelineRow.band, "not-yet-due has an open band");
    assert.notEqual(timelineRow.markerDay, null, "not-yet-due has an observation marker");
    assert.ok(timelineRow.markerDay < timelineRow.band.startDay, "not-yet-due marker is before the band");
    assert.notEqual(timelineRow.state, "overdue", "not-yet-due never renders as overdue");
  } else if (expectedState === "no-horizon") {
    assert.equal(timelineRow.band, null, "no-horizon has no band");
    assert.equal(timelineRow.markerDay, null, "no-horizon has no timing marker");
  }
}

assertGeometry(modelFor(row("msci", "covered", "confirmed"), "2026-09-11", "2026-09-01"), "published");
assertGeometry(modelFor(row("sp", "missing", "absent"), "2026-08-30", "2026-09-01"), "overdue");
assertGeometry(modelFor(row("ftse", "not-yet-due", "absent"), "2026-09-11", "2026-09-01"), "not-yet-due");
assertGeometry(modelFor(row("morningstar", "not-assessed", "absent"), "2026-09-11", "2026-09-01"), "no-horizon");

const broken = modelFor(row("ftse", "not-yet-due", "absent"), "2026-09-11", "2026-09-01");
broken.rows[0].state = "overdue";
assert.throws(() => assertGeometry(broken, "not-yet-due"), /not-yet-due/);

console.log("OK — coverage timeline geometry covers published, overdue, not-yet-due, and no-horizon; deliberate broken case failed as expected.");
