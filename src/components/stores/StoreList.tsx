"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteStore } from "@/app/stores/actions";
import type { StoreWithRelations } from "@/lib/supabase/queries";

export function StoreList({ stores }: { stores: StoreWithRelations[] }) {
  const [isPending, startTransition] = useTransition();
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const brands = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stores) if (s.brand) map.set(s.brand.id, s.brand.name);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [stores]);

  const regions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stores)
      if (s.region_group) map.set(s.region_group.id, s.region_group.name);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [stores]);

  const filtered = stores.filter((s) => {
    if (brandFilter !== "all" && s.brand?.id !== brandFilter) return false;
    if (regionFilter !== "all" && s.region_group?.id !== regionFilter)
      return false;
    return true;
  });

  function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 매장을 삭제할까요?`)) return;
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await deleteStore(id);
      setPendingId(null);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3">
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
        >
          <option value="all">전체 브랜드</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
        >
          <option value="all">전체 지역</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-neutral-500">
          총 {filtered.length}개
        </span>
      </div>

      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-400">
          등록된 매장이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {filtered.map((s) => (
            <li key={s.id} className="flex items-start justify-between py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {s.brand && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">
                      {s.brand.name}
                    </span>
                  )}
                  <span className="text-sm font-medium text-neutral-900">
                    {s.name}
                  </span>
                  {s.region_group && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                      {s.region_group.name}
                    </span>
                  )}
                </div>
                {s.address && (
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {s.address}
                    {s.address_detail ? ` ${s.address_detail}` : ""}
                  </p>
                )}
              </div>
              <button
                disabled={isPending && pendingId === s.id}
                onClick={() => handleDelete(s.id, s.name)}
                className="ml-3 text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                {isPending && pendingId === s.id ? "삭제 중…" : "삭제"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
