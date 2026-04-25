"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDE_ON_PATHS = ["/login", "/onboarding", "/terms", "/privacy", "/auth"];

const ITEMS = [
  {
    href: "/",
    label: "캘린더",
    match: (p: string) => p === "/",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="4.5" width="18" height="16" rx="2" />
        <path d="M3 9.5h18" />
        <path d="M8 3v3" />
        <path d="M16 3v3" />
      </svg>
    ),
  },
  {
    href: "/stores",
    label: "매장",
    match: (p: string) => p.startsWith("/stores"),
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 9.5 5 5h14l1 4.5" />
        <path d="M4 9.5h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
        <path d="M4 9.5a3 3 0 0 0 6 0 3 3 0 0 0 4 0 3 3 0 0 0 6 0" />
        <path d="M9 20.5v-5h6v5" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "설정",
    match: (p: string) => p.startsWith("/settings"),
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
  },
];

export function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  if (HIDE_ON_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.04)] sm:hidden"
    >
      <ul className="grid grid-cols-3">
        {ITEMS.map((it) => {
          const active = it.match(pathname);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition ${
                  active
                    ? "text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-700"
                }`}
              >
                {it.icon}
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
