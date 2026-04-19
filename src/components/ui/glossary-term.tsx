"use client";

import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";

interface Props {
  term: string;
  definition: string;
  children: React.ReactNode;
}

export function GlossaryTerm({ term, definition, children }: Props) {
  return (
    <Tippy
      content={
        <div className="max-w-[220px]">
          <p className="mb-1 text-[13px] font-semibold leading-tight text-white">
            {term}
          </p>
          <p className="text-[12px] leading-relaxed text-white/80">{definition}</p>
        </div>
      }
      placement="top"
      duration={200}
      delay={[200, 0]}
    >
      <span className="cursor-help border-b border-dotted border-muted-foreground/50">
        {children}
      </span>
    </Tippy>
  );
}
