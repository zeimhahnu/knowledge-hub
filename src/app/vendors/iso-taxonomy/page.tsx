"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  NetworkIcon,
  SearchIcon,
  ChevronDownIcon,
  InfoIcon,
} from "lucide-react";
import Link from "next/link";

type EventRow = {
  masterCategory: string;
  isoCAEV: string;
  swiftMT564: string;
  msci: string;
  spdj: string;
  ftse: string;
  stoxx: string;
  solactive: string;
  morningstar: string;
  vettafi: string;
};

const MASTER_TABLE: EventRow[] = [
  {
    masterCategory: "Cash Dividend (Regular)",
    isoCAEV: "DVOP",
    swiftMT564: "NEWM (Dividend)",
    msci: "Cash Dividend",
    spdj: "Dividend (Cash)",
    ftse: "Ordinary Dividend",
    stoxx: "Cash Dividend",
    solactive: "Cash Distribution",
    morningstar: "Ordinary Dividend",
    vettafi: "Cash Dividend",
  },
  {
    masterCategory: "Special Cash Dividend",
    isoCAEV: "DVOP",
    swiftMT564: "NEWM (Dividend)",
    msci: "Special Cash Dividend",
    spdj: "Special Dividend",
    ftse: "Special Dividend",
    stoxx: "Special Cash Dividend",
    solactive: "Special Cash Distribution",
    morningstar: "Special Dividend",
    vettafi: "Special Dividend",
  },
  {
    masterCategory: "Stock Dividend / Bonus Issue",
    isoCAEV: "BONU",
    swiftMT564: "NEWM (Bonus Issue)",
    msci: "Stock Dividend / Bonus Issue",
    spdj: "Stock Dividend",
    ftse: "Scrip Issue / Stock Distribution",
    stoxx: "Stock Dividend",
    solactive: "Stock Distribution",
    morningstar: "Stock Dividend / Bonus Issue",
    vettafi: "Stock Dividend",
  },
  {
    masterCategory: "Spin-off / Demerger",
    isoCAEV: "SPIN",
    swiftMT564: "NEWM (Spin-off)",
    msci: "Spin-off",
    spdj: "Spin-off",
    ftse: "Demerger",
    stoxx: "Spin-off",
    solactive: "Spin-off",
    morningstar: "Spin-off",
    vettafi: "Spin-off",
  },
  {
    masterCategory: "Rights Issue",
    isoCAEV: "RHDI",
    swiftMT564: "NEWM (Rights Issue)",
    msci: "Rights Issue",
    spdj: "Rights Offering",
    ftse: "Rights Issue / Entitlement Offer",
    stoxx: "Rights Offering",
    solactive: "Rights Issue",
    morningstar: "Rights Offering",
    vettafi: "Rights Issue",
  },
  {
    masterCategory: "Share Consolidation / Reverse Split",
    isoCAEV: "CONS / SPLT",
    swiftMT564: "NEWM (Stock Split / Consolidation)",
    msci: "Split / Reverse Split",
    spdj: "Stock Split / Consolidation",
    ftse: "Split (Sub-division) / Reverse Split",
    stoxx: "Split and Reverse Split",
    solactive: "Share Split / Reverse Split",
    morningstar: "Stock Split / Reverse Stock Split",
    vettafi: "Split / Reverse Split",
  },
  {
    masterCategory: "Return of Capital",
    isoCAEV: "REDU",
    swiftMT564: "NEWM (Reduction of Capital)",
    msci: "Return of Capital",
    spdj: "Return of Capital",
    ftse: "Capital Repayment",
    stoxx: "Return of Capital and Share Consolidation",
    solactive: "Capital Return",
    morningstar: "Return of Capital",
    vettafi: "Return of Capital",
  },
  {
    masterCategory: "Merger & Acquisition (Target)",
    isoCAEV: "MRGR",
    swiftMT564: "NEWM (Merger)",
    msci: "Merger & Acquisition",
    spdj: "Merger & Acquisition",
    ftse: "Merger and Acquisition",
    stoxx: "Merger and Takeover",
    solactive: "Merger & Acquisition",
    morningstar: "Merger and Acquisition",
    vettafi: "M&A",
  },
  {
    masterCategory: "Tender Offer",
    isoCAEV: "TEND",
    swiftMT564: "NEWM (Tender Offer)",
    msci: "Tender Offer",
    spdj: "Tender Offer",
    ftse: "Tender Offer",
    stoxx: "(handled via M&A)",
    solactive: "Tender Offer",
    morningstar: "Tender Offer",
    vettafi: "Tender Offer",
  },
  {
    masterCategory: "Delisting / Bankruptcy",
    isoCAEV: "DELI / BANK",
    swiftMT564: "NEWM (Delisting / Bankruptcy)",
    msci: "Delisting / Bankruptcy",
    spdj: "Bankruptcy / Liquidation",
    ftse: "Delisting / Bankruptcy",
    stoxx: "Delisting / Bankruptcy / Insolvency",
    solactive: "Delisting",
    morningstar: "Bankruptcy / Delisting / Liquidation",
    vettafi: "Delisting / Bankruptcy",
  },
  {
    masterCategory: "Stock Split",
    isoCAEV: "SPLT",
    swiftMT564: "NEWM (Stock Split)",
    msci: "Stock Split",
    spdj: "Stock Split",
    ftse: "Ordinary Splits (sub-division)",
    stoxx: "Split and Reverse Split",
    solactive: "Share Split",
    morningstar: "Stock Split",
    vettafi: "Stock Split",
  },
  {
    masterCategory: "Return of Cash (Non-Dividend)",
    isoCAEV: "REDU",
    swiftMT564: "NEWM (Other)",
    msci: "Return of Capital",
    spdj: "Return of Capital",
    ftse: "Capital Repayment",
    stoxx: "Return of Capital",
    solactive: "Cash Distribution",
    morningstar: "Return of Capital",
    vettafi: "Return of Capital",
  },
  {
    masterCategory: "IPO / Direct Listing",
    isoCAEV: "IPOO",
    swiftMT564: "NEWM (Initial Public Offer)",
    msci: "IPO",
    spdj: "IPO / Direct Listing",
    ftse: "IPO",
    stoxx: "IPO",
    solactive: "IPO",
    morningstar: "IPO",
    vettafi: "IPO",
  },
  {
    masterCategory: "Scrip Dividend",
    isoCAEV: "SCRP",
    swiftMT564: "NEWM (Scrip Dividend)",
    msci: "Scrip Dividend",
    spdj: "Scrip Dividend",
    ftse: "Scrip Issue",
    stoxx: "Stock Dividend",
    solactive: "Scrip Dividend",
    morningstar: "Scrip Dividend",
    vettafi: "Scrip Dividend",
  },
  {
    masterCategory: "Warrant / Option",
    isoCAEV: "WARI",
    swiftMT564: "NEWM (Warrant)",
    msci: "Warrant / Option",
    spdj: "Warrant / Option",
    ftse: "(not separately classified)",
    stoxx: "(treated as ineligible)",
    solactive: "Warrant",
    morningstar: "Warrant / Option",
    vettafi: "Warrant",
  },
  {
    masterCategory: "Partial Tender / Buyback",
    isoCAEV: "OFFO / BUTF",
    swiftMT564: "NEWM (Buyback)",
    msci: "Partial Tender Offer / Buyback",
    spdj: "Tender Offer / Buyback",
    ftse: "Compulsory Partial Tender / Buyback",
    stoxx: "Repurchase of Shares / Self-Tender",
    solactive: "Share Repurchase",
    morningstar: "Buyback",
    vettafi: "Buyback",
  },
];

