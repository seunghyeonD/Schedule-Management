"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "캘린더", match: (p: string) => p === "/" },
  {
    href: "/stores",
    label: "매장",
    match: (p: string) => p.startsWith("/stores"),
  },
  {
    href: "/settings",
    label: "설정",
    match: (p: string) => p.startsWith("/settings"),
  },
];

export function DesktopNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="hidden items-center gap-1 text-sm sm:flex">
      {ITEMS.map((it) => {
        const active = it.match(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 font-medium transition ${
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
