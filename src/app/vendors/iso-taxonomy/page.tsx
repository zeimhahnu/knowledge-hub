"use client";
import { useState } from "react";
import {
  SearchIcon,
  ChevronDownIcon,
  InfoIcon,
} from "lucide-react";

import { SurfaceSection } from "@/components/surface-section";
import { RouteShell } from "@/components/route-shell";
import { Band } from "@/components/ui/band";
import { Eyebrow } from "@/components/ui/design-system";
import { VendorReferenceNav } from "@/components/vendor-reference-nav";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";

type EventRow = {
  masterCategory: string;
  isoCAEV: string;
  swiftMT564: string;
  sourceByVendor?: Partial<Record<VendorKey, string>>;
} & Record<VendorKey, string>;

type VendorKey = "msci" | "spdj" | "ftse" | "stoxx" | "solactive" | "morningstar" | "vettafi";

const VENDOR_COLUMNS: readonly { key: VendorKey; label: string }[] = [
  { key: "msci", label: "MSCI" },
  { key: "spdj", label: "S&P DJI" },
  { key: "ftse", label: "FTSE Russell" },
  { key: "stoxx", label: "STOXX" },
  { key: "solactive", label: "Solactive" },
  { key: "morningstar", label: "Morningstar" },
  { key: "vettafi", label: "VettaFi" },
];

