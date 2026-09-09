import { NextResponse } from "next/server";
import screeningRules from "@/data/screening-rules.json" with { type: "json" };
import { judge } from "@/lib/screen-methodology";
import { extractIngestedPdf, persistIngestedDocument } from "@/lib/ingest";
import { contentLengthStatus } from "@/middleware";

export const runtime = "nodejs";

const VENDOR_RE = /^[a-z][a-z0-9-]{1,23}$/;
const { minBytes, maxBytes } = screeningRules.limits;

function rejected(reasons: string[], status = 422) {
  return NextResponse.json({ accepted: false, reasons }, { status });
}

/**
 * POST /api/ingest
 *
 * Screens, persists, and proposes an uploaded methodology PDF. Proposal
 * extraction never mutates the curated rule set; approval is a separate action.
 */
export async function POST(request: Request) {
  // ponytail: dailyQuota in screening-rules.json is unenforced — single shared key today makes
  // that a config note, not a gap. Wire @vercel/kv (or Upstash) if a second caller/key is issued
  // and quota needs to be per-caller.
  const contentLengthStatusCode = contentLengthStatus(request.headers.get("content-length"), maxBytes);
  if (contentLengthStatusCode) {
    const declaredLength = Number(request.headers.get("content-length"));
    return rejected([`declared ${declaredLength} bytes — over the ${maxBytes} limit`], contentLengthStatusCode);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return rejected(["could not read multipart form data"], 400);
  }

  const vendor = String(formData.get("vendor") ?? "").trim();
  if (!VENDOR_RE.test(vendor)) {
    return rejected(["vendor must be a lowercase id using letters, numbers, and hyphens"], 400);
  }

  const upload = formData.get("file");
  if (!(upload instanceof File)) {
    return rejected(["provide a PDF file in the file field"], 400);
  }

  if (upload.size < minBytes) {
    return rejected([`${upload.size} bytes — too small to be a methodology guide`]);
  }
  if (upload.size > maxBytes) {
    return rejected([`${upload.size} bytes — over the ${maxBytes} limit`]);
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await upload.arrayBuffer());
  } catch {
    return rejected(["could not read the uploaded file"], 400);
  }

  const magic = new TextDecoder().decode(bytes.subarray(0, 5));
  if (magic !== "%PDF-") {
    return rejected(["not a PDF — magic bytes missing (a renamed file?)"]);
  }

  let text: string;
  let pageCount = 0;
  try {
    ({ text, pageCount } = await extractIngestedPdf(bytes));
  } catch {
    return rejected(["could not read a text layer — rejecting rather than guessing (fail closed)"]);
  }

  if (!text.trim()) {
    return rejected(["could not read a text layer — rejecting rather than guessing (fail closed)"]);
  }

  const verdict = judge(text, vendor);
  if (!verdict.accepted) return rejected(verdict.reasons);

  let persisted;
  try {
    persisted = await persistIngestedDocument({ vendor, filename: upload.name, bytes, text, pageCount });
  } catch {
    return rejected(["The document passed screening but could not be persisted safely."], 500);
  }

  return NextResponse.json({
    accepted: true,
    vendor,
    chars: text.length,
    pages: pageCount,
    sha256: persisted.sha256,
    proposals: persisted.proposals.length,
    proposalPath: persisted.proposalPath,
    note: `Stored the extracted text and proposed ${persisted.proposals.length} event rules for human review. Nothing was added to the curated rule set.`,
  });
}
