"use client";

import { useState, useTransition } from "react";
import type { Brand } from "@/lib/types/db";
import { deleteBrand } from "@/app/stores/actions";
import { brandColor } from "@/lib/brandColor";

type Props = {
  brands: Brand[];
};

export function BrandList({ brands }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (brands.length === 0) return null;

  function handleDelete(brand: Brand) {
    if (!confirm(`"${brand.name}" 브랜드를 삭제할까요?`)) return;
    setError(null);
    setPendingId(brand.id);
    startTransition(async () => {
      const res = await deleteBrand(brand.id);
      setPendingId(null);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {brands.map((b) => {
          const c = brandColor(b.id);
          const busy = isPending && pendingId === b.id;
          return (
            <li
              key={b.id}
              className="group inline-flex items-center gap-1.5 rounded-full bg-neutral-100 py-1 pl-2.5 pr-1 text-xs text-neutral-700"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`}
                aria-hidden
              />
              <span>{b.name}</span>
              <button
                type="button"
                onClick={() => handleDelete(b)}
                disabled={busy}
                aria-label={`${b.name} 삭제`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 opacity-0 transition hover:bg-white hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
              >
                {busy ? "…" : "✕"}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
