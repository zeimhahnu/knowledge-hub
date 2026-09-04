import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared responsive page gutter; wide is reserved for reference tables. */
export function RouteShell({
  children,
  className,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        wide ? "max-w-7xl" : "max-w-4xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
