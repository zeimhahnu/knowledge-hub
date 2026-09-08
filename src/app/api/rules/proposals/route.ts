import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { listProposalFiles, type ProposalFile } from "@/lib/ingest";
import { asRulesDocument, validateRulesDocument, type CuratedRule } from "@/lib/rule-validation";

export const runtime = "nodejs";

const RULES_PATH = path.join(process.cwd(), "src", "data", "rules.json");

export async function GET() {
  const files = await listProposalFiles();
  return NextResponse.json(files.map(({ id, path: proposalPath, proposal }) => ({
    id,
    path: proposalPath,
    status: proposal.status,
    document: proposal.document,
    proposals: proposal.proposals,
  })));
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

  const files = await listProposalFiles();
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
    const current = asRulesDocument(JSON.parse(await readFile(RULES_PATH, "utf8")));
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
    await writeRulesAtomically(next);
    selectedIndices.forEach((candidateIndex) => alreadyApproved.add(candidateIndex));
  } else {
    selectedIndices.forEach((candidateIndex) => alreadyRejected.add(candidateIndex));
  }
  const decided = alreadyApproved.size + alreadyRejected.size === match.proposal.proposals.length;
  await writeDecision(match.path, {
    ...match.proposal,
    status: decided ? (alreadyApproved.size > 0 ? "approved" : "rejected") : "proposed",
    approved_indices: [...alreadyApproved].sort((a, b) => a - b),
    rejected_indices: [...alreadyRejected].sort((a, b) => a - b),
    ...(decided ? { decided_at: new Date().toISOString() } : {}),
  });
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
  const absolute = path.join(process.cwd(), relativePath);
  await writeFile(absolute, `${JSON.stringify(proposal, null, 2)}\n`, "utf8");
}

async function writeRulesAtomically(document: ReturnType<typeof asRulesDocument>) {
  const temp = `${RULES_PATH}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  await rename(temp, RULES_PATH);
}
