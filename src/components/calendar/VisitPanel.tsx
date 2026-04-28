"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useMemo, useRef, useState, useTransition } from "react";
import type { Brand, RegionGroup } from "@/lib/types/db";
import type {
  StorePicker,
  VisitCell,
} from "@/lib/supabase/calendar-queries";
import { brandColor } from "@/lib/brandColor";
import { VisitMemoModal } from "./VisitMemoModal";

type Props = {
  date: Date | null;
  visits: VisitCell[];
  brands: Brand[];
  regionGroups: RegionGroup[];
  stores: StorePicker[];
  currentUserId: string | null;
  onAddVisit: (
    store: StorePicker,
    storeName: string,
    brandName: string,
    regionGroupName: string | null,
  ) => Promise<{ error?: string }>;
  onDeleteVisit: (visitId: string) => Promise<{ error?: string }>;
  onChange?: () => void;
};

type Step = "brand" | "region" | "sigungu" | "store";

export function VisitPanel({
  date,
  visits,
  brands,
  regionGroups,
  stores,
  currentUserId,
  onAddVisit,
  onDeleteVisit,
  onChange,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("brand");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [regionGroupId, setRegionGroupId] = useState<string | null>(null);
  const [sigungu, setSigungu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memoVisit, setMemoVisit] = useState<VisitCell | null>(null);
  const addSectionRef = useRef<HTMLElement | null>(null);

  const handleAddClick = () => {
    addSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
    const store = stores.find((s) => s.id === storeId);
    if (!store) return;
    const brand = brands.find((b) => b.id === brandId);
    const regionGroup = regionGroups.find((g) => g.id === regionGroupId);

    startTransition(async () => {
      const res = await onAddVisit(
        store,
        storeName,
        brand?.name ?? "",
        regionGroup?.name ?? null,
      );
      if (res?.error) setError(res.error);
      else {
        resetFlow();
        onChange?.();
      }
    });
  }

  function handleDelete(visitId: string) {
    startTransition(async () => {
      const res = await onDeleteVisit(visitId);
      if (!res?.error) onChange?.();
    });
  }

  if (!date) {
    return (
      <aside className="flex items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-400 lg:h-full">
        캘린더에서 날짜를 선택하세요
      </aside>
    );
  }

  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedRegion = regionGroups.find((g) => g.id === regionGroupId);

  return (
    <aside className="rounded-2xl border border-neutral-200 bg-white lg:flex lg:h-full lg:flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4 lg:shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-neutral-900">
            {format(date, "yyyy년 M월 d일 (E)", { locale: ko })}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">방문 {visits.length}건</p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={handleAddClick}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <span aria-hidden>+</span>
            <span>일정추가</span>
          </button>
          {visits.length === 0 && (
            <div
              role="tooltip"
              className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 whitespace-nowrap rounded-md bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg"
            >
              방문일정을 추가해주세요.
              <span
                aria-hidden
                className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 bg-neutral-900"
              />
            </div>
          )}
        </div>
      </header>

      <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:rounded-b-2xl">
      <section className="px-5 py-4">
        {visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-300"
              aria-hidden
            >
              <rect x="3" y="4.5" width="18" height="16" rx="2" />
              <path d="M3 9.5h18" />
              <path d="M8 3v3" />
              <path d="M16 3v3" />
            </svg>
            <p className="text-xl font-bold text-neutral-800">
              등록된 방문이 없습니다
            </p>
            <p className="text-sm text-neutral-500">
              우측 상단의 <span className="font-semibold text-neutral-700">+ 일정추가</span> 버튼으로 방문을 등록해 보세요
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {visits.map((v) => {
              const c = brandColor(v.store?.brand?.id);
              const hasMemo =
                !!v.store_position ||
                !!v.customer_count ||
                !!v.sales_trend ||
                !!v.activity ||
                !!v.display_type ||
                !!v.requests ||
                (v.photo_paths?.length ?? 0) > 0;
              const isOwn = !!currentUserId && v.user_id === currentUserId;
              const recorderLabel = v.recorder
                ? v.recorder.display_name?.trim() || v.recorder.email
                : null;
              return (
                <li
                  key={v.id}
                  className="group flex items-center gap-2 rounded-lg border border-neutral-100 px-2.5 py-2 hover:border-neutral-300"
                >
                  <button
                    type="button"
                    onClick={() => setMemoVisit(v)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-medium tabular-nums text-neutral-600">
                      {v.visit_order}
                    </span>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm text-neutral-900">
                          {v.store?.name ?? "-"}
                        </span>
                        {hasMemo && (
                          <span
                            title="메모 있음"
                            className="text-[10px] text-neutral-400"
                          >
                            📝
                          </span>
                        )}
                        {recorderLabel && (
                          <span className="ml-auto shrink-0 truncate rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                            {recorderLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 text-[10px] text-neutral-500">
                        {v.store?.brand && <span>{v.store.brand.name}</span>}
                        {v.store?.region_group && (
                          <span>· {v.store.region_group.name}</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {isOwn && (
                    <button
                      disabled={isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(v.id);
                      }}
                      className="text-xs text-neutral-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                      aria-label="삭제"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      </div>

      {memoVisit && (
        <VisitMemoModal
          visit={memoVisit}
          currentUserId={currentUserId}
          onClose={() => setMemoVisit(null)}
          onSaved={onChange}
        />
      )}
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
