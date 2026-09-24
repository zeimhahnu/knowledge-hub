/** Canonical vendor list — keep in sync with site copy and simulator UI. */
export const VENDOR_IDS = [
  "msci",
  "sp",
  "ftse",
  "stoxx",
  "solactive",
  "morningstar",
  "vettafi",
] as const;

export type VendorId = (typeof VENDOR_IDS)[number];

export const VENDOR_LABELS: Record<VendorId, string> = {
  msci: "MSCI",
  sp: "S&P DJI",
  ftse: "FTSE Russell",
  stoxx: "STOXX",
  solactive: "Solactive",
  morningstar: "Morningstar",
  vettafi: "VettaFi",
};

/** Fund-master `index_provider` spellings, one per vendor (check-fund-master holds them to one). */
export const PROVIDER_VENDOR: Record<string, VendorId> = {
  MSCI: "msci",
  "S&P Dow Jones Indices": "sp",
  "FTSE Russell": "ftse",
  STOXX: "stoxx",
  "Solactive AG": "solactive",
  Morningstar: "morningstar",
  VettaFi: "vettafi",
};

export function vendorLabel(id: VendorId): string {
  return VENDOR_LABELS[id];
}

export const VENDOR_ABBR: Record<VendorId, string> = {
  msci: "MSI",
  sp: "SPX",
  ftse: "FTB",
  stoxx: "STX",
  solactive: "SOL",
  morningstar: "MRN",
  vettafi: "VTF",
};

export function vendorAbbr(id: VendorId): string {
  return VENDOR_ABBR[id];
}
