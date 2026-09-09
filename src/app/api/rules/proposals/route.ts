import { NextResponse } from "next/server";
import bundledRules from "@/data/rules.json" with { type: "json" };

import { listProposalFiles, StorageUnavailableError, type ProposalFile } from "@/lib/ingest";
import { asRulesDocument, validateRulesDocument, type CuratedRule } from "@/lib/rule-validation";
import { readStoredText, writeStoredJson } from "@/lib/durable-storage";

export const runtime = "nodejs";

const RULES_KEY = "src/data/rules.json";

function storageUnavailable() {
  return NextResponse.json({ error: "storage unavailable", code: "STORAGE_UNAVAILABLE" }, { status: 503 });
}

export async function GET() {
  try {
    const files = await listProposalFiles();
    return NextResponse.json(files.map(({ id, path: proposalPath, proposal }) => ({
      id,
      path: proposalPath,
      status: proposal.status,
      document: proposal.document,
      proposals: proposal.proposals,
    })));
  } catch (error) {
    if (error instanceof StorageUnavailableError) return storageUnavailable();
    throw error;
  }
}

export async function POST(request: Request) {
  let body: { id?: unknown; decision?: unknown; index?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; decision?: unknown; index?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }
  const index = body.index === undefined ? null : Number(body.index);
  if (typeof body.id !== "string" || !/^[\w-]+\/[^/]+$/.test(body.id) || !["approve", "reject"].includes(String(body.decision)) || (index !== null && (!Number.isInteger(index) || index < 0))) {
    return NextResponse.json({ error: "id and decision (approve or reject) are required" }, { status: 400 });
  }

  let files;
  try {
    files = await listProposalFiles();
  } catch (error) {
    if (error instanceof StorageUnavailableError) return storageUnavailable();
    throw error;
  }
  const match = files.find((file) => file.id === body.id);
  if (!match) return NextResponse.json({ error: "proposal not found" }, { status: 404 });
  if (match.proposal.status !== "proposed") return NextResponse.json({ error: "proposal already decided" }, { status: 409 });

  const alreadyApproved = new Set(match.proposal.approved_indices ?? []);
  const alreadyRejected = new Set(match.proposal.rejected_indices ?? []);
  const undecided = match.proposal.proposals.map((_, candidateIndex) => candidateIndex).filter((candidateIndex) => !alreadyApproved.has(candidateIndex) && !alreadyRejected.has(candidateIndex));
  const selectedIndices = index === null ? undecided : [index];
  if (selectedIndices.some((candidateIndex) => candidateIndex >= match.proposal.proposals.length)) return NextResponse.json({ error: "proposal index not found" }, { status: 400 });
  if (selectedIndices.some((candidateIndex) => alreadyApproved.has(candidateIndex) || alreadyRejected.has(candidateIndex))) return NextResponse.json({ error: "proposal row already decided" }, { status: 409 });

  if (body.decision === "approve") {
    const selected = selectedIndices.map((candidateIndex) => match.proposal.proposals[candidateIndex]);
    let current;
    try {
      const storedRules = await readStoredText(RULES_KEY);
      current = asRulesDocument(storedRules ? JSON.parse(storedRules) : bundledRules);
    } catch (error) {
      if (error instanceof StorageUnavailableError) return storageUnavailable();
      throw error;
    }
    const existingKeys = new Set(current.rules.map((rule) => `${rule.vendor}|${rule.event_type}|${rule.index_type}`));
    const selectedKeys = new Set<string>();
    for (const rule of selected) {
      const key = `${rule.vendor}|${rule.event_type}|${rule.index_type}`;
      if (existingKeys.has(key) || selectedKeys.has(key)) {
        return NextResponse.json({ error: `a curated rule already exists for ${key}` }, { status: 409 });
      }
      selectedKeys.add(key);
    }
    const next = { ...current, rules: [...current.rules, ...selected.map(toCuratedRule)], generated: new Date().toISOString().slice(0, 10) };
    next.vendors = [...new Set([...next.vendors, ...selected.map((rule) => rule.vendor)])];
    const errors = validateRulesDocument(next);
    if (errors.length > 0) return NextResponse.json({ error: "proposal failed rules schema validation", details: errors }, { status: 422 });
    try {
      await writeStoredJson(RULES_KEY, next, { allowOverwrite: true });
    } catch (error) {
      if (error instanceof StorageUnavailableError) return storageUnavailable();
      throw error;
    }
    selectedIndices.forEach((candidateIndex) => alreadyApproved.add(candidateIndex));
  } else {
    selectedIndices.forEach((candidateIndex) => alreadyRejected.add(candidateIndex));
  }
  const decided = alreadyApproved.size + alreadyRejected.size === match.proposal.proposals.length;
  try {
    await writeDecision(match.path, {
      ...match.proposal,
      status: decided ? (alreadyApproved.size > 0 ? "approved" : "rejected") : "proposed",
      approved_indices: [...alreadyApproved].sort((a, b) => a - b),
      rejected_indices: [...alreadyRejected].sort((a, b) => a - b),
      ...(decided ? { decided_at: new Date().toISOString() } : {}),
    });
  } catch (error) {
    if (error instanceof StorageUnavailableError) return storageUnavailable();
    throw error;
  }
  return NextResponse.json({ status: body.decision === "approve" ? "approved" : "rejected", added: body.decision === "approve" ? selectedIndices.length : 0 });
}

function toCuratedRule(rule: ProposalFile["proposals"][number]): CuratedRule {
  return {
    vendor: rule.vendor,
    event_type: rule.event_type,
    index_type: rule.index_type,
    treatment: rule.treatment,
    lead_days: rule.lead_days,
    lead_days_confidence: rule.lead_days_confidence,
    source_ref: rule.source_ref,
    confidence: rule.confidence,
  };
}

async function writeDecision(relativePath: string, proposal: ProposalFile) {
  await writeStoredJson(relativePath, proposal, { allowOverwrite: true });
}
