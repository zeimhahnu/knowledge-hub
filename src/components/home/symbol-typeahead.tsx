"use client";

import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import type { SymbolSuggestion } from "@/lib/symbol-search";

type SymbolTypeaheadProps = {
  value: string;
  onChange: (value: string) => void;
};

type SearchResponse = { suggestions?: SymbolSuggestion[]; warning?: string };

export function SymbolTypeahead({ value, onChange }: SymbolTypeaheadProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (!query) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/symbols/?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as SearchResponse;
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error("Symbol search failed");
        setSuggestions(body.suggestions?.slice(0, 8) ?? []);
        setWarning(body.warning ?? null);
        setActiveIndex(-1);
        setIsOpen(true);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setSuggestions([]);
        setWarning("Ticker suggestions are temporarily unavailable. You can still enter a symbol directly.");
        setIsOpen(true);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function handleChange(nextValue: string) {
    onChange(nextValue);
    setSuggestions([]);
    setWarning(null);
    setActiveIndex(-1);
    setIsOpen(Boolean(nextValue.trim()));
  }

  function selectSuggestion(suggestion: SymbolSuggestion) {
    onChange(suggestion.symbol.toUpperCase());
    setSuggestions([]);
    setWarning(null);
    setActiveIndex(-1);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && isOpen && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  const activeDescendant = activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id="ticker"
        name="ticker"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => value.trim() && setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. AAPL or Tesco"
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={40}
        className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base font-medium uppercase outline-none transition-colors placeholder:normal-case placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-activedescendant={activeDescendant}
        aria-describedby="ticker-help"
      />
      {isOpen && (suggestions.length > 0 || warning) && (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {suggestions.length > 0 && (
            <ul id={listboxId} role="listbox" aria-label="Ticker suggestions" className="max-h-72 overflow-y-auto p-1">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.symbol}-${suggestion.exchange}`} id={`${listboxId}-${index}`} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`flex w-full items-baseline gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${index === activeIndex ? "bg-muted" : "hover:bg-muted/70"}`}
                  >
                    <span className="font-semibold">{suggestion.symbol}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">— {suggestion.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">({suggestion.exchange})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {warning && <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{warning}</p>}
        </div>
      )}
    </div>
  );
}
