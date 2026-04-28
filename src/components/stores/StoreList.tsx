"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { deleteStore } from "@/app/stores/actions";
import type { Brand, RegionGroup } from "@/lib/types/db";
import type { StoreWithRelations } from "@/lib/supabase/queries";
import { StoreEditModal } from "./StoreEditModal";
import { StoreForm } from "./StoreForm";
import { brandColor, brandTagProps } from "@/lib/brandColor";

type Props = {
  stores: StoreWithRelations[];
  brands: Brand[];
  regionGroups: RegionGroup[];
  orgId: string | null;
};

export function StoreList({ stores, brands, regionGroups, orgId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<StoreWithRelations | null>(null);
  const [showForm, setShowForm] = useState(false);

  // 삭제 즉시 목록에서 사라지도록 — 액션 완료 시 props가 갱신되며 자동 동기화됨.
  const [optimisticStores, removeOptimistic] = useOptimistic(
    stores,
    (state, idToRemove: string) => state.filter((s) => s.id !== idToRemove),
  );

  const brandFilters = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of optimisticStores)
      if (s.brand) map.set(s.brand.id, s.brand.name);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [optimisticStores]);

  const regionFilters = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of optimisticStores)
      if (s.region_group) map.set(s.region_group.id, s.region_group.name);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [optimisticStores]);

  const filtered = optimisticStores.filter((s) => {
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
      removeOptimistic(id);
      const res = await deleteStore(id);
      setPendingId(null);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-neutral-900">매장</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            매장 {optimisticStores.length}개
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800"
        >
          {showForm ? (
            <span>← 목록</span>
          ) : (
            <>
              <span aria-hidden>+</span>
              <span>매장 추가</span>
            </>
          )}
        </button>
      </header>

      {showForm ? (
        <div className="px-5 py-4">
          <StoreForm
            brands={brands}
            regionGroups={regionGroups}
            orgId={orgId}
            onCreated={() => setShowForm(false)}
          />
        </div>
      ) : (
        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 pb-3">
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
            >
              <option value="all">전체 브랜드</option>
              {brandFilters.map((b) => (
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
              {regionFilters.map((r) => (
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
            <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-400">
              등록된 매장이 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((s) => {
                const c = brandColor(s.brand?.id, s.brand?.name);
                const tag = brandTagProps(c);
                return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 transition hover:border-neutral-400"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.brand?.name && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tag.className}`}
                          style={tag.style}
                        >
                          {s.brand.name}
                        </span>
                      )}
                      <p className="min-w-0 truncate text-base font-semibold text-neutral-900">
                        {s.name}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {s.region_group && <span>{s.region_group.name}</span>}
                      {s.region_group && s.address && (
                        <span className="mx-1">·</span>
                      )}
                      {s.address && (
                        <span>
                          {s.address}
                          {s.address_detail ? ` ${s.address_detail}` : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs">
                    <button
                      onClick={() => setEditing(s)}
                      className="text-neutral-600 hover:underline"
                    >
                      수정
                    </button>
                    <button
                      disabled={isPending && pendingId === s.id}
                      onClick={() => handleDelete(s.id, s.name)}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      {isPending && pendingId === s.id ? "삭제 중…" : "삭제"}
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <StoreEditModal
          store={editing}
          brands={brands}
          regionGroups={regionGroups}
          orgId={orgId}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
