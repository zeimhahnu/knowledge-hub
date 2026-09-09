#!/usr/bin/env node
/** Regression proof that PDF extraction cannot detach the bytes used for identity. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { extractIngestedPdf, persistIngestedDocument } from "../src/lib/ingest.ts";

const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const FIXTURE = path.join(process.cwd(), "scripts/fixtures/vettafi-methodology-a.pdf");
const SECOND_FIXTURE = path.join(process.cwd(), "scripts/fixtures/vettafi-methodology-b.pdf");
const FIXTURE_SHA256 = "6bd8957ea0c83763645df54da3c96457a3755eeacef251c22d7404ce9c284974";

const rootDir = await mkdtemp(path.join(os.tmpdir(), "knowledge-hub-ingest-hash-"));
try {
  const fixtureBytes = new Uint8Array(await readFile(FIXTURE));
  const expectedDigest = createHash("sha256").update(fixtureBytes).digest("hex");
  assert.equal(expectedDigest, FIXTURE_SHA256, "fixture changed without updating its known digest");

  const fixture = await extractIngestedPdf(fixtureBytes);
  assert.ok(fixture.text.trim(), "fixture must produce extracted text");
  const persisted = await persistIngestedDocument({
    vendor: "vettafi",
    filename: path.basename(FIXTURE),
    bytes: fixtureBytes,
    text: fixture.text,
    pageCount: fixture.pageCount,
    retrievedAt: new Date("2026-09-09T00:00:00.000Z"),
    rootDir,
  });

  assert.equal(persisted.sha256, FIXTURE_SHA256, "persisted digest must match the fixture file");
  assert.notEqual(persisted.sha256, EMPTY_SHA256, "ingest must never identify a document as the empty string");

  const secondBytes = new Uint8Array(await readFile(SECOND_FIXTURE));
  const second = await extractIngestedPdf(secondBytes);
  const secondPersisted = await persistIngestedDocument({
    vendor: "vettafi",
    filename: path.basename(SECOND_FIXTURE),
    bytes: secondBytes,
    text: second.text,
    pageCount: second.pageCount,
    retrievedAt: new Date("2026-09-09T00:00:00.000Z"),
    rootDir,
  });

  assert.notEqual(persisted.proposalPath, secondPersisted.proposalPath, "different documents must get different proposal paths");
  assert.notEqual(persisted.sha256, secondPersisted.sha256, "different documents must get different digests");
  console.log("OK — extracted documents retain their true digests and same-vendor proposals do not overwrite each other");
} finally {
  await rm(rootDir, { recursive: true, force: true });
}
