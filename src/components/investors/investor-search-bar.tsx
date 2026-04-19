"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";

import type { InvestorSearchResult } from "@/lib/investors/types";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (symbol: string) => void;
  loading: boolean;
  disabled?: boolean;
}

export function InvestorSearchBar({
  value,
  onChange,
  onSubmit,
  loading,
  disabled,
}: Props) {
  const listboxId = useId();
  const [results, setResults] = useState<InvestorSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const trimmed = useMemo(() => value.trim(), [value]);

  useEffect(() => {
    if (trimmed.length < 1) {
      return;
    }
    const t = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSearching(true);
      try {
        const res = await fetch(
          `/api/investors/search/?q=${encodeURIComponent(trimmed)}`,
          { signal: ctrl.signal, cache: "no-store" },
        );
        if (!res.ok) throw new Error("search failed");
        const json = (await res.json()) as { results: InvestorSearchResult[] };
        setResults(json.results ?? []);
        setOpen(true);
        setHighlight((json.results?.length ?? 0) > 0 ? 0 : -1);
      } catch {
        // abort or network error — silent
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => window.clearTimeout(t);
  }, [trimmed]);

  function handleChange(next: string) {
    onChange(next);
    setHighlight(-1);
    if (next.trim().length < 1) {
      setResults([]);
      setOpen(false);
    }
  }

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClickAway);
    return () => window.removeEventListener("mousedown", onClickAway);
  }, []);

  function pick(result: InvestorSearchResult) {
    onChange(result.symbol);
    setOpen(false);
    onSubmit(result.symbol);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmit(trimmed);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[highlight] ?? results[0];
      if (r) pick(r);
      else onSubmit(trimmed);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const r = results[highlight];
          if (open && r) pick(r);
          else onSubmit(trimmed);
        }}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="investor-ticker" className="mb-2 block text-sm font-medium text-foreground">
            Search a ticker or company
          </label>
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="investor-ticker"
              name="ticker"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. Apple, AAPL, 0005.HK, 7203.T, VOD.L"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setOpen(true);
              }}
              onKeyDown={handleKeyDown}
              disabled={disabled || loading}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open && results.length > 0}
              aria-controls={listboxId}
              aria-haspopup="listbox"
              aria-activedescendant={
                open && highlight >= 0 && results[highlight]
                  ? `${listboxId}-opt-${highlight}`
                  : undefined
              }
              className="h-12 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-base text-foreground outline-none ring-primary/40 transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 disabled:opacity-50"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={disabled || loading || !trimmed}
          className="inline-flex h-12 min-w-[120px] shrink-0 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
        >
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      {open && (results.length > 0 || searching) && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 sm:right-[128px] top-full z-30 mt-2 max-h-80 overflow-auto rounded-xl border border-border bg-popover p-1 shadow-xl"
        >
          {searching && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
          )}
          {results.map((r, i) => (
            <li
              id={`${listboxId}-opt-${i}`}
              key={`${r.symbol}-${i}`}
              role="option"
              aria-selected={highlight === i}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              className={
                "cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors " +
                (highlight === i
                  ? "bg-muted text-foreground"
                  : "text-foreground hover:bg-muted/70")
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="font-mono text-sm font-semibold">{r.symbol}</span>
                {r.quoteType && (
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {r.quoteType}
                  </span>
                )}
              </div>
              {r.name && (
                <div className="truncate text-xs text-muted-foreground">
                  {r.name}
                </div>
              )}
              {(r.exchange || r.sector) && (
                <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                  {r.exchange && <span>{r.exchange}</span>}
                  {r.sector && <span>· {r.sector}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
