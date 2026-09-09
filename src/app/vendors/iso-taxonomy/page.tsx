"use client";
import { useState } from "react";
import {
  FileTextIcon,
  NetworkIcon,
  SearchIcon,
  ChevronDownIcon,
  InfoIcon,
} from "lucide-react";
import Link from "next/link";

import { SurfaceSection } from "@/components/surface-section";
import { RouteShell } from "@/components/route-shell";
import { Band } from "@/components/ui/band";
import { Eyebrow } from "@/components/ui/design-system";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";

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
      <Band tone="dark">
        <RouteShell wide className="space-y-8">
          <SectionHeader
            eyebrow="ISO 20022 reference"
            title="Corporate action taxonomy"
            description="A universal mapping between ISO 20022 CAEV codes, SWIFT MT564 event types, and vendor-specific terminology used by MSCI, S&P DJI, FTSE Russell, STOXX, Solactive, Morningstar, and VettaFi."
          />
          <nav aria-label="Vendor reference" className="flex flex-wrap items-center gap-x-6 border-t border-border pt-2">
            <Link href="/vendors/" className="border-b-2 border-transparent px-1 py-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">Event taxonomy</Link>
            <Link href="/vendors/iso-taxonomy/" aria-current="page" className="flex items-center gap-2 border-b-2 border-primary px-1 py-3 text-xs font-medium text-primary">
              <NetworkIcon aria-hidden className="h-3.5 w-3.5" />
              ISO CAEV Taxonomy
            </Link>
            <Link href="/vendors/event-extraction/" className="flex items-center gap-2 border-b-2 border-transparent px-1 py-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <FileTextIcon aria-hidden className="h-3.5 w-3.5" />
              Event Parameters
            </Link>
          </nav>
        </RouteShell>
      </Band>

      <Band tone="light" className="min-h-screen">
      <RouteShell wide className="space-y-8">
        <SurfaceSection padding="tight" className="space-y-8">

        {/* How to Read + Quick Nav */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Surface className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <InfoIcon aria-hidden className="h-4 w-4 text-foreground" />
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
          </Surface>
          <Surface className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <SearchIcon aria-hidden className="h-4 w-4 text-foreground" />
              <h3 className="text-sm font-semibold">Quick Filters</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Dividend", "Spin-off", "Rights", "Merger", "Split"].map((f) => (
                <button
                  key={f}
                  onClick={() => setSearch(f)}
                  className="border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {f}
                </button>
              ))}
            </div>
          </Surface>
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, ISO codes, or vendor terms..."
            className="ca-control pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
          <div className="mb-4 flex items-center justify-between">
            <Eyebrow>Master mapping table</Eyebrow>
            <span className="text-xs text-muted-foreground">{filtered.length} events</span>
          </div>
          <div className="hidden overflow-hidden border border-border md:block">
              <table className="w-full table-fixed text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="w-32 break-words px-2 py-2 text-left font-semibold text-muted-foreground">Event</th>
                    <th className="w-16 break-words px-1.5 py-2 text-center font-semibold text-muted-foreground">ISO CAEV</th>
                    <th className="w-24 break-words px-1.5 py-2 text-center font-semibold text-muted-foreground">SWIFT MT564</th>
                    {VENDORS.map((v) => (
                      <th key={v} className="break-words px-1.5 py-2 text-center font-semibold text-muted-foreground">
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
                        className={`cursor-pointer border-b border-border/40 transition-colors ${
                          isHighlighted ? "bg-primary/10" : i % 2 === 0 ? "bg-card" : "bg-muted/5"
                        }`}
                        onClick={() =>
                          setSelectedCategory(isHighlighted ? "" : row.masterCategory)
                        }
                      >
                        <td className="break-words px-2 py-2 align-top font-medium text-foreground">{row.masterCategory}</td>
                        <td className="px-1.5 py-2 text-center align-top">
                          <span className="inline-flex items-center border border-border px-1.5 py-0.5 text-[10px] font-mono font-semibold text-foreground">
                            {row.isoCAEV}
                          </span>
                        </td>
                        <td className="break-words px-1.5 py-2 text-center text-[10px] text-muted-foreground">{row.swiftMT564}</td>
                        {[
                          row.msci, row.spdj, row.ftse, row.stoxx,
                          row.solactive, row.morningstar, row.vettafi,
                        ].map((val, j) => (
                          <td
                            key={j}
                            className={`break-words px-1.5 py-2 text-center text-muted-foreground ${
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
          <div className="grid gap-2 md:hidden">
            {filtered.map((row) => {
              const isHighlighted = selectedCategory === row.masterCategory;
              const vendors = [
                ["MSCI", row.msci], ["S&P DJI", row.spdj], ["FTSE Russell", row.ftse],
                ["STOXX", row.stoxx], ["Solactive", row.solactive], ["Morningstar", row.morningstar], ["VettaFi", row.vettafi],
              ] as const;
              return (
                <Surface
                  key={row.masterCategory}
                  className={`cursor-pointer p-3 transition-colors ${isHighlighted ? "border-primary" : "hover:border-primary"}`}
                  onClick={() => setSelectedCategory(isHighlighted ? "" : row.masterCategory)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words text-sm font-medium">{row.masterCategory}</p>
                    <span className="shrink-0 border border-border px-1.5 py-0.5 font-mono text-[10px] font-semibold">{row.isoCAEV}</span>
                  </div>
                  <p className="ca-meta mt-2 break-words">{row.swiftMT564}</p>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                    {vendors.map(([vendor, value]) => (
                      <div key={vendor} className="min-w-0 border-t border-border pt-2">
                        <p className="ca-meta">{vendor}</p>
                        <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </Surface>
              );
            })}
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
          {showCAEV && <div className="overflow-hidden">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CAEV_CODES.map((item) => (
                <div key={item.code} className="ca-surface p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="border border-border px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
                      {item.code}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{item.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>}
        </div>

        {/* SWIFT MT564 Reference */}
        <Surface className="p-6">
          <SectionHeader
            titleAs="h2"
            eyebrow="Wire reference"
            title="SWIFT MT564 reference"
            description={<>The MT564 Corporate Action Notification is the standard SWIFT message that carries corporate action events across the industry. Sequence A field <span className="font-mono text-accent">22F</span> contains the CAEV (Corporate Action Event) code — the bridge between the wire format and vendor terminology.</>}
          />
          <div className="mt-6 border border-border bg-muted p-3 font-mono text-[11px] leading-loose text-muted-foreground">
            <div>:20C: Reference</div>
            <div>:22F:  <span className="text-accent">CAEV — DVCA</span> ← event type code</div>
            <div>:35B:  ISIN/US1234567890</div>
            <div>:98C:  EXDT/200101</div>
            <div>:36B:  ELIG/UNIT/1000</div>
            <div>:70E:  ADDB/OFFEROR/ACME CORP</div>
          </div>
        </Surface>
        </SurfaceSection>
      </RouteShell>
      </Band>
    </div>
  );
}
