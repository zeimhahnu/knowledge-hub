"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "lucide-react";
import { useState } from "react";

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
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3 text-sm sm:px-6 lg:px-8"
      >
        <Link href="/" className="shrink-0 font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Index Vendor Intelligence</Link>
        <div className="hidden items-center gap-x-5 sm:flex">
          {links.map((link) => <NavLink key={link.href} link={link} pathname={pathname} />)}
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
          aria-expanded={open}
          aria-controls="mobile-primary-navigation"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <XIcon aria-hidden className="h-5 w-5" /> : <MenuIcon aria-hidden className="h-5 w-5" />}
        </button>
      </nav>
      <div id="mobile-primary-navigation" className={`${open ? "grid" : "hidden"} border-t border-border px-4 py-2 sm:hidden`}>
        {links.map((link) => <NavLink key={link.href} link={link} pathname={pathname} onNavigate={() => setOpen(false)} />)}
      </div>
    </header>
  );
}

function NavLink({
  link,
  pathname,
  onNavigate,
}: {
  link: (typeof links)[number];
  pathname: string;
  onNavigate?: () => void;
}) {
  const current = link.matches(pathname);
  return (
    <Link
      href={link.href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      className={`rounded-md px-2 py-2 font-medium outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring ${current ? "text-foreground" : "text-muted-foreground"}`}
    >
      {link.label}
    </Link>
  );
}
