"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/",
    label: "Home / Lookup",
    matches: (path: string) => path === "/" || path.startsWith("/lookup"),
  },
  { href: "/vendors/", label: "Vendors", matches: (path: string) => path.startsWith("/vendors") },
  { href: "/guide/", label: "Guide", matches: (path: string) => path.startsWith("/guide") },
  {
    href: "/settings/",
    label: "Coverage settings",
    matches: (path: string) => path.startsWith("/settings"),
  },
  { href: "/upload/", label: "Upload", matches: (path: string) => path.startsWith("/upload") },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm sm:px-6"
      >
        {links.map((link) => {
          const current = link.matches(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={`font-medium outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring ${
                current ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