const MASTER_TABLE: EventRow[] = [
  {
    masterCategory: "Cash Dividend (Regular)",
    isoCAEV: "DVCA",
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
    isoCAEV: "DVCA",
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
    isoCAEV: "DVSE / BONU",
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
    isoCAEV: "SOFF",
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
    isoCAEV: "RHTS",
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
    isoCAEV: "SPLR",
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
    isoCAEV: "CAPD",
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
    masterCategory: "Merger & Acquisition (Acquirer in Index)",
    isoCAEV: "MRGR",
    swiftMT564: "NEWM (Merger)",
    msci: "Acquisitions of Listed Non-Index Constituent Securities",
    spdj: "Acquirer acquires a private or non-index company",
    ftse: "Constituent acquires a non-constituent",
    stoxx: "Merger / Takeover (at least one component)",
    solactive: "Mergers & Acquisitions",
    morningstar: "Merger and Acquisition (no constituent-status branch)",
    vettafi: "Between Component Stocks",
    sourceByVendor: {
      msci: "msci-corporate-events-methodology-feb-2026.pdf §2.3.2",
      spdj: "sp-equity-indices-policies-practices.pdf, Mergers & Acquisitions",
      ftse: "ftse-russell-corporate-actions-guide.pdf §§4.10–4.11",
      stoxx: "stoxx-calculation-guide-apr-2026.pdf §8.3",
      solactive: "solactive-equity-index-methodology-v1.20-2026-06-16.pdf §2.1.7, pp.26–27",
      morningstar: "morningstar-corporate-action-methodology-2026.pdf, Mergers and Acquisitions pp.28–29",
      vettafi: "vettafi-index-maintenance-policy-v1.1.8-2026-05.pdf §2.1, pp.1–2",
    },
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
    isoCAEV: "DLST / BRUP",
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
    isoCAEV: "SPLF",
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
    isoCAEV: "CAPD",
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
    isoCAEV: "OTHR",
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
    masterCategory: "Primary Offering",
    isoCAEV: "OTHR",
    swiftMT564: "NEWM (Other)",
    msci: "Primary Offering",
    spdj: "Public Offering",
    ftse: "Primary Offering",
    stoxx: "Share-count change from a corporate action",
    solactive: "Corporate Action",
    morningstar: "Public / Secondary Offering",
    vettafi: "Share Offering",
    sourceByVendor: {
      msci: "msci-corporate-events-methodology-feb-2026.pdf §4.2",
      spdj: "sp-equity-indices-policies-practices.pdf, Non-Mandatory Share and IWF Updates",
      ftse: "ftse-russell-corporate-actions-guide.pdf §5.2",
      stoxx: "stoxx-calculation-guide-apr-2026.pdf §8.2",
      solactive: "solactive-equity-index-methodology-v1.20-2026-06-16.pdf §2.1, p.12",
      morningstar: "morningstar-corporate-action-methodology-2026.pdf, Corporate Action Category p.5",
      vettafi: "vettafi-index-maintenance-policy-v1.1.8-2026-05.pdf §4, p.2",
    },
  },
  {
    masterCategory: "Secondary Offering / Block Sale",
    isoCAEV: "OTHR",
    swiftMT564: "NEWM (Other)",
    msci: "Secondary Offering / Block Sale",
    spdj: "Public Offering (block sale / spot secondary)",
    ftse: "Secondary Offering",
    stoxx: "Share-count change from a corporate action",
    solactive: "Not separately named",
    morningstar: "Public / Secondary Offering",
    vettafi: "Share Offering",
    sourceByVendor: {
      msci: "msci-corporate-events-methodology-feb-2026.pdf §4.2",
      spdj: "sp-equity-indices-policies-practices.pdf, Accelerated Implementation",
      ftse: "ftse-russell-corporate-actions-guide.pdf §5.2",
      stoxx: "stoxx-calculation-guide-apr-2026.pdf §8.2",
      solactive: "solactive-equity-index-methodology-v1.20-2026-06-16.pdf §2.1, p.12",
      morningstar: "morningstar-corporate-action-methodology-2026.pdf, Corporate Action Category p.5",
      vettafi: "vettafi-index-maintenance-policy-v1.1.8-2026-05.pdf §4, p.2",
    },
  },
  {
    masterCategory: "Private Placement",
    isoCAEV: "OTHR",
    swiftMT564: "NEWM (Other)",
    msci: "Private Placement",
    spdj: "Private Placement",
    ftse: "Private Placement",
    stoxx: "Not separately named",
    solactive: "Not separately named",
    morningstar: "Private Placement",
    vettafi: "Share Offering",
    sourceByVendor: {
      msci: "msci-corporate-events-methodology-feb-2026.pdf §4.2",
      spdj: "sp-equity-indices-policies-practices.pdf, Non-Mandatory Share and IWF Updates",
      ftse: "ftse-russell-corporate-actions-guide.pdf §5, note 5",
      stoxx: "stoxx-calculation-guide-apr-2026.pdf §8.2 (no dedicated term)",
      solactive: "solactive-equity-index-methodology-v1.20-2026-06-16.pdf §2.1, p.12 (no dedicated term)",
      morningstar: "morningstar-corporate-action-methodology-2026.pdf, Corporate Action Category p.5",
      vettafi: "vettafi-index-maintenance-policy-v1.1.8-2026-05.pdf §4, p.2 (no dedicated term)",
    },
  },
  {
    masterCategory: "Forward Sale Agreement",
    isoCAEV: "OTHR",
    swiftMT564: "NEWM (Other)",
    msci: "Not named",
    spdj: "Forward Sales Agreements",
    ftse: "Not named",
    stoxx: "Not named",
    solactive: "Not named",
    morningstar: "Not named",
    vettafi: "Not named",
    sourceByVendor: {
      msci: "No dedicated term found in msci-corporate-events-methodology-feb-2026.pdf",
      spdj: "sp-equity-indices-policies-practices.pdf, U.S. and Canada accelerated rules p.15",
      ftse: "No dedicated term found in ftse-russell-corporate-actions-guide.pdf",
      stoxx: "No dedicated term found in stoxx-calculation-guide-apr-2026.pdf",
      solactive: "solactive-equity-index-methodology-v1.20-2026-06-16.pdf §2.1, p.12",
      morningstar: "No dedicated term found in morningstar-corporate-action-methodology-2026.pdf",
      vettafi: "vettafi-index-maintenance-policy-v1.1.8-2026-05.pdf §4, p.2",
    },
  },
  {
    masterCategory: "Scrip Dividend",
    isoCAEV: "DVSC",
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
    isoCAEV: "EXWA",
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
    isoCAEV: "BIDS",
    swiftMT564: "NEWM (Buyback)",
    msci: "Partial Tender Offer / Buyback",
    spdj: "Tender Offer / Buyback",
    ftse: "Compulsory Partial Tender / Buyback",
    stoxx: "Repurchase of Shares / Self-Tender",
    solactive: "Share Repurchase",
    morningstar: "Buyback",
    vettafi: "Buyback",
  },
  {
    masterCategory: "Share Buyback",
    isoCAEV: "BIDS / SHOP",
    swiftMT564: "NEWM (Buyback)",
    msci: "Share Buy-backs / Progressive Open-Market Buybacks",
    spdj: "Dutch Auction / Self-Tender Offer Buyback",
    ftse: "Compulsory Partial Tender / Buyback",
    stoxx: "Repurchase of Shares / Self-Tender",
    solactive: "Capital Decrease",
    morningstar: "Dutch Auctions / Buyback of Shares / Self-Tender Offer Buybacks",
    vettafi: "Share Buy-Backs",
    sourceByVendor: {
      msci: "msci-corporate-events-methodology-feb-2026.pdf §§2.4.1–2.4.3, 2.6.2, pp.14–15, 17",
      spdj: "sp-equity-indices-policies-practices.pdf, Non-Mandatory Share and IWF Updates p.14",
      ftse: "ftse-russell-corporate-actions-guide.pdf §4.8, pp.11–12",
      stoxx: "stoxx-calculation-guide-apr-2026.pdf §8.1.7, p.22",
      solactive: "solactive-equity-index-methodology-v1.20-2026-06-16.pdf §2.1.5, p.23",
      morningstar: "morningstar-corporate-action-methodology-2026.pdf, Nonmandatory Methodology p.37",
      vettafi: "vettafi-index-maintenance-policy-v1.1.8-2026-05.pdf §4, p.2",
    },
  },
];

