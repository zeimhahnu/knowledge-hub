#!/usr/bin/env node
import assert from "node:assert/strict";
import { AnalystStreamError, readAnalystSse, streamAnalystTurn } from "../src/lib/ca-analyst/client.ts";

const sse = (events) => new Response(
  events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
  { headers: { "content-type": "text/event-stream; charset=utf-8" } },
);

const seen = [];
await readAnalystSse(sse([
  { type: "status", stage: "validating" },
  { type: "delta", text: "A cited explanation." },
  { type: "sources", sources: [{ kind: "document", ref: "methodology.md#L1-L2", label: "Methodology" }] },
  { type: "done", answer: "A cited explanation.", sources: [{ kind: "document", ref: "methodology.md#L1-L2", label: "Methodology" }], modelTier: "flash" },
]), (event) => seen.push(event));
assert.deepEqual(seen.map((event) => event.type), ["status", "delta", "sources", "done"], "valid SSE sequence is delivered");

await assert.rejects(
  () => readAnalystSse(sse([{ type: "sources", sources: [{ kind: "url", url: "javascript:alert(1)", label: "bad" }] }, { type: "done", answer: "", sources: [], modelTier: "flash" }]), () => {}),
  (error) => error instanceof AnalystStreamError && error.code === "service_unavailable",
  "unsafe citations are rejected before UI state",
);

await assert.rejects(
  () => streamAnalystTurn({ lookup: {}, question: "Why?" }, () => {}, new AbortController().signal, async () => new Response(JSON.stringify({ type: "error", code: "access_required", message: "Access identity required", retryable: false }), { status: 403, headers: { "content-type": "application/json" } })),
  (error) => error instanceof AnalystStreamError && error.code === "access_required" && !error.retryable,
  "safe relay errors map to UI errors",
);

const controller = new AbortController();
controller.abort();
await assert.rejects(
  () => streamAnalystTurn({ lookup: {}, question: "Why?" }, () => {}, controller.signal, async (_url, init) => {
    assert.equal(init?.signal?.aborted, true, "abort signal reaches fetch");
    throw new DOMException("Aborted", "AbortError");
  }),
  (error) => error instanceof AnalystStreamError && error.code === "cancelled",
  "abort maps to cancelled without a completed turn",
);

console.log("OK — CA Analyst stream framing, citations, relay errors, and abort pass");
