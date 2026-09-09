"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertTriangleIcon, CheckCircle2Icon, UploadIcon } from "lucide-react";
import { RouteShell } from "@/components/route-shell";
import { Band } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Field, fieldControlClassName } from "@/components/ui/field";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";

type Verdict =
  | { accepted: true; vendor: string; chars: number; note: string }
  | { accepted: false; reasons: string[] };

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [vendor, setVendor] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setVerdict({ accepted: false, reasons: ["Choose a PDF methodology file first."] });
      return;
    }

    setIsSubmitting(true);
    setVerdict(null);

    try {
      const body = new FormData();
      body.set("file", file);
      body.set("vendor", vendor.trim().toLowerCase());
      const response = await fetch("/api/ingest", { method: "POST", body });
      const result: unknown = await response.json();

      if (
        typeof result === "object" &&
        result !== null &&
        "accepted" in result &&
        result.accepted === true &&
        "vendor" in result &&
        "chars" in result &&
        "note" in result &&
        typeof result.vendor === "string" &&
        typeof result.chars === "number" &&
        typeof result.note === "string"
      ) {
        setVerdict({ accepted: true, vendor: result.vendor, chars: result.chars, note: result.note });
      } else if (
        typeof result === "object" &&
        result !== null &&
        "reasons" in result &&
        Array.isArray(result.reasons) &&
        result.reasons.every((reason): reason is string => typeof reason === "string")
      ) {
        setVerdict({ accepted: false, reasons: result.reasons });
      } else {
        setVerdict({ accepted: false, reasons: ["The screening service returned an unexpected response. Try again."] });
      }
    } catch {
      setVerdict({ accepted: false, reasons: ["Could not reach the screening service. Try again."] });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Band tone="dark" className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:64px_64px]"
        />
        <RouteShell className="relative">
          <SectionHeader eyebrow="Methodology screening" title="Screen a vendor methodology before ingest." description="Upload a text-based PDF and its vendor ID. We check that it is relevant, attributed, and safe to process." />
        </RouteShell>
      </Band>

      <Band tone="light">
        <RouteShell>

          <Surface className="mx-auto mt-8 max-w-3xl p-4 sm:p-6">
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Vendor ID" htmlFor="vendor" hint="Lowercase letters, numbers, and hyphens only.">
                <input
                  id="vendor"
                  name="vendor"
                  value={vendor}
                  onChange={(event) => setVendor(event.target.value.toLowerCase())}
                  placeholder="e.g. msci"
                  autoCapitalize="none"
                  autoComplete="off"
                  maxLength={24}
                  required
                  className={fieldControlClassName()}
                />
              </Field>
              <Field label="Methodology PDF" htmlFor="file" hint="Text-based PDF, checked before ingestion.">
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                  className={fieldControlClassName("py-3 file:mr-4 file:rounded-[4px] file:border-0 file:bg-muted file:px-3 file:py-1 file:font-medium file:text-foreground hover:file:bg-muted/80")}
                />
              </Field>
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-6 min-h-12 w-full px-5 py-3 text-base">
              <UploadIcon className="h-5 w-5" aria-hidden />
              {isSubmitting ? "Screening methodology…" : "Screen methodology"}
            </Button>
          </form>
          </Surface>

          {verdict && (
            <section
              aria-live="polite"
              className={`ca-surface mx-auto mt-6 max-w-2xl p-5 ${verdict.accepted ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"}`}
            >
              <div className="flex items-start gap-3">
                {verdict.accepted ? <CheckCircle2Icon className="mt-0.5 h-5 w-5 text-success" aria-hidden /> : <AlertTriangleIcon className="mt-0.5 h-5 w-5 text-destructive" aria-hidden />}
                <div>
                  <h2 className="ca-section-title">{verdict.accepted ? "Screening passed" : "Screening rejected"}</h2>
                  {verdict.accepted ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{verdict.note}</p>
                  ) : (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-destructive">
                      {verdict.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}

          <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
            A passed screen stores extracted text and proposes rules for review. Nothing reaches the curated rule set until a human approves it on the review page.
          </p>
          <p className="mt-3 text-sm"><Link className="font-medium text-accent underline-offset-4 hover:underline" href="/review">Review proposed rules</Link></p>
          <p className="mt-6 text-sm"><Link className="font-medium text-accent underline-offset-4 hover:underline" href="/">Back to corporate-action validation</Link></p>
        </RouteShell>
      </Band>
    </main>
  );
}
