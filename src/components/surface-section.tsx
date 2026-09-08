import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Compatibility wrapper for older lookup compositions; the visual grammar now lives in Surface. */
export const surfaceOuterClass = "ca-surface";

const paddingClasses = {
  comfortable: "p-6 sm:p-8 md:p-10",
  compact: "p-6 sm:p-8",
  tight: "p-5 sm:p-8",
} as const;

const shadowClasses = {
  section: "",
  elevated: "",
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
