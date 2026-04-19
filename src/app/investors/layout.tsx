import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Investor intelligence — Index Vendor Intelligence",
  description:
    "Quick dividend, split, and calendar snapshot by ticker. Delayed market data for orientation only.",
};

export default function InvestorsLayout({ children }: { children: ReactNode }) {
  return children;
}
