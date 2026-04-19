"use client";

import { useState } from "react";
import { AlertTriangleIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  warnings: string[];
}

export function InvestorDataWarnings({ warnings }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (warnings.length === 0 || dismissed) return null;

  return (
    <div
      role="status"
      className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground"
    >
      <div className="flex gap-3">
        <AlertTriangleIcon
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium text-foreground">Data notes</p>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            {warnings.map((w) => (
              <li key={w} className="pl-0.5">
                {w}
              </li>
            ))}
          </ul>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss data notes"
        >
          <XIcon className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
