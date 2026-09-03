"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertTriangleIcon, CheckCircle2Icon, UploadIcon } from "lucide-react";

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
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:64px_64px]"
        />
        <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
              <UploadIcon className="h-4 w-4 text-primary" aria-hidden />
              Methodology screening
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Screen a vendor methodology before ingest.</h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Upload a text-based PDF and its vendor ID. We check that it is relevant, attributed, and safe to process.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-6"
            noValidate
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="vendor" className="mb-2 block text-sm font-semibold">Vendor ID</label>
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
                  className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  aria-describedby="vendor-help"
                />
                <p id="vendor-help" className="mt-2 text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
              </div>
              <div>
                <label htmlFor="file" className="mb-2 block text-sm font-semibold">Methodology PDF</label>
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                  className="block min-h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1 file:font-medium file:text-foreground hover:file:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UploadIcon className="h-5 w-5" aria-hidden />
              {isSubmitting ? "Screening methodology…" : "Screen methodology"}
            </button>
          </form>

          {verdict && (
            <section
              aria-live="polite"
              className={`mx-auto mt-6 max-w-2xl rounded-2xl border p-5 ${verdict.accepted ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"}`}
            >
              <div className="flex items-start gap-3">
                {verdict.accepted ? <CheckCircle2Icon className="mt-0.5 h-5 w-5 text-success" aria-hidden /> : <AlertTriangleIcon className="mt-0.5 h-5 w-5 text-destructive" aria-hidden />}
                <div>
                  <h2 className="font-semibold">{verdict.accepted ? "Screening passed" : "Screening rejected"}</h2>
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
            Screening does not store, publish, or queue your document. A passed screen only confirms that the file is eligible for the next, not-yet-configured ingest step.
          </p>
          <p className="mt-6 text-center text-sm"><Link className="font-medium text-primary underline-offset-4 hover:underline" href="/">Back to corporate-action validation</Link></p>
        </div>
      </section>
    </main>
  );
}