const CAEV_CODES = [
  { code: "BONU", name: "Bonus Issue", desc: "Shares issued to shareholders at no charge, pro-rata" },
  { code: "CAPG", name: "Capital Gains Distribution", desc: "Fund's distribution of realized capital gains" },
  { code: "SPLR", name: "Reverse Stock Split / Consolidation", desc: "Reduction in the number of shares; CONS is Consent, not consolidation" },
  { code: "DLST", name: "Trading Status: Delisted", desc: "Removal of a security from an official exchange" },
  { code: "DVCA", name: "Cash Dividend", desc: "Cash distribution from earnings; covers ordinary and special cash dividends" },
  { code: "DRIP", name: "Dividend Reinvestment", desc: "Dividend reinvested via purchase of additional shares" },
  { code: "DVOP", name: "Dividend Option", desc: "Shareholder choice between cash or stock dividend" },
  { code: "EXAM", name: "Mandatory Amendment", desc: "Forced change to terms of an event" },
  { code: "EXWA", name: "Exercise Warrant", desc: "Conversion of warrants into shares" },
  { code: "FRCL", name: "Freely Liquidable", desc: "Change in free float classification" },
  { code: "HLDR", name: "Holder Election", desc: "Election event triggered by security holder" },
  { code: "INTR", name: "Interest Payment", desc: "Payment of interest on debt securities" },
  { code: "OTHR", name: "Other Event", desc: "Used where ISO defines no specific code, e.g. an IPO or a secondary offering" },
  { code: "LIQU", name: "Liquidation", desc: "Winding up of company, distribution of assets" },
  { code: "MRGR", name: "Merger", desc: "Two entities combine into one" },
  { code: "OVLS", name: "Oversubscription", desc: "Right to purchase additional shares beyond entitlement" },
  { code: "PAYS", name: "Payment", desc: "General payment instruction" },
  { code: "PCAL", name: "Partial Call", desc: "Redemption of part of a security issue" },
  { code: "CAPD", name: "Capital Distribution", desc: "Distribution of capital back to shareholders" },
  { code: "RHTS", name: "Rights Issue / Subscription Rights", desc: "Right to subscribe for new shares; RHDI is the intermediate-securities distribution stage" },
  { code: "SHOP", name: "Stock Purchase", desc: "Open market share repurchase" },
  { code: "SOLI", name: "Solicitation", desc: "Solicitation of proxies or acceptances" },
  { code: "SPLF", name: "Stock Split / Subdivision", desc: "Division of existing shares into more shares; SPLT is the Deadline to Split DATE qualifier, not an event" },
  { code: "SOFF", name: "Spin-Off", desc: "Separation of a business unit into a distinct entity" },
  { code: "SUSP", name: "Suspension", desc: "Trading halt or pause" },
  { code: "TEND", name: "Tender Offer", desc: "Public offer to buy shares at premium" },
  { code: "WTRN", name: "Written News", desc: "Mandatory notification of an event" },
  { code: "BIDS", name: "Repurchase Offer / Issuer Bid", desc: "Issuer offer to repurchase its own shares" },
  { code: "BRUP", name: "Bankruptcy", desc: "Insolvency proceedings; OFFO is the Offeror narrative qualifier on field 70a, not an event" },
];

