"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckIcon, XIcon } from "lucide-react";
import { RouteShell } from "@/components/route-shell";
import { Band } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";

type Proposal = {
  vendor: string;
  event_type: string;
  treatment: string | null;
  source_ref: string;
  confidence: string;
};
type ProposalFile = { id: string; status: string; document: { vendor: string; filename: string; retrieved_at: string }; proposals: Proposal[]; approved_indices?: number[]; rejected_indices?: number[] };

export default function ReviewPage() {
  const [files, setFiles] = useState<ProposalFile[]>([]);
  const [message, setMessage] = useState("Loading proposals…");

  async function load() {
    const response = await fetch("/api/rules/proposals/", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load proposals");
    setFiles((await response.json()) as ProposalFile[]);
    setMessage("");
  }

  useEffect(() => {
    // The fetch callback updates state only after the external request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => setMessage("Could not load proposals."));
  }, []);

  async function decide(id: string, decision: "approve" | "reject", index?: number) {
    setMessage(`${decision === "approve" ? "Approving" : "Rejecting"} proposal…`);
    const response = await fetch("/api/rules/proposals/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, decision, ...(index === undefined ? {} : { index }) }) });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Could not save decision.");
      return;
    }
    await load();
    setMessage(`${decision === "approve" ? "Approved" : "Rejected"}.`);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Band tone="dark">
        <RouteShell>
          <SectionHeader eyebrow="Human review" title="Proposed methodology rules" description="Extraction only proposes. Approve a document to append its candidates to the curated rule set; rejected or absent candidates never become rules." />
        </RouteShell>
      </Band>
      <Band tone="light" className="min-h-screen">
      <RouteShell>
        <div className="max-w-5xl">
          {message && <Surface className="mt-6 p-4 text-sm text-muted-foreground" role="status">{message}</Surface>}
          <div className="mt-8 space-y-6">
            {files.filter((file) => file.status === "proposed").map((file) => (
              <Surface as="section" key={file.id} className="overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
                  <div><h2 className="ca-section-title">{file.document.vendor} · {file.document.filename}</h2><p className="mt-1 text-xs text-muted-foreground">Retrieved {new Date(file.document.retrieved_at).toLocaleString()}</p></div>
                  <div className="flex gap-2"><Button type="button" variant="destructive" onClick={() => void decide(file.id, "reject")}><XIcon className="h-4 w-4" aria-hidden />Reject</Button><Button type="button" onClick={() => void decide(file.id, "approve")}><CheckIcon className="h-4 w-4" aria-hidden />Approve all</Button></div>
                </header>
                <div className="divide-y divide-border">
                  {file.proposals.map((proposal, index) => { const decided = file.approved_indices?.includes(index) || file.rejected_indices?.includes(index); return <article key={`${file.id}-${proposal.event_type}`} className="grid gap-3 p-5 md:grid-cols-[12rem_1fr_auto] md:items-start"><div><p className="font-semibold">{proposal.event_type}</p><p className={`mt-1 text-xs font-medium ${proposal.confidence === "absent" ? "text-muted-foreground" : "text-success"}`}>{proposal.confidence}</p></div><div><p className="text-sm leading-relaxed">{proposal.treatment ?? "No treatment stated in this methodology."}</p><p className="mt-2 text-xs text-muted-foreground">{proposal.source_ref}</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{file.approved_indices?.includes(index) ? "approved" : file.rejected_indices?.includes(index) ? "rejected" : "proposed"}</span>{!decided && <><button type="button" aria-label={`Reject ${proposal.event_type}`} onClick={() => void decide(file.id, "reject", index)} className="rounded-lg border border-destructive/40 p-2 text-destructive hover:bg-destructive/10"><XIcon className="h-4 w-4" aria-hidden /></button><button type="button" aria-label={`Approve ${proposal.event_type}`} onClick={() => void decide(file.id, "approve", index)} className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90"><CheckIcon className="h-4 w-4" aria-hidden /></button></>}</div></article> })}
                </div>
              </Surface>
            ))}
          </div>
          <p className="mt-8 text-sm"><Link className="font-medium text-primary underline-offset-4 hover:underline" href="/upload">Back to methodology upload</Link></p>
        </div>
      </RouteShell>
      </Band>
    </main>
  );
}
