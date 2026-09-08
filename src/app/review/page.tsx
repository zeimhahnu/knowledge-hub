"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckIcon, XIcon } from "lucide-react";
import { RouteShell } from "@/components/route-shell";

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
    const response = await fetch("/api/rules/proposals", { cache: "no-store" });
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
    const response = await fetch("/api/rules/proposals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, decision, ...(index === undefined ? {} : { index }) }) });
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
      <RouteShell className="py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Human review</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Proposed methodology rules</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">Extraction only proposes. Approve a document to append its candidates to the curated rule set; rejected or absent candidates never become rules.</p>
          {message && <p className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground" role="status">{message}</p>}
          <div className="mt-8 space-y-6">
            {files.filter((file) => file.status === "proposed").map((file) => (
              <section key={file.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
                  <div><h2 className="font-semibold">{file.document.vendor} · {file.document.filename}</h2><p className="mt-1 text-xs text-muted-foreground">Retrieved {new Date(file.document.retrieved_at).toLocaleString()}</p></div>
                  <div className="flex gap-2"><button type="button" onClick={() => void decide(file.id, "reject")} className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"><XIcon className="h-4 w-4" aria-hidden />Reject</button><button type="button" onClick={() => void decide(file.id, "approve")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><CheckIcon className="h-4 w-4" aria-hidden />Approve all</button></div>
                </header>
                <div className="divide-y divide-border">
                  {file.proposals.map((proposal, index) => { const decided = file.approved_indices?.includes(index) || file.rejected_indices?.includes(index); return <article key={`${file.id}-${proposal.event_type}`} className="grid gap-3 p-5 md:grid-cols-[12rem_1fr_auto] md:items-start"><div><p className="font-semibold">{proposal.event_type}</p><p className={`mt-1 text-xs font-medium ${proposal.confidence === "absent" ? "text-muted-foreground" : "text-success"}`}>{proposal.confidence}</p></div><div><p className="text-sm leading-relaxed">{proposal.treatment ?? "No treatment stated in this methodology."}</p><p className="mt-2 text-xs text-muted-foreground">{proposal.source_ref}</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{file.approved_indices?.includes(index) ? "approved" : file.rejected_indices?.includes(index) ? "rejected" : "proposed"}</span>{!decided && <><button type="button" aria-label={`Reject ${proposal.event_type}`} onClick={() => void decide(file.id, "reject", index)} className="rounded-lg border border-destructive/40 p-2 text-destructive hover:bg-destructive/10"><XIcon className="h-4 w-4" aria-hidden /></button><button type="button" aria-label={`Approve ${proposal.event_type}`} onClick={() => void decide(file.id, "approve", index)} className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90"><CheckIcon className="h-4 w-4" aria-hidden /></button></>}</div></article> })}
                </div>
              </section>
            ))}
          </div>
          <p className="mt-8 text-sm"><Link className="font-medium text-primary underline-offset-4 hover:underline" href="/upload">Back to methodology upload</Link></p>
        </div>
      </RouteShell>
    </main>
  );
}
