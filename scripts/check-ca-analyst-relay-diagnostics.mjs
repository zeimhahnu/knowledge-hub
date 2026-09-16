#!/usr/bin/env node
// The relay collapsed four distinct causes into one silent `service_unavailable`:
// env var unset, malformed URL, fetch throwing, non-403 upstream status. Vercel
// encrypts the value, so a wrong CA_ANALYST_SERVICE_URL was unfalsifiable from
// outside and cost a week. These guard the diagnostic that fixed that — and,
// more importantly, guard that it never logs the URL itself, only the host.
import assert from "node:assert/strict";
import { upstreamHost } from "../src/lib/ca-analyst/relay-diagnostics.ts";

assert.equal(upstreamHost(undefined), "<unset>", "absent env var is reported as unset, not as a bad host");
assert.equal(upstreamHost(""), "<unset>", "empty env var is unset, not malformed");
assert.equal(upstreamHost("analyst.vpszeimhahnu.uk"), "<malformed>", "a bare hostname with no scheme is malformed");
assert.equal(upstreamHost("http://"), "<malformed>", "a scheme with no host is malformed");
assert.equal(upstreamHost("not a url at all"), "<malformed>", "garbage is malformed");

assert.equal(upstreamHost("https://analyst.vpszeimhahnu.uk"), "analyst.vpszeimhahnu.uk", "the expected production value resolves to its host");
assert.equal(upstreamHost("https://analyst.vpszeimhahnu.uk/"), "analyst.vpszeimhahnu.uk", "a trailing slash does not change the host");
assert.equal(upstreamHost("http://127.0.0.1:8081"), "127.0.0.1:8081", "host keeps the port, which distinguishes a local misconfiguration");

// The one that actually matters: a service URL can carry a credential, and this
// value goes to a log. The host must survive; the secret must not.
for (const raw of [
  "https://user:sup3rs3cret@analyst.vpszeimhahnu.uk/v1",
  "https://analyst.vpszeimhahnu.uk/v1?token=sup3rs3cret",
  "https://analyst.vpszeimhahnu.uk/v1#sup3rs3cret",
]) {
  const host = upstreamHost(raw);
  assert.equal(host, "analyst.vpszeimhahnu.uk", `host extracted from ${raw}`);
  assert.ok(!host.includes("sup3rs3cret"), "a credential in the URL must never reach the log line");
  assert.ok(!host.includes("/"), "no path component leaks into the log line");
}

console.log("check-ca-analyst-relay-diagnostics: ok");
