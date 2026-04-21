"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useMemo, useState, useTransition } from "react";
import type { Brand, RegionGroup } from "@/lib/types/db";
import type {
  StorePicker,
  VisitCell,
} from "@/lib/supabase/calendar-queries";
import { addVisit, deleteVisit } from "@/app/actions/visits";
import { brandColor } from "@/lib/brandColor";

type Props = {
  date: Date | null;
  visits: VisitCell[];
  brands: Brand[];
  regionGroups: RegionGroup[];
  stores: StorePicker[];
  onChange?: () => void;
};

type Step = "brand" | "region" | "sigungu" | "store";

export function VisitPanel({
  date,
  visits,
  brands,
  regionGroups,
  stores,
  onChange,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("brand");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [regionGroupId, setRegionGroupId] = useState<string | null>(null);
  const [sigungu, setSigungu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 매장 목록에 실제로 등록된 브랜드만 — 매장 0개인 브랜드는 단계에서 숨김
  const availableBrands = useMemo(() => {
    const brandIds = new Set(stores.map((s) => s.brand_id));
    return brands.filter((b) => brandIds.has(b.id));
  }, [brands, stores]);

  // 선택된 브랜드의 매장이 있는 지역그룹만
  const availableRegionGroups = useMemo(() => {
    if (!brandId) return [];
    const ids = new Set<string>();
    for (const s of stores) {
      if (s.brand_id === brandId && s.region_group_id) {
        ids.add(s.region_group_id);
      }
    }
    return regionGroups.filter((g) => ids.has(g.id));
  }, [regionGroups, stores, brandId]);

  const sigunguList = useMemo(() => {
    if (!brandId || !regionGroupId) return [];
    const set = new Set<string>();
    for (const s of stores) {
      if (
        s.brand_id === brandId &&
        s.region_group_id === regionGroupId &&
        s.sigungu
      ) {
        set.add(s.sigungu);
      }
    }
    return Array.from(set).sort();
  }, [stores, brandId, regionGroupId]);

  const storesFiltered = useMemo(() => {
    if (!brandId || !regionGroupId || !sigungu) return [];
    return stores.filter(
      (s) =>
        s.brand_id === brandId &&
        s.region_group_id === regionGroupId &&
        s.sigungu === sigungu,
    );
  }, [stores, brandId, regionGroupId, sigungu]);

  // 이미 해당 날짜에 등록된 매장 id 모음
  const existingStoreIds = useMemo(
    () => new Set(visits.map((v) => v.store?.id).filter(Boolean) as string[]),
    [visits],
  );

  function resetFlow() {
    setStep("brand");
    setBrandId(null);
    setRegionGroupId(null);
    setSigungu(null);
    setError(null);
  }

  function stepBack(to: Step) {
    setError(null);
    if (to === "brand") {
      setBrandId(null);
      setRegionGroupId(null);
      setSigungu(null);
    } else if (to === "region") {
      setRegionGroupId(null);
      setSigungu(null);
    } else if (to === "sigungu") {
      setSigungu(null);
    }
    setStep(to);
  }

  function handleAdd(storeId: string, storeName: string) {
    if (!date) return;
    setError(null);
    if (existingStoreIds.has(storeId)) {
      if (!confirm(`"${storeName}" 매장은 이미 이 날짜에 등록되어 있습니다. 한 번 더 추가할까요?`))
        return;
    }
    const visitDate = format(date, "yyyy-MM-dd");
    startTransition(async () => {
      const res = await addVisit({ store_id: storeId, visit_date: visitDate });
      if (res?.error) setError(res.error);
      else {
        resetFlow();
        onChange?.();
      }
    });
  }

  function handleDelete(visitId: string) {
    startTransition(async () => {
      const res = await deleteVisit(visitId);
      if (!res?.error) onChange?.();
    });
  }

  if (!date) {
    return (
      <aside className="flex items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-400">
        캘린더에서 날짜를 선택하세요
      </aside>
    );
  }

  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedRegion = regionGroups.find((g) => g.id === regionGroupId);

  return (
    <aside className="rounded-2xl border border-neutral-200 bg-white">
      <header className="border-b border-neutral-100 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-900">
          {format(date, "yyyy년 M월 d일 (E)", { locale: ko })}
        </h2>
        <p className="mt-0.5 text-xs text-neutral-500">방문 {visits.length}건</p>
      </header>

      <section className="px-5 py-4">
        {visits.length === 0 ? (
          <p className="py-4 text-center text-xs text-neutral-400">
            등록된 방문이 없습니다
          </p>
        ) : (
          <ul className="space-y-1.5">
            {visits.map((v) => {
              const c = brandColor(v.store?.brand?.id);
              return (
                <li
                  key={v.id}
                  className="group flex items-center gap-2 rounded-lg border border-neutral-100 px-2.5 py-2 hover:border-neutral-200"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-medium tabular-nums text-neutral-600">
                    {v.visit_order}
                  </span>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-neutral-900">
                      {v.store?.name ?? "-"}
                    </div>
                    <div className="flex gap-1 text-[10px] text-neutral-500">
                      {v.store?.brand && <span>{v.store.brand.name}</span>}
                      {v.store?.region_group && (
                        <span>· {v.store.region_group.name}</span>
                      )}
                    </div>
                  </div>
                  <button
                    disabled={isPending}
                    onClick={() => handleDelete(v.id)}
                    className="text-xs text-neutral-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-800">방문 추가</h3>
          {step !== "brand" && (
            <button
              onClick={resetFlow}
              className="text-xs text-neutral-500 hover:text-neutral-900"
            >
              ↺ 처음부터
            </button>
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1 text-[11px]">
          <StepChip
            label={selectedBrand?.name ?? "브랜드"}
            active={step === "brand"}
            done={!!brandId}
            onClick={() => brandId && stepBack("brand")}
          />
          <span className="text-neutral-300">›</span>
          <StepChip
            label={selectedRegion?.name ?? "지역"}
            active={step === "region"}
            done={!!regionGroupId}
            onClick={() => regionGroupId && stepBack("region")}
          />
          <span className="text-neutral-300">›</span>
          <StepChip
            label={sigungu ?? "시/군/구"}
            active={step === "sigungu"}
            done={!!sigungu}
            onClick={() => sigungu && stepBack("sigungu")}
          />
          <span className="text-neutral-300">›</span>
          <StepChip label="매장" active={step === "store"} done={false} />
        </div>

        <div>
          {step === "brand" && (
            <PickList
              items={availableBrands.map((b) => ({
                id: b.id,
                label: b.name,
                color: brandColor(b.id).dot,
              }))}
              onPick={(id) => {
                setBrandId(id);
                setStep("region");
              }}
              emptyText="먼저 매장 관리 페이지에서 매장을 등록하세요"
            />
          )}
          {step === "region" && (
            <PickList
              items={availableRegionGroups.map((g) => ({
                id: g.id,
                label: g.name,
              }))}
              onPick={(id) => {
                setRegionGroupId(id);
                setStep("sigungu");
              }}
              emptyText="이 브랜드에 등록된 매장이 없습니다"
            />
          )}
          {step === "sigungu" && (
            <PickList
              items={sigunguList.map((s) => ({ id: s, label: s }))}
              onPick={(id) => {
                setSigungu(id);
                setStep("store");
              }}
              emptyText="이 조건에 해당하는 매장이 없습니다"
            />
          )}
          {step === "store" && (
            <PickList
              items={storesFiltered.map((s) => ({
                id: s.id,
                label: s.name,
                muted: existingStoreIds.has(s.id),
              }))}
              onPick={(id) => {
                const s = storesFiltered.find((x) => x.id === id);
                if (s) handleAdd(s.id, s.name);
              }}
              emptyText="매장이 없습니다"
            />
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </section>
    </aside>
  );
}

function StepChip({
  label,
  active,
  done,
  onClick,
}: {
  label: string;
  active: boolean;
  done: boolean;
  onClick?: () => void;
}) {
  const base = "rounded-md px-2 py-0.5 transition";
  if (active) {
    return (
      <span className={`${base} bg-blue-600 font-medium text-white`}>
        {label}
      </span>
    );
  }
  if (done) {
    return (
      <button
        onClick={onClick}
        className={`${base} bg-white text-neutral-700 ring-1 ring-neutral-200 hover:ring-neutral-400`}
      >
        {label}
      </button>
    );
  }
  return <span className={`${base} text-neutral-400`}>{label}</span>;
}

function PickList({
  items,
  onPick,
  emptyText = "항목이 없습니다",
}: {
  items: { id: string; label: string; color?: string; muted?: boolean }[];
  onPick: (id: string) => void;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-neutral-400">{emptyText}</p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-1.5">
      {items.map((it) => (
        <li key={it.id}>
          <button
            onClick={() => onPick(it.id)}
            className={`flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm transition hover:border-neutral-900 hover:shadow-sm ${
              it.muted
                ? "border-neutral-200 text-neutral-400"
                : "border-neutral-200 text-neutral-900"
            }`}
          >
            {it.color && (
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${it.color}`}
                aria-hidden
              />
            )}
            <span className="truncate">{it.label}</span>
            {it.muted && (
              <span className="ml-auto text-[10px] text-neutral-400">등록됨</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
