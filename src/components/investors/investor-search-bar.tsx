"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
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
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="investor-ticker" className="mb-2 block text-sm font-medium text-foreground">
          Ticker symbol
        </label>
        <input
          id="investor-ticker"
          name="ticker"
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="e.g. AAPL, MSFT, BRK-B"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none ring-primary/40 transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 disabled:opacity-50"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || loading || !value.trim()}
        className="inline-flex h-12 min-w-[120px] shrink-0 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
      >
        {loading ? "Loading…" : "Search"}
      </button>
    </form>
  );
}
