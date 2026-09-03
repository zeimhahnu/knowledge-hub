import type { Metadata } from "next";
import { LookupView } from "@/components/lookup/lookup-view";
import { canonicalEventById } from "@/lib/event-taxonomy";

/**
 * /lookup/[ticker] — the page that ties the P0 slices together (§7a).
 * Server shell: parses and validates the route + query params, then hands
 * the (interactive, localStorage-dependent) rendering to LookupView.
 * The user supplies the event — there is no detection step (§7a step 1).
 */

const TICKER_RE = /^[A-Za-z0-9.\-^=]{1,15}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

type LookupPageProps = {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: LookupPageProps): Promise<Metadata> {
  const { ticker: raw } = await params;
  const sp = await searchParams;
  const ticker = raw.trim().toUpperCase();
  const eventType = typeof sp.eventType === "string" ? sp.eventType.trim() : "";
  const name = eventType ? (canonicalEventById(eventType)?.name ?? eventType) : "corporate action";
  return {
    title: `${ticker} · ${name} — Corporate-Action Lookup`,
    description: `Vendor coverage matrix and news cross-validation for ${ticker} ${name}.`,
  };
}

function MissingParams({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-[2rem] border border-border bg-card/60 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>
      </div>
    </main>
  );
}

export default async function Page({ params, searchParams }: LookupPageProps) {
  const { ticker: raw } = await params;
  const sp = await searchParams;

  const ticker = raw.trim().toUpperCase();
  const eventType = typeof sp.eventType === "string" ? sp.eventType.trim() : "";
  const exDate = typeof sp.exDate === "string" ? sp.exDate.trim() : "";
  const company =
    typeof sp.company === "string" && sp.company.trim().length > 0
      ? sp.company.trim()
      : null;

  if (!TICKER_RE.test(ticker)) {
    return (
      <MissingParams
        title="Invalid ticker"
        body={`"${raw}" is not a valid ticker symbol. Use /lookup/[ticker]?eventType=...&exDate=YYYY-MM-DD.`}
      />
    );
  }
  if (!eventType) {
    return (
      <MissingParams
        title="Missing event type"
        body="Add ?eventType=... to the URL — e.g. ?eventType=cash-dividend&exDate=2026-09-30."
      />
    );
  }
  if (!isValidDate(exDate)) {
    return (
      <MissingParams
        title="Invalid ex-date"
        body={`"${exDate}" is not a valid date. Use YYYY-MM-DD — e.g. ?eventType=cash-dividend&exDate=2026-09-30.`}
      />
    );
  }

  return <LookupView ticker={ticker} eventType={eventType} exDate={exDate} company={company} />;
}
