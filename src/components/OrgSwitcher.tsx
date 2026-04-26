"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { switchOrg, type MyOrganization } from "@/app/actions/organizations";

type Props = {
  orgs: MyOrganization[];
  currentOrgId: string;
};

export function OrgSwitcher({ orgs, currentOrgId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const current = orgs.find((o) => o.id === currentOrgId) ?? orgs[0];

  // 바깥 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  function handleSwitch(id: string) {
    if (id === currentOrgId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await switchOrg(id);
      setOpen(false);
      if (!res.error) {
        router.push("/");
        router.refresh();
      }
    });
  }

  if (!current) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        <span className="max-w-[100px] truncate font-semibold sm:max-w-[160px]">
          {current.name}
        </span>
        <span className="text-neutral-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          <ul className="max-h-64 overflow-auto py-1">
            {orgs.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => handleSwitch(o.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-neutral-50 ${
                    o.id === currentOrgId ? "font-semibold text-neutral-900" : "text-neutral-700"
                  }`}
                >
                  <span className="truncate">{o.name}</span>
                  <span className="ml-2 shrink-0 text-[10px] text-neutral-400">
                    {o.role === "master" ? "마스터" : "멤버"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-neutral-100">
            <Link
              href="/organizations"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50"
            >
              + 기업 추가/관리
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