const CAEV_CODES = [
  { code: "BONU", name: "Bonus Issue", desc: "Shares issued to shareholders at no charge, pro-rata" },
  { code: "CAPG", name: "Capital Gains Distribution", desc: "Fund's distribution of realized capital gains" },
  { code: "CONS", name: "Consolidation / Reverse Split", desc: "Reduction of number of shares via merging" },
  { code: "DELI", name: "Delisting", desc: "Removal of security from official exchange" },
  { code: "DIVT", name: "Dividend", desc: "Periodic distribution from earnings" },
  { code: "DRIP", name: "Dividend Reinvestment", desc: "Dividend reinvested via purchase of additional shares" },
  { code: "DVOP", name: "Dividend Option", desc: "Shareholder choice between cash or stock dividend" },
  { code: "EXAM", name: "Mandatory Amendment", desc: "Forced change to terms of an event" },
  { code: "EXWA", name: "Exercise Warrant", desc: "Conversion of warrants into shares" },
  { code: "FRCL", name: "Freely Liquidable", desc: "Change in free float classification" },
  { code: "HLDR", name: "Holder Election", desc: "Election event triggered by security holder" },
  { code: "INTR", name: "Interest Payment", desc: "Payment of interest on debt securities" },
  { code: "IPOO", name: "Initial Public Offering", desc: "First time security offered to public" },
  { code: "LIQU", name: "Liquidation", desc: "Winding up of company, distribution of assets" },
  { code: "MRGR", name: "Merger", desc: "Two entities combine into one" },
  { code: "OVLS", name: "Oversubscription", desc: "Right to purchase additional shares beyond entitlement" },
  { code: "PAYS", name: "Payment", desc: "General payment instruction" },
  { code: "PCAL", name: "Partial Call", desc: "Redemption of part of a security issue" },
  { code: "REDU", name: "Return of Capital", desc: "Distribution of capital back to shareholders" },
  { code: "RHDI", name: "Rights Issue", desc: "Right to subscribe for new shares at discount" },
  { code: "SHOP", name: "Stock Purchase", desc: "Open market share repurchase" },
  { code: "SOLI", name: "Solicitation", desc: "Solicitation of proxies or acceptances" },
  { code: "SPLT", name: "Stock Split", desc: "Division of existing shares into more shares" },
  { code: "SPIN", name: "Spin-off", desc: "Separation of company business units" },
  { code: "SUSP", name: "Suspension", desc: "Trading halt or pause" },
  { code: "TEND", name: "Tender Offer", desc: "Public offer to buy shares at premium" },
  { code: "WTRN", name: "Written News", desc: "Mandatory notification of an event" },
  { code: "BUTF", name: "Mandatory Buyback Offer", desc: "Mandatory buyback offer" },
  { code: "OFFO", name: "Offer For Sale", desc: "Public sale of shares to market" },
];

