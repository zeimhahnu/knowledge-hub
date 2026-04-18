import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared outer shell: large radius, soft gradient, hairline ring (simulator aesthetic). */
export const surfaceOuterClass =
  "rounded-[2rem] border border-white/10 bg-gradient-to-br from-card/95 via-card/90 to-primary/5 ring-1 ring-white/5";

const paddingClasses = {
  comfortable: "p-6 sm:p-8 md:p-10",
  compact: "p-6 sm:p-8",
  tight: "p-5 sm:p-8",
} as const;

const shadowClasses = {
  section: "shadow-xl",
  elevated: "shadow-2xl shadow-black/25",
} as const;

export type SurfaceSectionPadding = keyof typeof paddingClasses;
export type SurfaceSectionShadow = keyof typeof shadowClasses;

type SurfaceSectionProps = {
  children: ReactNode;
  className?: string;
  padding?: SurfaceSectionPadding;
  shadow?: SurfaceSectionShadow;
};

export function SurfaceSection({
  children,
  className,
  padding = "compact",
  shadow = "section",
}: SurfaceSectionProps) {
  return (
    <div
      className={cn(
        surfaceOuterClass,
        paddingClasses[padding],
        shadowClasses[shadow],
        className,
      )}
    >
      {children}
    </div>
  );
}
