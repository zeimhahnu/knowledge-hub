import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";

import { CANONICAL_EVENTS, type CanonicalEventId } from "./event-taxonomy.ts";
import { normalizeTreatmentText } from "./finding-language.ts";

export type ProposedRule = {
  vendor: string;
  event_type: CanonicalEventId;
  index_type: "*";
  treatment: string | null;
  lead_days: null;
  lead_days_confidence: "absent";
  source_ref: string;
  confidence: "stated" | "absent";
};

export type ProposalFile = {
  status: "proposed" | "approved" | "rejected";
  document: {
    vendor: string;
    filename: string;
    sha256: string;
    page_count: number;
    extracted_char_count: number;
    retrieved_at: string;
    metadata_path: string;
    text_path: string;
  };
  proposals: ProposedRule[];
  approved_indices?: number[];
  rejected_indices?: number[];
  decided_at?: string;
};

export type PersistedIngest = {
  metadataPath: string;
  textPath: string;
  proposalPath: string;
  sha256: string;
  proposals: ProposedRule[];
  reused: boolean;
};

const EVENT_ALIASES: Record<CanonicalEventId, readonly string[]> = {
  "cash-dividend": ["cash dividend", "ordinary dividend"],
  "special-dividend": ["special dividend", "special cash dividend"],
  "stock-dividend": ["stock dividend"],
  "bonus-issue": ["bonus issue", "bonus share"],
  "stock-split": ["stock split", "share consolidation", "reverse split"],
  "spin-off": ["spin-off", "spin off", "demerger"],
  "rights-issue": ["rights issue", "rights offering"],
  "secondary-offering": ["secondary offering", "follow-on offering"],
  "private-placement": ["private placement"],
  "return-of-capital": ["return of capital", "capital return"],
  merger: ["merger", "acquisition", "takeover"],
  "tender-offer": ["tender offer", "tender"],
  bankruptcy: ["bankruptcy", "delisting", "insolvency"],
};

const ABSENT_LANGUAGE = /\b(not addressed|not covered|does not address|not specified|no treatment is specified|no treatment)\b/i;
const HEADING = /^(?:\d+(?:\.\d+)*[.)]?\s+)?[A-Z][A-Z\s/&-]{4,}$/;
const NUMBERED_TITLE_HEADING = /^\d+(?:\.\d+)*[.)]?\s+[A-Z][A-Za-z\s/&-]{4,}$/;

export async function extractIngestedPdf(bytes: Uint8Array): Promise<{ text: string; pageCount: number }> {
  // pdf.js takes ownership of its input ArrayBuffer and detaches it. Keep the
  // original bytes intact because persistence hashes those bytes for identity.
  const pdf = await getDocumentProxy(bytes.slice());
  const extracted = await extractText(pdf, { mergePages: true });
  return { text: extracted.text, pageCount: pdf.numPages };
}

function safeSegment(value: string, fallback: string): string {
  const segment = value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return segment.slice(0, 48) || fallback;
}

function sectionSnippet(lines: string[], index: number): string {
  const collected = [lines[index].trim()];
  for (let cursor = index + 1; cursor < lines.length && collected.length < 6; cursor += 1) {
    const line = lines[cursor].trim();
    if (!line) continue;
    if (collected.length > 1 && (HEADING.test(line) || NUMBERED_TITLE_HEADING.test(line))) break;
    collected.push(line);
  }
  return collected.join(" ").replace(/\s+/g, " ").trim();
}

export function buildProposedRules(vendor: string, text: string, documentRef: string): ProposedRule[] {
  const lines = text.split(/\r?\n/);
  return CANONICAL_EVENTS.map((event) => {
    const aliases = EVENT_ALIASES[event.id];
    const index = lines.findIndex((line) => aliases.some((alias) => line.toLowerCase().includes(alias)));
    const snippet = index >= 0 ? sectionSnippet(lines, index) : "";
    const absent = !snippet || ABSENT_LANGUAGE.test(snippet);
    return {
      vendor,
      event_type: event.id,
      index_type: "*",
      treatment: absent ? null : normalizeTreatmentText(snippet, event.id),
      lead_days: null,
      lead_days_confidence: "absent",
      source_ref: `${documentRef} §${event.name}`,
      confidence: absent ? "absent" : "stated",
    };
  });
}

