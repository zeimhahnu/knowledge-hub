#!/usr/bin/env node
/** Operator-only acquisition helper. Never imported by Next.js. */
import { writeFile } from "node:fs/promises";
const sources = [
  "https://www.franklintempleton.com/investments/options/exchange-traded-funds/products/30780/SINGLCLASS/franklin-exponential-data-etf/XDAT",
  "https://www.ftserussell.com/resources/russell-reconstitution",
];
const raw = { acquired_at: new Date().toISOString(), sources: [] };
for (const url of sources) {
  try { const response = await fetch(url); const text = await response.text(); raw.sources.push({ url, retrieved_at: new Date().toISOString(), status: response.status, text }); }
  catch (error) { raw.sources.push({ url, retrieved_at: new Date().toISOString(), status: "error", error: String(error) }); }
}
await writeFile("agents/goop/memory/audit/ft-etf-acquisition-raw.json", JSON.stringify(raw, null, 2));
console.log("Saved raw responses before parsing.");