export default function IsoTaxonomyPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCAEV, setShowCAEV] = useState(false);

  const filtered = MASTER_TABLE.filter(
    (row) =>
      search === "" ||
      row.masterCategory.toLowerCase().includes(search.toLowerCase()) ||
      row.isoCAEV.toLowerCase().includes(search.toLowerCase()) ||
      VENDOR_COLUMNS.some(({ key }) => row[key].toLowerCase().includes(search.toLowerCase()))
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
          <VendorReferenceNav current="iso" />
        </RouteShell>
      </Band>

      <Band tone="light" className="min-h-screen">
      <main>
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
                  className="min-h-11 border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
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
            name="taxonomyQuery"
            autoComplete="off"
            placeholder="Search events, ISO codes, or vendor terms…"
            className="ca-control ca-control-lead-icon pr-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 min-h-11 -translate-y-1/2 px-2 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring text-xs"
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
          {filtered.length === 0 ? (
            <p className="ca-surface border-dashed p-5 text-sm text-muted-foreground">
              No events match <span className="font-medium text-foreground">{search}</span>. Try an event name, CAEV code, or vendor term.
            </p>
          ) : <div className="hidden overflow-hidden border border-border md:block">
              <table className="w-full table-fixed text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="w-32 break-words px-2 py-2 text-left font-semibold text-muted-foreground">Event</th>
                    <th className="w-16 break-words px-1.5 py-2 text-center font-semibold text-muted-foreground">ISO CAEV</th>
                    <th className="w-24 break-words px-1.5 py-2 text-center font-semibold text-muted-foreground">SWIFT MT564</th>
                    {VENDOR_COLUMNS.map(({ key, label }) => (
                      <th key={key} className="break-words px-1.5 py-2 text-center font-semibold text-muted-foreground">
                        {label}
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
                        className={`cursor-pointer border-b border-border/40 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                          isHighlighted ? "bg-primary/10" : i % 2 === 0 ? "bg-card" : "bg-muted/5"
                        }`}
                        tabIndex={0}
                        role="button"
                        aria-pressed={isHighlighted}
                        onClick={() =>
                          setSelectedCategory(isHighlighted ? "" : row.masterCategory)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedCategory(isHighlighted ? "" : row.masterCategory);
                          }
                        }}
                      >
                        <td className="break-words px-2 py-2 align-top font-medium text-foreground">{row.masterCategory}</td>
                        <td className="px-1.5 py-2 text-center align-top">
                          <span className="inline-flex items-center border border-border px-1.5 py-0.5 text-[10px] font-mono font-semibold text-foreground">
                            {row.isoCAEV}
                          </span>
                        </td>
                        <td className="break-words px-1.5 py-2 text-center text-[10px] text-muted-foreground">{row.swiftMT564}</td>
                        {VENDOR_COLUMNS.map(({ key }) => (
                          <td
                            key={key}
                            className={`break-words px-1.5 py-2 text-center text-muted-foreground ${
                              row[key].toLowerCase().includes("not separately") || row[key].toLowerCase().includes("ineligible") || row[key].toLowerCase().includes("handled via") || row[key].toLowerCase() === "not named"
                                ? "text-muted-foreground/50 italic"
                                : ""
                            }`}
                          >
                            <div>{row[key]}</div>
                            {row.sourceByVendor?.[key] && (
                              <div className="mt-1 text-[9px] font-normal leading-tight text-muted-foreground/70">
                                Source: {row.sourceByVendor[key]}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          </div>}
          <div className="grid gap-2 md:hidden">
            {filtered.map((row) => {
              const isHighlighted = selectedCategory === row.masterCategory;
              const vendors = VENDOR_COLUMNS.map(({ key, label }) => [label, row[key], row.sourceByVendor?.[key]] as const);
              return (
                <button
                  type="button"
                  key={row.masterCategory}
                  className={`ca-surface w-full cursor-pointer p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${isHighlighted ? "border-primary" : "hover:border-primary"}`}
                  onClick={() => setSelectedCategory(isHighlighted ? "" : row.masterCategory)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words text-sm font-medium">{row.masterCategory}</p>
                    <span className="shrink-0 border border-border px-1.5 py-0.5 font-mono text-[10px] font-semibold">{row.isoCAEV}</span>
                  </div>
                  <p className="ca-meta mt-2 break-words">{row.swiftMT564}</p>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                    {vendors.map(([vendor, value, source]) => (
                      <div key={vendor} className="min-w-0 border-t border-border pt-2">
                        <p className="ca-meta">{vendor}</p>
                        <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">{value}</p>
                        {source && <p className="mt-1 break-words text-[9px] leading-tight text-muted-foreground/70">Source: {source}</p>}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CAEV Codes */}
        <div>
          <button
            type="button"
            onClick={() => setShowCAEV(!showCAEV)}
            className="mb-4 flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
            {/* Real MT564 wire syntax. The previous sample was not parseable: 22F was
                written as prose, the ex-date used the non-current EXDT qualifier with
                option C and a six-digit date, and an offeror narrative was placed under
                70E, which does not carry it. */}
            <div>:20C::CORP//REFERENCE123</div>
            <div>:22F::<span className="text-accent">{"CAEV//DVCA"}</span> ← event type code</div>
            <div>:35B:ISIN US1234567890</div>
            <div>:98A::<span className="text-accent">XDTE</span>{"//20260929"} ← ex-date</div>
            <div>:36B::ELIG//UNIT/1000,</div>
            <div>:70E::ADTX//ORDINARY CASH DIVIDEND</div>
          </div>
        </Surface>
        </SurfaceSection>
      </RouteShell>
      </main>
      </Band>
    </div>
  );
}