async function writeImmutable(filePath: string, contents: string): Promise<boolean> {
  try {
    await writeFile(filePath, contents, { encoding: "utf8", flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

export async function persistIngestedDocument(input: {
  vendor: string;
  filename: string;
  bytes: Uint8Array;
  text: string;
  pageCount: number;
  retrievedAt?: Date;
  rootDir?: string;
}): Promise<PersistedIngest> {
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const retrievedAt = input.retrievedAt ?? new Date();
  const day = retrievedAt.toISOString().slice(0, 10);
  const vendorSegment = safeSegment(input.vendor, "vendor");
  const basename = `${vendorSegment}-${sha256}`;
  const root = input.rootDir ?? process.cwd();
  const documentDir = path.join(root, "src", "data", "methodologies", day);
  const proposalDir = path.join(root, "src", "data", "proposed-rules", day);
  await Promise.all([mkdir(documentDir, { recursive: true }), mkdir(proposalDir, { recursive: true })]);

  const metadataPath = path.join(documentDir, `${basename}.json`);
  const textPath = path.join(documentDir, `${basename}.txt`);
  const proposalPath = path.join(proposalDir, `${basename}.json`);
  const metadataRef = path.relative(root, metadataPath);
  const textRef = path.relative(root, textPath);
  const proposalRef = path.relative(root, proposalPath);
  const proposals = buildProposedRules(input.vendor, input.text, metadataRef);
  const metadata = {
    vendor: input.vendor,
    filename: input.filename,
    sha256,
    page_count: input.pageCount,
    extracted_char_count: input.text.length,
    retrieved_at: retrievedAt.toISOString(),
    text_path: textRef,
    proposal_path: proposalRef,
  };
  const document = { ...metadata, metadata_path: metadataRef };
  const proposal: ProposalFile = { status: "proposed", document, proposals };

  const [metadataCreated, textCreated, proposalCreated] = await Promise.all([
    writeImmutable(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`),
    writeImmutable(textPath, input.text),
    writeImmutable(proposalPath, `${JSON.stringify(proposal, null, 2)}\n`),
  ]);
  if (metadataCreated && textCreated && proposalCreated) {
    return { metadataPath: metadataRef, textPath: textRef, proposalPath: proposalRef, sha256, proposals, reused: false };
  }

  const existing = JSON.parse(await readFile(proposalPath, "utf8")) as ProposalFile;
  return {
    metadataPath: metadataRef,
    textPath: textRef,
    proposalPath: proposalRef,
    sha256,
    proposals: existing.proposals,
    reused: true,
  };
}

export async function listProposalFiles(rootDir = process.cwd()): Promise<Array<{ id: string; path: string; proposal: ProposalFile }>> {
  const root = path.join(rootDir, "src", "data", "proposed-rules");
  const entries: string[] = [];
  try {
    const days = await readdir(root, { withFileTypes: true });
    for (const day of days) {
      if (!day.isDirectory()) continue;
      const files = await readdir(path.join(root, day.name));
      entries.push(...files.filter((file) => file.endsWith(".json")).map((file) => path.join(day.name, file)));
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const proposals = await Promise.all(entries.map(async (relativePath) => ({
    id: relativePath.replace(/\.json$/, ""),
    path: path.join("src", "data", "proposed-rules", relativePath),
    proposal: JSON.parse(await readFile(path.join(root, relativePath), "utf8")) as ProposalFile,
  })));
  return proposals.sort((a, b) => a.id.localeCompare(b.id));
}
