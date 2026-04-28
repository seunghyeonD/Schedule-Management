"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Brand, RegionGroup } from "@/lib/types/db";
import type {
  StorePicker,
  VisitCell,
} from "@/lib/supabase/calendar-queries";
import { brandColor } from "@/lib/brandColor";
import { VisitMemoModal } from "./VisitMemoModal";
import { StoreForm } from "@/components/stores/StoreForm";

type Props = {
  date: Date | null;
  visits: VisitCell[];
  brands: Brand[];
  regionGroups: RegionGroup[];
  stores: StorePicker[];
  currentUserId: string | null;
  orgId: string | null;
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
  orgId,
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStoreFormOpen, setIsStoreFormOpen] = useState(false);

  const handleAddClick = () => {
    setIsAddModalOpen(true);
    setIsStoreFormOpen(false);
  };

  useEffect(() => {
    if (!isAddModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAddModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAddModalOpen]);

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
            className="inline-flex items-center gap-1 rounded-md bg-point px-2.5 py-1.5 text-xs font-semibold text-neutral-900 shadow-sm transition hover:bg-point-hover"
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
          <ul className="space-y-1">
            {visits.map((v) => {
              const isOwn = !!currentUserId && v.user_id === currentUserId;
              return (
                <li
                  key={v.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-50"
                >
                  <button
                    type="button"
                    onClick={() => setMemoVisit(v)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span
                      aria-hidden
                      className="shrink-0 text-neutral-400"
                    >
                      ⋅
                    </span>
                    <span className="truncate text-sm text-neutral-800">
                      {v.store?.name ?? "-"}
                    </span>
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

      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-neutral-900">
                  {format(date, "yyyy년 M월 d일 (E)", { locale: ko })}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  매장 {stores.length}개
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isStoreFormOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsStoreFormOpen(false)}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
                  >
                    ← 목록
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsStoreFormOpen(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-point px-2.5 py-1.5 text-xs font-semibold text-neutral-900 shadow-sm transition hover:bg-point-hover"
                  >
                    <span aria-hidden>+</span>
                    <span>매장 추가</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
            </header>

            {isStoreFormOpen ? (
              <div className="flex flex-1 min-h-0 flex-col">
                <StoreForm
                  brands={brands}
                  regionGroups={regionGroups}
                  orgId={orgId}
                  submitLabel="완료"
                  submitFullWidth
                  onCreated={() => {
                    setIsStoreFormOpen(false);
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-x-hidden overflow-y-auto">
                {stores.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-2xl font-bold text-neutral-800">
                      추가된 매장이 없습니다
                    </p>
                    <p className="text-sm text-neutral-400">
                      우측 상단의 <span className="font-semibold text-neutral-600">+ 매장 추가</span> 버튼으로 매장을 추가해 보세요
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1 px-5 py-4">
                    {stores.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5"
                      >
                        <span aria-hidden className="text-neutral-400">
                          ⋅
                        </span>
                        <span className="truncate text-sm text-neutral-800">
                          {s.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
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
      <span className={`${base} bg-point font-semibold text-neutral-900`}>
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