const VENDORS = ["MSCI", "S&P DJI", "FTSE Russell", "STOXX", "Solactive", "Morningstar", "VettaFi"];

const VENDOR_COLORS: Record<string, string> = {
  MSCI: "text-blue-400",
  "S&P DJI": "text-blue-300",
  "FTSE Russell": "text-teal-400",
  STOXX: "text-cyan-400",
  Solactive: "text-indigo-400",
  Morningstar: "text-purple-400",
  VettaFi: "text-pink-400",
};

export default function IsoTaxonomyPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCAEV, setShowCAEV] = useState(false);

  const filtered = MASTER_TABLE.filter(
    (row) =>
      search === "" ||
      row.masterCategory.toLowerCase().includes(search.toLowerCase()) ||
      row.isoCAEV.toLowerCase().includes(search.toLowerCase()) ||
      VENDORS.some(
        (v) =>
          (row as Record<string, string>)[v.toLowerCase().replace(" ", "")]?.toLowerCase().includes(search.toLowerCase())
      )
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/vendors/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Index Vendor Intelligence</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <NetworkIcon className="h-3.5 w-3.5 text-primary" />
              <span>ISO CAEV Taxonomy</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-card/95 via-card/90 to-primary/5 p-5 shadow-xl ring-1 ring-white/5 sm:p-8 space-y-8">
        {/* Hero */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-background p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex shrink-0 w-14 h-14 rounded-2xl bg-primary/20 items-center justify-center">
              <NetworkIcon className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                ISO 20022 Corporate Action Taxonomy
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                A universal mapping between ISO 20022 CAEV codes, SWIFT MT564 event types, and vendor-specific terminology used by MSCI, S&amp;P DJI, FTSE Russell, STOXX, Solactive, Morningstar, and VettaFi.
              </p>
            </div>
          </div>
        </div>

        {/* How to Read + Quick Nav */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <InfoIcon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">How to Use This Page</h3>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">→</span>
                Search the table below by event name or ISO code
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">→</span>
                Click any row to filter CAEV codes to that event
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">→</span>
                Each vendor row shows exactly how they label the event
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">→</span>
                CAEV codes are the SWIFT standard — your MT564 feed uses these
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <SearchIcon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Quick Filters</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Dividend", "Spin-off", "Rights", "Merger", "Split"].map((f) => (
                <button
                  key={f}
                  onClick={() => setSearch(f)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, ISO codes, or vendor terms..."
            className="w-full rounded-xl border border-border bg-card pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Master Mapping Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Master Mapping Table</h2>
            <span className="text-xs text-muted-foreground">{filtered.length} events</span>
          </div>
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Event</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">ISO CAEV</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">SWIFT MT564</th>
                    {VENDORS.map((v) => (
                      <th key={v} className={`px-3 py-3 text-center font-semibold whitespace-nowrap ${VENDOR_COLORS[v] || "text-foreground"}`}>
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const isHighlighted = selectedCategory === row.masterCategory;
                    return (
                      <tr
                        key={i}
                        className={`border-b border-border/40 cursor-pointer transition-colors ${
                          isHighlighted ? "bg-primary/10" : i % 2 === 0 ? "bg-card" : "bg-muted/5"
                        }`}
                        onClick={() =>
                          setSelectedCategory(isHighlighted ? "" : row.masterCategory)
                        }
                      >
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{row.masterCategory}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-primary">
                            {row.isoCAEV}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-muted-foreground text-[10px]">{row.swiftMT564}</td>
                        {[
                          row.msci, row.spdj, row.ftse, row.stoxx,
                          row.solactive, row.morningstar, row.vettafi,
                        ].map((val, j) => (
                          <td
                            key={j}
                            className={`px-3 py-3 text-center text-muted-foreground ${
                              val.includes("not separately") || val.includes("ineligible") || val.includes("handled via")
                                ? "text-muted-foreground/50 italic"
                                : ""
                            }`}
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CAEV Codes */}
        <div>
          <button
            onClick={() => setShowCAEV(!showCAEV)}
            className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showCAEV ? "rotate-180" : ""}`} />
            All ISO 20022 CAEV Codes
          </button>
          <motion.div
            initial={false}
            animate={{ height: showCAEV ? "auto" : 0, opacity: showCAEV ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {CAEV_CODES.map((item) => (
                <motion.div
                  key={item.code}
                  initial={false}
                  animate={{ opacity: showCAEV ? 1 : 0 }}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-full">
                      {item.code}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{item.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* SWIFT MT564 Reference */}
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-400 text-[10px] font-bold">MT</span>
            </div>
            <h3 className="text-sm font-semibold text-blue-400">SWIFT MT564 Reference</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            The MT564 Corporate Action Notification is the standard SWIFT message that carries corporate action events across the industry. Sequence A field <span className="font-mono text-blue-400">22F</span> contains the CAEV (Corporate Action Event) code — the bridge between the wire format and vendor terminology.
          </p>
          <div className="rounded-xl bg-black/20 p-3 font-mono text-[11px] text-muted-foreground leading-loose">
            <div>:20C: Reference</div>
            <div>:22F:  <span className="text-blue-400">CAEV — DVCA</span> ← event type code</div>
            <div>:35B:  ISIN/US1234567890</div>
            <div>:98C:  EXDT/200101</div>
            <div>:36B:  ELIG/UNIT/1000</div>
            <div>:70E:  ADDB/OFFEROR/ACME CORP</div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
