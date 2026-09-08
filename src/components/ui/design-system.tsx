import type { HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type BandTone = "dark" | "light";

export function Band({
  children,
  tone = "dark",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { tone?: BandTone }) {
  return (
    <section className={cn("ca-band", tone === "light" ? "ca-band-light" : "ca-band-dark", className)} {...props}>
      {children}
    </section>
  );
}

export function Surface({
  children,
  className,
  as: Comp = "div",
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "div" | "article" | "section" | "main" }) {
  return (
    <Comp className={cn("ca-surface", className)} {...props}>
      {children}
    </Comp>
  );
}

export function Eyebrow({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("ca-eyebrow", className)} {...props}>
      {children}
    </p>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("ca-section-header", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="ca-display-title">{title}</h1>
      {description && <p className="ca-body-copy mt-4 max-w-prose">{description}</p>}
    </header>
  );
}

type FieldControlProps = InputHTMLAttributes<HTMLInputElement> | SelectHTMLAttributes<HTMLSelectElement> | TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="ca-label">{label}</label>
      {children}
      {error ? <p id={errorId} className="ca-field-error" role="alert">{error}</p> : hint ? <p id={hintId} className="ca-meta">{hint}</p> : null}
    </div>
  );
}

export function fieldControlClassName(className?: string) {
  return cn("ca-control", className);
}

export function DataRow({
  label,
  value,
  meta,
  children,
  className,
}: {
  label: ReactNode;
  value?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ca-data-row", className)}>
      <div className="min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        {meta && <p className="ca-meta mt-1">{meta}</p>}
      </div>
      {children ?? <div className="min-w-0 text-right text-sm text-foreground">{value}</div>}
    </div>
  );
}

export type StatusTone = "positive" | "warning" | "negative" | "neutral" | "info";

export function StatusDot({
  tone = "neutral",
  label,
  className,
}: {
  tone?: StatusTone;
  label: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("ca-status", `ca-status-${tone}`, className)}>
      <span className="ca-status-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export type { FieldControlProps };
