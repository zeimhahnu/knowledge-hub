#!/usr/bin/env node
/**
 * Proves the selected ingest store can persist and read two documents without
 * collision, and that the filesystem backend fails clearly on a read-only mount.
 */
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { listProposalFiles, persistIngestedDocument, StorageUnavailableError } from "../src/lib/ingest.ts";
import { selectStorageMode } from "../src/lib/durable-storage.ts";

const rootDir = await mkdtemp(path.join(os.tmpdir(), "knowledge-hub-ingest-storage-"));
const originalStorage = process.env.INGEST_STORAGE;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalFetch = globalThis.fetch;
const blobObjects = new Map();

try {
  // Keep the check offline while exercising the same Blob control/data-plane
  // requests used in production.
  process.env.INGEST_STORAGE = "blob";
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_teststore";
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    if (method === "PUT" && url.pathname === "/api/blob/") {
      const pathname = url.searchParams.get("pathname");
      assert.ok(pathname);
      if (blobObjects.has(pathname) && init.headers?.["x-allow-overwrite"] !== "1") {
        return new Response(JSON.stringify({ error: { message: "already exists" } }), { status: 409 });
      }
      blobObjects.set(pathname, await new Response(init.body).text());
      return Response.json({ pathname });
    }
    if (method === "GET" && url.hostname === "teststore.private.blob.vercel-storage.com") {
      const pathname = url.pathname.slice(1);
      return blobObjects.has(pathname) ? new Response(blobObjects.get(pathname)) : new Response(null, { status: 404 });
    }
    if (method === "GET" && url.pathname === "/api/blob/") {
      const prefix = url.searchParams.get("prefix") ?? "";
      return Response.json({
        blobs: [...blobObjects.keys()].filter((pathname) => pathname.startsWith(prefix)).map((pathname) => ({ pathname })),
        hasMore: false,
      });
    }
    throw new Error(`unexpected mocked Blob request: ${method} ${url}`);
  };

  assert.equal(selectStorageMode(), "blob", "Blob credentials must select the deployment backend");
  const first = await persistIngestedDocument({
    vendor: "vettafi",
    filename: "first.pdf",
    bytes: new TextEncoder().encode("first document"),
    text: "VettaFi methodology dividend ex-date adjustment.",
    pageCount: 1,
    retrievedAt: new Date("2026-09-09T00:00:00.000Z"),
  });
  const second = await persistIngestedDocument({
    vendor: "vettafi",
    filename: "second.pdf",
    bytes: new TextEncoder().encode("second document"),
    text: "VettaFi methodology stock split ex-date adjustment.",
    pageCount: 1,
    retrievedAt: new Date("2026-09-09T00:00:00.000Z"),
  });
  assert.notEqual(first.proposalPath, second.proposalPath, "different documents must use different keys");
  const blobProposals = await listProposalFiles();
  assert.equal(blobProposals.length, 2, "both Blob documents must remain readable");
  assert.deepEqual(new Set(blobProposals.map(({ path: proposalPath }) => proposalPath)), new Set([first.proposalPath, second.proposalPath]));

  delete process.env.BLOB_READ_WRITE_TOKEN;
  process.env.INGEST_STORAGE = "filesystem";
  assert.equal(selectStorageMode(rootDir), "filesystem", "test root must select the local backend");
  const localFirst = await persistIngestedDocument({
    vendor: "vettafi",
    filename: "first.pdf",
    bytes: new TextEncoder().encode("local first document"),
    text: "VettaFi methodology dividend ex-date adjustment.",
    pageCount: 1,
    retrievedAt: new Date("2026-09-09T00:00:00.000Z"),
    rootDir,
  });
  const localSecond = await persistIngestedDocument({
    vendor: "vettafi",
    filename: "second.pdf",
    bytes: new TextEncoder().encode("local second document"),
    text: "VettaFi methodology stock split ex-date adjustment.",
    pageCount: 1,
    retrievedAt: new Date("2026-09-09T00:00:00.000Z"),
    rootDir,
  });
  assert.notEqual(localFirst.proposalPath, localSecond.proposalPath, "local documents must use different keys");
  assert.equal((await listProposalFiles(rootDir)).length, 2, "both local documents must remain readable");

  await assert.rejects(
    persistIngestedDocument({
      vendor: "vettafi",
      filename: "read-only.pdf",
      bytes: new TextEncoder().encode("read-only document"),
      text: "VettaFi methodology corporate action adjustment.",
      pageCount: 1,
      retrievedAt: new Date("2026-09-09T00:00:00.000Z"),
      rootDir: "/sys",
    }),
    (error) => error instanceof StorageUnavailableError && error.code === "STORAGE_UNAVAILABLE",
    "a read-only filesystem must fail as storage unavailable",
  );

  console.log("OK — selected Blob and filesystem backends round-trip two documents, preserve both keys, and reject read-only filesystem writes");
} finally {
  if (originalStorage === undefined) delete process.env.INGEST_STORAGE;
  else process.env.INGEST_STORAGE = originalStorage;
  if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
  globalThis.fetch = originalFetch;
  await rm(rootDir, { recursive: true, force: true });
}
